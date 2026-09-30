import { AgGridReact } from 'ag-grid-react'

import type { ResolvedRow } from '../core/types'
import { useSheetGrid } from './use-sheet-grid'

export function SheetGrid({ sheetId }: { sheetId: string }) {
  const props = useSheetGrid(sheetId)
  return <AgGridReact<ResolvedRow> {...props} />
}
