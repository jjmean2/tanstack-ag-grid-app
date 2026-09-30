import type {
  CellFocusedEvent,
  ColDef,
  FirstDataRenderedEvent,
  GetRowIdParams,
  GridApi,
  IRowNode,
  RowClassParams,
} from 'ag-grid-community'
import type { AgGridReactProps } from 'ag-grid-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { playgroundGridTheme } from '#/shared/config/ag-grid'
import { useStore } from '../store/use-store'
import { createGridColumns } from './columns'
import { flattenLeafs } from './workbook'
import { claimPending, reportFocus } from './navigation'
import type { CellRef, ResolvedRow } from './types'
import { useWorkbook } from './workbook-context'

// A worksheet's layout is positional, so sorting/filtering/moving columns
// would break it (and the column menu would have nothing left to offer).
const defaultColDef: ColDef<ResolvedRow> = {
  sortable: false,
  filter: false,
  suppressMovable: true,
  suppressHeaderMenuButton: true,
  resizable: true,
  headerClass: '[&_.ag-header-cell-label]:justify-center',
}

const getRowId = (p: GetRowIdParams<ResolvedRow>) => p.data.id
const getRowClass = (p: RowClassParams<ResolvedRow>) => p.data?.className

// Moves focus to the first target and flashes all of them.
function focusCells(api: GridApi<ResolvedRow>, targets: CellRef[]) {
  const first = targets[0]
  const node = api.getRowNode(first.rowId)
  if (!node || node.rowIndex == null) return
  api.ensureIndexVisible(node.rowIndex)
  api.setFocusedCell(node.rowIndex, first.colId)
  const rowNodes = targets
    .map((t) => api.getRowNode(t.rowId))
    .filter((n): n is IRowNode<ResolvedRow> => n !== undefined)
  api.flashCells({
    rowNodes,
    columns: [first.colId],
    flashDuration: 1200,
    fadeDuration: 600,
  })
}

// AG Grid props for one sheet of the workbook.
export function useSheetGrid(sheetId: string): AgGridReactProps<ResolvedRow> {
  const { wb, ui } = useWorkbook()
  const sheet = wb.sheets[sheetId]
  const sheetColumns = sheet?.columns
  const rows = sheet?.rows

  const columnDefs = useMemo(
    () => (sheetColumns ? createGridColumns(sheetColumns) : []),
    [sheetColumns],
  )
  // An initial-only grid option; the columns of a sheet never change.
  const enableCellSpan = useMemo(
    () => flattenLeafs(sheetColumns ?? []).some((leaf) => leaf.spanRows),
    [sheetColumns],
  )

  const apiRef = useRef<GridApi<ResolvedRow> | null>(null)
  const [ready, setReady] = useState(false)
  const pending = useStore(ui, (s) => s.pending)

  // Consume a navigation request aimed at this sheet. If its tab was just
  // opened, this runs once the grid has rendered its first rows.
  useEffect(() => {
    const api = apiRef.current
    if (!ready || !api || !pending) return
    const mine = pending.targets.filter((t) => t.sheetId === sheetId)
    if (mine.length === 0 || !claimPending(ui, pending.nonce)) return
    focusCells(api, mine)
  }, [ready, pending, sheetId, ui])

  const props = useMemo<AgGridReactProps<ResolvedRow>>(
    () => ({
      theme: playgroundGridTheme,
      domLayout: 'autoHeight',
      rowData: rows,
      columnDefs,
      defaultColDef,
      getRowId,
      getRowClass,
      enableCellSpan,
      stopEditingWhenCellsLoseFocus: true,
      onFirstDataRendered: (event: FirstDataRenderedEvent<ResolvedRow>) => {
        apiRef.current = event.api
        setReady(true)
      },
      // Report focus (click or keyboard) so the formula bar can follow it.
      onCellFocused: (event: CellFocusedEvent<ResolvedRow>) => {
        if (event.rowIndex == null || !event.column) return
        const node = event.api.getDisplayedRowAtIndex(event.rowIndex)
        if (!node?.data) return
        const colId =
          typeof event.column === 'string'
            ? event.column
            : event.column.getColId()
        reportFocus(ui, { sheetId, rowId: node.data.id, colId })
      },
    }),
    [rows, columnDefs, enableCellSpan, sheetId, ui],
  )

  if (!sheet) throw new Error(`Unknown sheet: ${sheetId}`)
  return props
}
