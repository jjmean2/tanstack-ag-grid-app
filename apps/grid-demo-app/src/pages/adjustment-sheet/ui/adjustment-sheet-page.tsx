import { useWorkbook } from '@lab/workbook/react'
import { SheetGrid } from '@lab/workbook/ag-grid'
import { toAdjustmentState } from '#/entities/adjustment/model/adapter'
import { adjustmentResponse } from '#/entities/adjustment/model/data'
import type { AdjustmentState } from '#/entities/adjustment/model/types'
import { useScreenSession } from '#/shared/lib/screen/use-screen-session'
import { PageHeader } from '#/shared/ui/page-header'
import { ScreenLayout } from '#/shared/ui/screen-layout'
import type { ScreenTab } from '#/shared/ui/screen-layout'
import { Stat } from '#/shared/ui/stat'
import { adjustmentWorkbook } from '#/widgets/adjustment-sheet/model/adjustment-workbook'
import { CompactFormulaBar } from '#/widgets/adjustment-sheet/ui/compact-formula-bar'

const tabs: ScreenTab[] = [
  {
    id: 'adj',
    label: '소득금액조정',
    sheets: ['adj'],
    render: () => <SheetGrid sheetId="adj" />,
  },
]

function Gap() {
  const { wb } = useWorkbook()
  const gap = wb.value('adj/gap/tax')
  return (
    <Stat
      label="신고서상 금액과의 차이"
      value={gap}
      tone={gap === 0 ? 'ok' : 'error'}
    />
  )
}

export function AdjustmentSheetPage() {
  const session = useScreenSession<AdjustmentState>({
    id: 'adjustment',
    def: adjustmentWorkbook,
    initial: () => toAdjustmentState(adjustmentResponse),
  })

  return (
    <main className="min-h-screen bg-app-bg p-6 text-app-ink sm:p-10 lg:p-16">
      <PageHeader
        eyebrow="Workbook · 가장 작은 예제"
        title="Adjustment sheet"
        description="An Excel-style worksheet as one workbook sheet: column groups, section titles, subtotals, an input cell and a difference check, all as formulas over the client state."
      />
      <ScreenLayout
        session={session}
        tabs={tabs}
        toolbar={<Gap />}
        // This screen draws its own formula bar from useFormulaBar.
        formulaBar={<CompactFormulaBar />}
      />
    </main>
  )
}
