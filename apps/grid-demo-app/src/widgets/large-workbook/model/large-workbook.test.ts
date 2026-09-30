import { buildWorkbook, checkWorkbook } from '@lab/workbook'
import { largeState, largeWorkbook } from './large-workbook'

describe('large workbook', () => {
  it('builds without definition errors', () => {
    expect(
      checkWorkbook(largeWorkbook, {
        small: largeState(30),
        empty: largeState(0),
      }),
    ).toEqual([])
  })

  it('sums ledgers and splits them by kind', () => {
    const state = largeState(30)
    const wb = buildWorkbook(largeWorkbook, state)
    const total = state.sales.reduce((n, e) => n + e.amount, 0)
    expect(wb.value('summary/sales-total/amount')).toBe(total)
    const byKind = ['과세', '면세', '영세'].map((k) =>
      wb.value(`summary/sales-${k}/amount`),
    )
    expect(byKind.reduce((a, b) => (a as number) + (b as number), 0)).toBe(
      total,
    )
  })
})
