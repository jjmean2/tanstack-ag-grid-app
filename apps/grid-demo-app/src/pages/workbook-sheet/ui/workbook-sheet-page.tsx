import { toSession } from '#/entities/tax-session/model/adapter'
import { taxSessionResponse } from '#/entities/tax-session/model/data'
import type { TaxSession } from '#/entities/tax-session/model/types'
import { SheetGrid } from '@lab/workbook/ag-grid'
import { useScreenSession } from '#/shared/lib/screen/use-screen-session'
import { PageHeader } from '#/shared/ui/page-header'
import { ScreenLayout } from '#/shared/ui/screen-layout'
import type { ScreenTab } from '#/shared/ui/screen-layout'
import {
  issueCounts,
  taxWorkbook,
} from '#/widgets/tax-workbook/model/tax-workbook'
import { CompanyTab } from '#/widgets/tax-workbook/ui/company-tab'
import { SessionDebug } from '#/widgets/tax-workbook/ui/session-debug'
import { TaxTab } from '#/widgets/tax-workbook/ui/tax-tab'
import { WorkbookSummary } from '#/widgets/tax-workbook/ui/workbook-summary'

const tabs: ScreenTab[] = [
  {
    id: 'company',
    label: '기본정보',
    sheets: ['company'],
    render: () => <CompanyTab />,
  },
  {
    id: 'adjustment',
    label: '소득금액조정',
    sheets: ['adj'],
    render: () => <SheetGrid sheetId="adj" />,
  },
  {
    id: 'tax',
    label: '세액계산',
    sheets: ['inputs', 'calc'],
    render: () => <TaxTab />,
  },
]

export function WorkbookSheetPage() {
  // One editing session: the server response becomes the client state once.
  // Other screens are not loaded: only the values they exported are read.
  const session = useScreenSession<TaxSession>({
    id: 'tax',
    def: taxWorkbook,
    initial: () => toSession(taxSessionResponse),
    imports: ['closing'],
  })

  return (
    <main className="min-h-screen bg-app-bg p-6 text-app-ink sm:p-10 lg:p-16">
      <PageHeader
        eyebrow="Workbook"
        title="법인세 세무조정"
        description="One editing session across tabs: inputs and grids are views of the same cells, formulas link sheets and tabs, and the tax calculation reads net income saved by the closing screen ([ext:closing/netIncome]). Select a cell to see its formula; click a reference to follow it."
      />
      <ScreenLayout
        session={session}
        tab="adjustment"
        tabs={tabs}
        toolbar={<WorkbookSummary />}
        issues={issueCounts}
      />
      <SessionDebug store={session.workbook.store} />
    </main>
  )
}
