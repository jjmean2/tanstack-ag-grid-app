import { buildWorkbook, checkWorkbook } from '@lab/workbook'
import { initialVat, vatWorkbook } from './vat-form'
import type { VatState } from './vat-form'

const build = (state: VatState) => buildWorkbook(vatWorkbook, state)

describe('vat form definition', () => {
  it('builds without definition errors', () => {
    expect(
      checkWorkbook(vatWorkbook, {
        initial: initialVat,
        'no purchases': { ...initialVat, purchases: [] },
        'blank period': { ...initialVat, period: { start: '', end: '' } },
      }),
    ).toEqual([])
  })

  it('adds up the form, including the purchase list sheet', () => {
    const wb = build(initialVat)
    expect(wb.value('ret/s9/tax')).toBe(15_700_000) // 12,000,000 + 3,500,000 + 200,000
    expect(wb.value('ret/p10/amount')).toBe(82_500_000) // 일반 매입 from the list
    expect(wb.value('ret/p11/amount')).toBe(12_000_000) // 고정자산
    expect(wb.value('ret/p16/tax')).toBe(9_450_000)
    expect(wb.value('ret/pay/tax')).toBe(6_250_000)
    expect(wb.value('ret/c18/tax')).toBe(455_000) // 35,000,000 × 1.3%
    expect(wb.value('ret/final/tax')).toBe(5_795_000)
  })

  it('takes a typed (18) credit over its formula, down to the tax due', () => {
    const wb = build({ ...initialVat, overrides: { c18Tax: 300_000 } })
    expect(wb.value('ret/c18/tax')).toBe(300_000)
    expect(wb.cell('ret/c18/tax')?.override?.computed?.value).toBe(455_000)
    expect(wb.value('ret/final/tax')).toBe(5_950_000) // 6,250,000 − 300,000
  })

  it('reads a state saved before overrides existed', () => {
    const { overrides: _, ...old } = initialVat
    expect(build(old as VatState).value('ret/c18/tax')).toBe(455_000)
  })

  it('names form cells by line and column for the formula bar', () => {
    const wb = build(initialVat)
    expect(wb.labelOf('ret/s3/tax')).toBe(
      '신고 내용 › (3) 신용카드·현금영수증 발행분 › 세액',
    )
    expect(wb.labelOf('purchases/@purchases/amount')).toBe(
      '매입 명세 › 매입 명세 › 공급가액',
    )
  })
})
