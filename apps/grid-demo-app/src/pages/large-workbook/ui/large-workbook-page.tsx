import { useNavigate, useSearch } from '@tanstack/react-router'

import { SheetGrid } from '@lab/workbook/ag-grid'
import { useWorkbook } from '@lab/workbook/react'
import { useScreenSession } from '#/shared/lib/screen/use-screen-session'
import { PageHeader } from '#/shared/ui/page-header'
import { ScreenLayout } from '#/shared/ui/screen-layout'
import type { ScreenTab } from '#/shared/ui/screen-layout'
import {
  LEDGERS,
  largeState,
  largeWorkbook,
} from '#/widgets/large-workbook/model/large-workbook'
import type { LargeState } from '#/widgets/large-workbook/model/large-workbook'

export const ROW_COUNTS = [1000, 5000, 10000] as const

const tabs: ScreenTab[] = [
  {
    id: 'summary',
    label: '요약',
    sheets: ['summary'],
    render: () => (
      <div className="p-6">
        <div className="max-w-3xl border border-[#c5d0c7]">
          <SheetGrid sheetId="summary" />
        </div>
      </div>
    ),
  },
  ...LEDGERS.map((l): ScreenTab => ({
    id: l.id,
    label: l.title,
    sheets: [l.id],
    // Thousands of rows: a fixed height, so the grid scrolls and draws only
    // the rows in view; the total stays in sight below them.
    render: () => (
      <SheetGrid sheetId={l.id} height={600} pinnedBottom={['total']} />
    ),
  })),
]

function RowCount({ rows }: { rows: number }) {
  const navigate = useNavigate()
  const { wb } = useWorkbook()
  const cells = Object.values(wb.sheets).reduce(
    (n, s) =>
      n + (s?.rows ?? []).reduce((m, r) => m + Object.keys(r.cells).length, 0),
    0,
  )
  return (
    <div className="flex items-center gap-3">
      <span className="text-[#536863]">원장마다</span>
      {ROW_COUNTS.map((n) => (
        <button
          key={n}
          type="button"
          className={`cursor-pointer border px-2 py-1 ${n === rows ? 'border-[#1f6f66] bg-[#1f6f66] text-white' : 'border-[#9aaba0] bg-white'}`}
          onClick={() =>
            void navigate({
              to: '.',
              search: (prev: object) => ({ ...prev, rows: n }),
            })
          }
        >
          {n.toLocaleString()}행
        </button>
      ))}
      <span className="text-[#536863]">셀 {cells.toLocaleString()}개</span>
    </div>
  )
}

function Screen({ rows }: { rows: number }) {
  const session = useScreenSession<LargeState>({
    id: 'large',
    def: largeWorkbook,
    initial: () => largeState(rows),
  })
  return (
    <ScreenLayout
      session={session}
      tabs={tabs}
      tab="sales"
      toolbar={<RowCount rows={rows} />}
    />
  )
}

export function LargeWorkbookPage() {
  const { rows = 5000 } = useSearch({ strict: false })
  return (
    <main className="min-h-screen bg-[#f4f1e9] p-6 text-[#17312d] sm:p-10 lg:p-16">
      <PageHeader
        eyebrow="Workbook · 성능"
        title="대용량 원장"
        description="매출·매입·경비 원장마다 수천 행, 행마다 세액 수식, 원장마다 합계, 요약 sheet는 원장 전체에 대한 SUMIF. 원장 grid는 높이를 고정해 보이는 행만 그립니다(행 가상화)."
      />
      {/* A new session per row count. */}
      <Screen key={rows} rows={rows} />
    </main>
  )
}
