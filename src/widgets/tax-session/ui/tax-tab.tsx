import { AgGridReact } from 'ag-grid-react'

import type { TaxSession } from '#/entities/tax-session/model/types'
import type { Store } from '#/shared/lib/store/create-store'
import { useSheetGrid } from '#/shared/lib/sheet-grid/use-sheet-grid'
import type { SheetRow } from '#/shared/lib/sheet-grid/types'
import {
  taxInputColumns,
  taxInputKeys,
  taxInputLayout,
  taxResultColumns,
  taxResultKeys,
  taxResultLayout,
} from '../model/tax-sheets'

export function TaxTab({ store }: { store: Store<TaxSession> }) {
  const inputGrid = useSheetGrid(store, {
    keys: taxInputKeys,
    columns: taxInputColumns,
    layout: taxInputLayout,
  })
  const resultGrid = useSheetGrid(store, {
    keys: taxResultKeys,
    columns: taxResultColumns,
    layout: taxResultLayout,
  })

  return (
    <div className="grid gap-8 p-6 lg:grid-cols-2">
      <section className="grid content-start gap-4">
        <h2 className="font-sans text-sm font-bold uppercase tracking-[0.05em] text-[#536863]">
          Rates and credits (editable)
        </h2>
        <div className="border border-[#c5d0c7]">
          <AgGridReact<SheetRow> {...inputGrid} />
        </div>
      </section>
      <section className="grid content-start gap-4">
        <h2 className="font-sans text-sm font-bold uppercase tracking-[0.05em] text-[#536863]">
          Calculation (derived from this and the adjustment tab)
        </h2>
        <div className="border border-[#c5d0c7]">
          <AgGridReact<SheetRow> {...resultGrid} />
        </div>
      </section>
    </div>
  )
}
