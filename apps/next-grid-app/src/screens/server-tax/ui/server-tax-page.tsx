'use client'

import { Suspense } from 'react'

import type { TaxSession } from '@/entities/tax-session/model/types'
import {
  useServerOpenScreen,
  useServerScreenSession,
} from '@/shared/lib/server-screen/use-server-screen-session'
import { tabs } from '@/screens/workbook-sheet/ui/workbook-sheet-page'
import { PageHeader } from '@/shared/ui/page-header'
import { ScreenLayout } from '@/shared/ui/screen-layout'
import { ScreenLoading } from '@/shared/ui/screen-loading'
import {
  issueCounts,
  taxWorkbook,
} from '@/widgets/tax-workbook/model/tax-workbook'
import { WorkbookSummary } from '@/widgets/tax-workbook/ui/workbook-summary'

// The tax screen with its state on the server, reading the server-backed
// closing screen's exports (`[ext:closing/netIncome]`) through a query.
function Screen() {
  const session = useServerScreenSession<TaxSession>({
    id: 'tax',
    def: taxWorkbook,
    imports: ['closing'],
  })
  return (
    <ScreenLayout
      session={session}
      tab="adjustment"
      tabs={tabs}
      toolbar={<WorkbookSummary />}
      issues={issueCounts}
      openScreen={useServerOpenScreen()}
    />
  )
}

export function ServerTaxPage() {
  return (
    <main className="min-h-screen bg-app-bg p-6 text-app-ink sm:p-10 lg:p-16">
      <PageHeader
        eyebrow="Workbook · 서버 state (TanStack Query)"
        title="법인세 세무조정 (서버)"
        description="state와 결산 화면의 export를 모두 서버 API에서 쿼리로 불러옵니다. 서버판 결산을 저장하면 이 화면의 export 쿼리가 무효화되어 다시 불러오고, 다른 탭에서 저장했다면 창으로 돌아올 때 다시 불러옵니다."
      />
      <Suspense fallback={<ScreenLoading what="법인세 세무조정" />}>
        <Screen />
      </Suspense>
    </main>
  )
}
