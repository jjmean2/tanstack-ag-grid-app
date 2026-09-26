import { AgGridReact } from 'ag-grid-react'

import type { TaxSession } from '#/entities/tax-session/model/types'
import type { Store } from '#/shared/lib/store/create-store'
import { useSheetGrid } from '#/shared/lib/sheet-grid/use-sheet-grid'
import type { SheetRow } from '#/shared/lib/sheet-grid/types'
import {
  adjustmentColumns,
  adjustmentKeys,
  adjustmentLayout,
} from '../model/adjustment-sheet'

export function AdjustmentTab({ store }: { store: Store<TaxSession> }) {
  const grid = useSheetGrid(store, {
    keys: adjustmentKeys,
    columns: adjustmentColumns,
    layout: adjustmentLayout,
  })

  return <AgGridReact<SheetRow> {...grid} />
}
