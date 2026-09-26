import {
  selectDecidedTax,
  selectGap,
  selectTaxBase,
} from '#/entities/tax-session/model/selectors'
import type { TaxSession } from '#/entities/tax-session/model/types'
import type { Store } from '#/shared/lib/store/create-store'
import { shallowEqual, useStore } from '#/shared/lib/store/use-store'

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'ok' | 'error'
}) {
  return (
    <div className="grid gap-1">
      <span className="font-sans text-xs font-bold text-[#536863]">
        {label}
      </span>
      <strong
        className={`font-mono text-lg ${tone === 'error' ? 'text-[#c0392b]' : tone === 'ok' ? 'text-[#1a7f4b]' : ''}`}
      >
        {value}
      </strong>
    </div>
  )
}

// Always visible, whichever tab is open: it reads the same session state.
export function SessionSummary({
  store,
  dirty,
  onReset,
}: {
  store: Store<TaxSession>
  dirty: boolean
  onReset: () => void
}) {
  const summary = useStore(
    store,
    (s) => ({
      taxBase: selectTaxBase(s),
      gap: selectGap(s),
      decided: selectDecidedTax(s),
    }),
    shallowEqual,
  )
  const won = (n: number) => n.toLocaleString('ko-KR')

  return (
    <div className="mx-auto mb-6 flex max-w-[1500px] flex-wrap items-end gap-x-10 gap-y-4 border border-[#c5d0c7] bg-[#fffdf8] px-6 py-4">
      <Stat label="과세표준" value={won(summary.taxBase)} />
      <Stat
        label="신고서상 금액과의 차이"
        value={won(summary.gap)}
        tone={summary.gap === 0 ? 'ok' : 'error'}
      />
      <Stat label="결정세액" value={won(summary.decided)} />
      <div className="ml-auto flex items-center gap-4 font-sans text-sm">
        <span
          className={`px-2 py-1 text-xs font-bold ${dirty ? 'bg-[#f6e2d8] text-[#b35131]' : 'bg-[#e6eee8] text-[#536863]'}`}
        >
          {dirty ? '변경됨' : '변경 없음'}
        </span>
        <button
          type="button"
          className="cursor-pointer border border-[#9aaba0] bg-white px-3 py-1.5 font-bold hover:bg-[#eef3ed]"
          onClick={onReset}
        >
          서버 값으로 초기화
        </button>
      </div>
    </div>
  )
}
