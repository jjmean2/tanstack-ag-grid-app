import type { AdjustmentItem, TabId, TaxSession } from './types'

// Derived values are defined once, as pure functions of the session state.
// Grid cells and plain UI (any tab) both use them, so they can never disagree.
// Each selector only takes the keys it reads, so a grid can list exactly those
// keys as its dependencies.

export const diffOf = (item: AdjustmentItem) => item.tax - item.book

const sum = (items: AdjustmentItem[], pick: (i: AdjustmentItem) => number) =>
  items.reduce((acc, i) => acc + (pick(i) || 0), 0)

type Adjustments = Pick<TaxSession, 'adds' | 'subs'>

// 과세표준: 조정 후 세법상 금액의 합계
export const selectTaxBase = (s: Adjustments) =>
  sum([...s.adds, ...s.subs], (i) => i.tax)

// 신고서상 금액과의 차이
export const selectGap = (s: Adjustments & Pick<TaxSession, 'reported'>) =>
  selectTaxBase(s) - s.reported

// 산출세액
export const selectComputedTax = (s: Adjustments & Pick<TaxSession, 'rates'>) =>
  Math.round((selectTaxBase(s) * s.rates.standard) / 100)

export const selectCreditTotal = (s: Pick<TaxSession, 'credits'>) =>
  s.credits.research + s.credits.employment

// 결정세액
export const selectDecidedTax = (
  s: Adjustments & Pick<TaxSession, 'rates' | 'credits'>,
) => Math.max(0, selectComputedTax(s) - selectCreditTotal(s))

// 지방소득세
export const selectLocalTax = (
  s: Adjustments & Pick<TaxSession, 'rates' | 'credits'>,
) => Math.round((selectDecidedTax(s) * s.rates.local) / 100)

export const selectTotalBurden = (
  s: Adjustments & Pick<TaxSession, 'rates' | 'credits'>,
) => selectDecidedTax(s) + selectLocalTax(s)

// Number of open issues per tab (shown as badges on the tab bar).
export function selectIssueCounts(s: TaxSession): Record<TabId, number> {
  const emptyAccounts = [...s.adds, ...s.subs].filter(
    (i) => i.account.trim() === '',
  ).length
  return {
    company: s.company.name.trim() === '' ? 1 : 0,
    adjustment: (selectGap(s) === 0 ? 0 : 1) + emptyAccounts,
    tax: s.rates.standard > 0 ? 0 : 1,
  }
}
