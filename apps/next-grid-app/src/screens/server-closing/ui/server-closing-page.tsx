'use client'

import { Suspense } from 'react'

import {
  useServerOpenScreen,
  useServerScreenSession,
} from '@/shared/lib/server-screen/use-server-screen-session'
import { tabs } from '@/screens/workbook-closing/ui/workbook-closing-page'
import { PageHeader } from '@/shared/ui/page-header'
import { ScreenLayout } from '@/shared/ui/screen-layout'
import { ScreenLoading } from '@/shared/ui/screen-loading'
import { closingWorkbook } from '@/widgets/closing-workbook/model/closing-workbook'
import type { ClosingState } from '@/widgets/closing-workbook/model/closing-workbook'
import { ClosingExports } from '@/widgets/closing-workbook/ui/closing-exports'

// The closing screen with its state on the server (TanStack Query): the same
// workbook, tabs and toolbar as /workbook-closing, another session.
function Screen() {
  const session = useServerScreenSession<ClosingState>({
    id: 'closing',
    def: closingWorkbook,
  })
  return (
    <ScreenLayout
      session={session}
      tabs={tabs}
      toolbar={<ClosingExports />}
      openScreen={useServerOpenScreen()}
    />
  )
}

export function ServerClosingPage() {
  return (
    <main className="min-h-screen bg-app-bg p-6 text-app-ink sm:p-10 lg:p-16">
      <PageHeader
        eyebrow="Workbook · 서버 state (TanStack Query)"
        title="결산 (서버)"
        description="state를 localStorage가 아니라 서버 API에서 불러오고(useSuspenseQuery), 저장하면 서버에 보냅니다(useMutation). 저장하면 export 쿼리가 무효화되어, 서버판 법인세 화면이 새 당기순이익을 다시 불러옵니다."
      />
      <Suspense fallback={<ScreenLoading what="결산" />}>
        <Screen />
      </Suspense>
    </main>
  )
}
