import { adjustmentResponse } from '#/entities/adjustment/model/data'
import { PageHeader } from '#/shared/ui/page-header'
import { AdjustmentSheet } from '#/widgets/adjustment-sheet/ui/adjustment-sheet'

export function AdjustmentSheetPage() {
  return (
    <main className="min-h-screen bg-[#f4f1e9] p-6 text-[#17312d] sm:p-10 lg:p-16">
      <PageHeader
        eyebrow="AG Grid playground"
        title="Adjustment sheet"
        description="An Excel-style worksheet: column groups, section titles, subtotals, an input cell and a difference check between the data rows."
      />

      <section className="mx-auto max-w-[1500px] overflow-hidden border border-[#c5d0c7] bg-[#fffdf8] shadow-[0_1rem_3rem_rgb(38_65_55/8%)]">
        <AdjustmentSheet res={adjustmentResponse} />
      </section>
    </main>
  )
}
