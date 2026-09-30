import { buildWorkbook, checkWorkbook } from '@lab/workbook'
import { toAdjustmentState } from '#/entities/adjustment/model/adapter'
import { adjustmentResponse } from '#/entities/adjustment/model/data'
import { adjustmentWorkbook } from './adjustment-workbook'

const initial = toAdjustmentState(adjustmentResponse)

describe('adjustment workbook', () => {
  it('builds without definition errors', () => {
    expect(
      checkWorkbook(adjustmentWorkbook, {
        initial,
        empty: { adds: [], subs: [], reported: 0 },
      }),
    ).toEqual([])
  })

  it('checks the total against the reported amount', () => {
    const wb = buildWorkbook(adjustmentWorkbook, initial, () => {})
    expect(wb.value('adj/total/tax')).toBe(17_500_000)
    expect(wb.value('adj/gap/tax')).toBe(500_000)
    expect(wb.value('adj/gap/disposition')).toBe('불일치 - 검토 필요')

    const matched = { ...initial, reported: 17_500_000 }
    expect(
      buildWorkbook(adjustmentWorkbook, matched, () => {}).value(
        'adj/gap/disposition',
      ),
    ).toBe('일치')
  })
})
