import { SheetGrid } from '@lab/workbook/ag-grid'
import { useScreenSession } from '#/shared/lib/screen/use-screen-session'
import { PageHeader } from '#/shared/ui/page-header'
import { ScreenLayout } from '#/shared/ui/screen-layout'
import type { ScreenTab } from '#/shared/ui/screen-layout'
import {
  closingWorkbook,
  initialClosing,
} from '#/widgets/closing-workbook/model/closing-workbook'
import type { ClosingState } from '#/widgets/closing-workbook/model/closing-workbook'
import { ClosingExports } from '#/widgets/closing-workbook/ui/closing-exports'

const tabs: ScreenTab[] = [
  {
    id: 'is',
    label: '손익계산서',
    sheets: ['is'],
    render: () => (
      <div className="p-6">
        <div className="max-w-2xl">
          <SheetGrid sheetId="is" />
        </div>
      </div>
    ),
  },
]

export function WorkbookClosingPage() {
  const session = useScreenSession<ClosingState>({
    id: 'closing',
    def: closingWorkbook,
    initial: () => initialClosing,
    persist: true,
  })

  return (
    <main className="min-h-screen bg-[#f4f1e9] p-6 text-[#17312d] sm:p-10 lg:p-16">
      <PageHeader
        eyebrow="Workbook · 화면 간 참조"
        title="결산"
        description="이 화면은 당기순이익을 export합니다. 저장하면 법인세 세무조정 화면이 그 값을 [ext:closing/netIncome]으로 읽습니다. 다른 브라우저 탭에 세무조정 화면을 열어 두면 저장하는 즉시 반영됩니다."
      />
      <ScreenLayout
        session={session}
        tabs={tabs}
        toolbar={<ClosingExports />}
      />
    </main>
  )
}
