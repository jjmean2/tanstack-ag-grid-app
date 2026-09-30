import type { ReactNode } from 'react'

import { CellInput } from '@labs/workbook/react'
import { SheetGrid } from '@labs/workbook/ag-grid'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 font-sans text-sm font-bold text-[#536863]">
      {label}
      {children}
    </label>
  )
}

// Inputs and a grid showing the same cells: both can be referenced by
// formulas and followed from the formula bar.
export function CompanyTab() {
  return (
    <div className="grid gap-8 p-6 lg:grid-cols-2">
      <section className="grid content-start gap-4">
        <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-[#536863]">
          Cell inputs
        </h2>
        <Field label="회사명">
          <CellInput address="company/company.name/value" />
        </Field>
        <Field label="대표자">
          <CellInput address="company/company.ceo/value" />
        </Field>
        <Field label="사업연도">
          <CellInput address="company/company.bizYear/value" />
        </Field>
        <Field label="총부담세액 (세액계산 탭의 수식, 읽기 전용)">
          <CellInput address="calc/burden/value" />
        </Field>
      </section>
      <section className="grid content-start gap-4">
        <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-[#536863]">
          Same cells in a grid
        </h2>
        <div className="border border-[#c5d0c7]">
          <SheetGrid sheetId="company" />
        </div>
      </section>
    </div>
  )
}
