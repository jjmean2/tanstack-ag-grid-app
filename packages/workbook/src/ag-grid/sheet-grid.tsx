import { AgGridReact } from 'ag-grid-react'

import type { Row } from '../core/types'
import { useSheetGrid } from './use-sheet-grid'

// One sheet as an AG Grid. Give a `height` for long lists: the grid then
// scrolls and draws only the rows in view (see `useSheetGrid`).
export function SheetGrid({
  sheetId,
  height,
}: {
  sheetId: string
  height?: number | string
}) {
  const props = useSheetGrid(sheetId, { height })
  return <AgGridReact<Row> {...props} />
}
