import { INVALID, T } from './cell-types'

describe('T.money', () => {
  it('shows negatives in parentheses', () => {
    expect(T.money.format(1234567)).toBe('1,234,567')
    expect(T.money.format(-1234567)).toBe('(1,234,567)')
    expect(T.money.format(0)).toBe('0')
  })

  it('reads back what it shows', () => {
    for (const n of [0, 5, -5, 1234567, -1234567])
      expect(T.money.parse(T.money.format(n))).toBe(n)
    expect(T.money.parse('-5')).toBe(-5)
    expect(T.money.parse(-5)).toBe(-5)
  })

  it('rejects what is not a number', () => {
    expect(T.money.parse('abc')).toBe(INVALID)
    expect(T.money.parse('(abc)')).toBe(INVALID)
    expect(T.money.parse('()')).toBe(INVALID)
  })
})

describe('other numbers', () => {
  it('keep the minus sign', () => {
    expect(T.integer.format(-1234)).toBe('-1,234')
    expect(T.number.parse('1,234.5')).toBe(1234.5)
  })
})
