import { AgGridReact } from 'ag-grid-react'

import type { Row } from '../core/types'
import { useSheetGrid } from './use-sheet-grid'

// One sheet as an AG Grid. Give a `height` for long lists: the grid then
// scrolls and draws only the rows in view; `pinnedBottom` keeps rows (by id)
// below them, e.g. the total (see `useSheetGrid`).
export function SheetGrid({
  sheetId,
  height,
  pinnedBottom,
}: {
  sheetId: string
  height?: number | string
  pinnedBottom?: readonly string[]
}) {
  const props = useSheetGrid(sheetId, { height, pinnedBottom })
  return <AgGridReact<Row> {...props} />
}
