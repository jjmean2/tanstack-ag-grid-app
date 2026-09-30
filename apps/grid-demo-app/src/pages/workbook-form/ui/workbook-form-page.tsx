import { SheetGrid } from '@lab/workbook/ag-grid'
import { useScreenSession } from '#/shared/lib/screen/use-screen-session'
import { PageHeader } from '#/shared/ui/page-header'
import { ScreenLayout } from '#/shared/ui/screen-layout'
import type { ScreenTab } from '#/shared/ui/screen-layout'
import { initialVat, vatWorkbook } from '#/widgets/vat-form/model/vat-form'
import type { VatState } from '#/widgets/vat-form/model/vat-form'
import { ReturnTab } from '#/widgets/vat-form/ui/return-tab'

const tabs: ScreenTab[] = [
  {
    id: 'return',
    label: '신고서',
    sheets: ['info', 'ret'],
    render: () => <ReturnTab />,
  },
  // The same 신고 내용 sheet as a grid: the form's cells, not a copy. Edit a
  // 금액 here and the 신고서 tab shows the new totals.
  {
    id: 'return-grid',
    label: '신고서 (표)',
    sheets: ['ret'],
    render: () => (
      <div className="p-6">
        <div className="max-w-3xl border border-[#c5d0c7]">
          <SheetGrid sheetId="ret" />
        </div>
      </div>
    ),
  },
  {
    id: 'purchases',
    label: '매입 명세',
    sheets: ['purchases'],
    render: () => (
      <div className="p-6">
        <div className="border border-[#c5d0c7]">
          <SheetGrid sheetId="purchases" />
        </div>
      </div>
    ),
  },
]

export function WorkbookFormPage() {
  const session = useScreenSession<VatState>({
    id: 'vat',
    def: vatWorkbook,
    initial: () => initialVat,
    persist: true,
  })

  return (
    <main className="min-h-screen bg-[#f4f1e9] p-6 text-[#17312d] sm:p-10 lg:p-16">
      <PageHeader
        eyebrow="Workbook · 서식형 sheet"
        title="Form sheet"
        description="Boxes placed on a grid like a paper form, with merges in any direction. Its boxes are workbook cells: select one to see its formula, and follow a reference into the purchase list grid."
      />
      <ScreenLayout session={session} tabs={tabs} />
    </main>
  )
}
