import { AgGridReact } from 'ag-grid-react'
import type { ReactNode } from 'react'

import type { TaxSession } from '#/entities/tax-session/model/types'
import type { Store } from '#/shared/lib/store/create-store'
import { shallowEqual, useStore } from '#/shared/lib/store/use-store'
import { useSheetGrid } from '#/shared/lib/sheet-grid/use-sheet-grid'
import type { SheetRow } from '#/shared/lib/sheet-grid/types'
import {
  companyColumns,
  companyKeys,
  companyLayout,
} from '../model/company-sheet'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 font-sans text-sm font-bold text-[#536863]">
      {label}
      {children}
    </label>
  )
}

const inputClass =
  'border border-[#c5d0c7] bg-white px-3 py-2 font-sans text-base font-normal text-[#17312d]'

export function CompanyTab({ store }: { store: Store<TaxSession> }) {
  const company = useStore(store, (s) => s.company, shallowEqual)
  const grid = useSheetGrid(store, {
    keys: companyKeys,
    columns: companyColumns,
    layout: companyLayout,
  })

  const setCompany = (patch: Partial<TaxSession['company']>) =>
    store.set((s) => ({ ...s, company: { ...s.company, ...patch } }))

  return (
    <div className="grid gap-8 p-6 lg:grid-cols-2">
      <section className="grid content-start gap-4">
        <h2 className="font-sans text-sm font-bold uppercase tracking-[0.05em] text-[#536863]">
          Plain inputs
        </h2>
        <Field label="회사명">
          <input
            className={inputClass}
            value={company.name}
            onChange={(e) => setCompany({ name: e.target.value })}
          />
        </Field>
        <Field label="대표자">
          <input
            className={inputClass}
            value={company.ceo}
            onChange={(e) => setCompany({ ceo: e.target.value })}
          />
        </Field>
        <Field label="사업연도">
          <input
            className={inputClass}
            type="number"
            value={company.bizYear}
            onChange={(e) => setCompany({ bizYear: Number(e.target.value) })}
          />
        </Field>
      </section>
      <section className="grid content-start gap-4">
        <h2 className="font-sans text-sm font-bold uppercase tracking-[0.05em] text-[#536863]">
          Same data in a grid
        </h2>
        <div className="border border-[#c5d0c7]">
          <AgGridReact<SheetRow> {...grid} />
        </div>
        <p className="font-sans text-sm leading-relaxed text-[#536863]">
          The inputs and the grid are two views of the same session state. Edit
          either side and the other follows.
        </p>
      </section>
    </div>
  )
}
