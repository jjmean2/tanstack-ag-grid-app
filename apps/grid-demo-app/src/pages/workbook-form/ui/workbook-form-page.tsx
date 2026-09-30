import { SheetGrid } from '@lab/workbook/ag-grid'
import { useScreenSession } from '#/shared/lib/screen/use-screen-session'
import { PageHeader } from '#/shared/ui/page-header'
import { ScreenLayout } from '#/shared/ui/screen-layout'
import { initialVat, vatWorkbook } from '#/widgets/vat-form/model/vat-form'
import type { VatState } from '#/widgets/vat-form/model/vat-form'
import { ReturnTab } from '#/widgets/vat-form/ui/return-tab'

const tabs = [
  { id: 'return', label: '신고서', render: () => <ReturnTab /> },
  {
    id: 'purchases',
    label: '매입 명세',
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
    initial: () => initialVat,
    tab: 'return',
    persist: true,
  })

  return (
    <main className="min-h-screen bg-[#f4f1e9] p-6 text-[#17312d] sm:p-10 lg:p-16">
      <PageHeader
        eyebrow="Workbook · 서식형 sheet"
        title="Form sheet"
        description="Boxes placed on a grid like a paper form, with merges in any direction. Its boxes are workbook cells: select one to see its formula, and follow a reference into the purchase list grid."
      />
      <ScreenLayout session={session} def={vatWorkbook} tabs={tabs} />
    </main>
  )
}
