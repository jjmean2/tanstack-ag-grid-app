import { SheetGrid } from '#/shared/lib/workbook/sheet-grid'

export function TaxTab() {
  return (
    <div className="grid gap-8 p-6 lg:grid-cols-2">
      <section className="grid content-start gap-4">
        <h2 className="font-sans text-sm font-bold uppercase tracking-[0.05em] text-[#536863]">
          Rates, period, options and credits (editable)
        </h2>
        <div className="border border-[#c5d0c7]">
          <SheetGrid sheetId="inputs" />
        </div>
      </section>
      <section className="grid content-start gap-4">
        <h2 className="font-sans text-sm font-bold uppercase tracking-[0.05em] text-[#536863]">
          Calculation (formulas over this and the adjustment sheet)
        </h2>
        <div className="border border-[#c5d0c7]">
          <SheetGrid sheetId="calc" />
        </div>
      </section>
    </div>
  )
}
