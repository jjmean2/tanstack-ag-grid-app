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
import { listControls } from '../react/lists'
import { gridViewsOf } from './views'
import { FullWidthRow } from './full-width-row'
import { rowMarks } from '../core/marks'
import { leafColumns } from '../core/workbook'
import {
  cellHighlightMarks,
  referenceHighlights,
  sameHighlight,
} from '../core/highlight'
import { claimPending, reportFocus } from '../core/navigation'
import { splitAddress } from '../core/address'
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
  headerClass: 'wb-header', // headings centred (styles.css)
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
  flash: boolean,
) {
  const first = targets[0]
  const { node, pinned: floating } = nodeOf(api, first.rowId, pinned)
  if (!node || node.rowIndex == null) return
  if (!floating) api.ensureIndexVisible(node.rowIndex)
  api.setFocusedCell(node.rowIndex, first.colId, floating)
  if (!flash) return
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
  // For callbacks AG Grid keeps (the context menu): the current workbook.
  const wbRef = useRef(wb)
  wbRef.current = wb
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

  // The focused formula's references, highlighted. AG Grid reads them when it
  // draws a cell (`cellClass`); when they change, the cells that gained or
  // lost a highlight are redrawn (below).
  const highlights = useStore(ui, (s) => referenceHighlights(wb, s.focused))
  const highlightsRef = useRef(highlights)
  highlightsRef.current = highlights

  const columnDefs = useMemo(
    () =>
      sheetColumns
        ? createGridColumns(sheetColumns, {
            present,
            editors,
            displays,
            extraMarks: (cell) =>
              cellHighlightMarks(
                highlightsRef.current.byCell.get(cell.address),
              ),
          })
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
  // opened, this runs once the grid has rendered its first rows; if its row
  // is not in the grid yet (just added), once the new rows are.
  useEffect(() => {
    const api = apiRef.current
    if (!ready || !api || !pending) return
    const mine = pending.targets.filter((t) => t.sheetId === sheetId)
    if (mine.length === 0) return
    const shown = (rowId: string) => nodeOf(api, rowId, pinnedIds).node
    if (!shown(mine[0].rowId)) return
    if (pending.waitFor !== undefined && !shown(pending.waitFor)) return
    if (!claimPending(ui, pending.nonce)) return
    focusCells(api, mine, pinnedIds, pending.flash)
  }, [ready, pending, sheetId, ui, pinnedIds, body, bottom])

  // Redraw the cells of this sheet whose highlight changed. AG Grid only
  // re-evaluates `cellClass` when a cell is refreshed, and would skip cells
  // whose value did not change, hence `force`.
  const drawn = useRef(highlights)
  useEffect(() => {
    const api = apiRef.current
    const before = drawn.current
    drawn.current = highlights
    if (!ready || !api || before === highlights) return
    const changed = new Set<string>()
    for (const [address, h] of highlights.byCell)
      if (!sameHighlight(before.byCell.get(address), h)) changed.add(address)
    for (const address of before.byCell.keys())
      if (!highlights.byCell.has(address)) changed.add(address)
    const mine = [...changed]
      .map(splitAddress)
      .filter((a) => a.sheetId === sheetId)
    if (mine.length === 0) return
    const rowNodes = [...new Set(mine.map((a) => a.rowId))]
      .map((rowId) => nodeOf(api, rowId, pinnedIds).node)
      .filter((n): n is IRowNode<Row> => n !== undefined)
    const columns = [...new Set(mine.map((a) => a.colId))]
    api.refreshCells({ rowNodes, columns, force: true })
  }, [highlights, ready, sheetId, pinnedIds])

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
      getContextMenuItems: (params) =>
        contextMenuItems(params, texts, (rowId) => {
          const list = wbRef.current.listOf({ sheetId, rowId, colId: '' })
          return list && listControls(ui, list)
        }),
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
