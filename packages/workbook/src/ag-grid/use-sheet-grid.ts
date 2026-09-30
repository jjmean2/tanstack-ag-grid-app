import type {
  CellFocusedEvent,
  ColDef,
  FirstDataRenderedEvent,
  GetRowIdParams,
  GridApi,
  IRowNode,
  IsFullWidthRowParams,
  RowClassParams,
} from 'ag-grid-community'
import type { AgGridReactProps } from 'ag-grid-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { useStore } from '../react/use-store'
import { createGridColumns } from './columns'
import { contextMenuItems } from './context-menu'
import { useStableRows } from './stable-rows'
import { gridViewsOf } from './views'
import { FullWidthRow } from './full-width-row'
import { rowMarks } from '../core/marks'
import { leafColumns } from '../core/workbook'
import { claimPending, reportFocus } from '../core/navigation'
import type { CellRef, Row } from '../core/types'
import { useWorkbook } from '../react/workbook-context'

// A worksheet's layout is positional, so sorting/filtering/moving columns
// would break it (and the column menu would have nothing left to offer).
const defaultColDef: ColDef<Row> = {
  sortable: false,
  filter: false,
  suppressMovable: true,
  suppressHeaderMenuButton: true,
  resizable: true,
  headerClass: '[&_.ag-header-cell-label]:justify-center',
}

const NONE: readonly string[] = []
const getRowId = (p: GetRowIdParams<Row>) => p.data.id
const getRowClass = (p: RowClassParams<Row>) =>
  p.data ? rowMarks(p.data) : undefined
const isFullWidthRow = (p: IsFullWidthRowParams<Row>) =>
  p.rowNode.data?.fullWidth !== undefined

// A row's node, in the body or pinned to the bottom (AG Grid keeps pinned
// rows apart, numbered from 0).
function nodeOf(api: GridApi<Row>, rowId: string, pinned: readonly string[]) {
  const at = pinned.indexOf(rowId)
  return at < 0
    ? { node: api.getRowNode(rowId), pinned: null }
    : { node: api.getPinnedBottomRow(at), pinned: 'bottom' as const }
}

// Moves focus to the first target and flashes all of them.
function focusCells(
  api: GridApi<Row>,
  targets: CellRef[],
  pinned: readonly string[],
) {
  const first = targets[0]
  const { node, pinned: floating } = nodeOf(api, first.rowId, pinned)
  if (!node || node.rowIndex == null) return
  if (!floating) api.ensureIndexVisible(node.rowIndex)
  api.setFocusedCell(node.rowIndex, first.colId, floating)
  const rowNodes = targets
    .map((t) => nodeOf(api, t.rowId, pinned).node)
    .filter((n): n is IRowNode<Row> => n !== undefined)
  api.flashCells({
    rowNodes,
    columns: [first.colId],
    flashDuration: 1200,
    fadeDuration: 600,
  })
}

// AG Grid props for one sheet of the workbook.
//
// `height`: without one the grid is as tall as its rows and draws them all
// (fine for forms of tens or hundreds of rows). With one it scrolls, and only
// the rows in view are drawn: use it for long lists.
// `pinnedBottom`: ids of rows kept below the scrolling rows (e.g. a total),
// in this order. They stay cells of the workbook like any other row.
export function useSheetGrid(
  sheetId: string,
  {
    height,
    pinnedBottom = NONE,
  }: { height?: number | string; pinnedBottom?: readonly string[] } = {},
): AgGridReactProps<Row> {
  const { wb, ui, views } = useWorkbook()
  const { present } = views
  const { theme, editors, displays, texts } = gridViewsOf(views)
  const sheet = wb.sheets[sheetId]
  const sheetColumns = sheet?.columns
  // Unchanged rows keep their object, so AG Grid updates only changed ones.
  const rows = useStableRows(sheet?.rows)
  // By value: callers usually pass a new array on every render.
  const pinnedKey = pinnedBottom.join('/') // row ids never contain "/"
  const pinnedIds = useMemo(
    () => (pinnedKey === '' ? NONE : pinnedKey.split('/')),
    [pinnedKey],
  )
  const { body, bottom } = useMemo(() => {
    if (pinnedIds.length === 0) return { body: rows, bottom: undefined }
    const byId = new Map(rows?.map((row) => [row.id, row]))
    return {
      body: rows?.filter((row) => !pinnedIds.includes(row.id)),
      bottom: pinnedIds.flatMap((id) => byId.get(id) ?? []),
    }
  }, [rows, pinnedIds])

  const columnDefs = useMemo(
    () =>
      sheetColumns
        ? createGridColumns(sheetColumns, { present, editors, displays })
        : [],
    [sheetColumns, present, editors, displays],
  )
  // An initial-only grid option; the columns of a sheet never change.
  const enableCellSpan = useMemo(
    () => leafColumns(sheetColumns ?? []).some((leaf) => leaf.spanRows),
    [sheetColumns],
  )

  const apiRef = useRef<GridApi<Row> | null>(null)
  const [ready, setReady] = useState(false)
  const pending = useStore(ui, (s) => s.pending)

  // Consume a navigation request aimed at this sheet. If its tab was just
  // opened, this runs once the grid has rendered its first rows.
  useEffect(() => {
    const api = apiRef.current
    if (!ready || !api || !pending) return
    const mine = pending.targets.filter((t) => t.sheetId === sheetId)
    if (mine.length === 0 || !claimPending(ui, pending.nonce)) return
    focusCells(api, mine, pinnedIds)
  }, [ready, pending, sheetId, ui, pinnedIds])

  const props = useMemo<AgGridReactProps<Row>>(
    () => ({
      theme,
      ...(height === undefined
        ? { domLayout: 'autoHeight' as const }
        : { domLayout: 'normal' as const, containerStyle: { height } }),
      rowData: body,
      pinnedBottomRowData: bottom,
      columnDefs,
      defaultColDef,
      getRowId,
      getRowClass,
      // Titles and add buttons: structure, not cells (see `FullWidthContent`).
      isFullWidthRow,
      fullWidthCellRenderer: FullWidthRow,
      embedFullWidthRows: true, // scroll horizontally with the other rows
      enableCellSpan,
      stopEditingWhenCellsLoseFocus: true,
      getContextMenuItems: (params) => contextMenuItems(params, texts),
      onFirstDataRendered: (event: FirstDataRenderedEvent<Row>) => {
        apiRef.current = event.api
        setReady(true)
      },
      // Report focus (click or keyboard) so the formula bar can follow it.
      onCellFocused: (event: CellFocusedEvent<Row>) => {
        if (event.rowIndex == null || !event.column) return
        const node =
          event.rowPinned === 'bottom'
            ? event.api.getPinnedBottomRow(event.rowIndex)
            : event.rowPinned === 'top'
              ? event.api.getPinnedTopRow(event.rowIndex)
              : event.api.getDisplayedRowAtIndex(event.rowIndex)
        if (!node?.data) return
        const colId =
          typeof event.column === 'string'
            ? event.column
            : event.column.getColId()
        reportFocus(ui, { sheetId, rowId: node.data.id, colId })
      },
    }),
    [
      theme,
      body,
      bottom,
      columnDefs,
      enableCellSpan,
      sheetId,
      ui,
      texts,
      height,
    ],
  )

  if (!sheet) throw new Error(`Unknown sheet: ${sheetId}`)
  return props
}
