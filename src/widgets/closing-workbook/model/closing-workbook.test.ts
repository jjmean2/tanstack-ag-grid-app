import { checkWorkbook } from '#/shared/lib/workbook/check'
import { closingWorkbook, initialClosing } from './closing-workbook'

describe('closing workbook definition', () => {
  it('builds without definition errors', () => {
    const zero = {
      pl: { revenue: 0, cogs: 0, sga: 0, otherIncome: 0, otherExpense: 0 },
    }
    expect(
      checkWorkbook(closingWorkbook, { initial: initialClosing, zero }),
    ).toEqual([])
  })
})
