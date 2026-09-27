import { describe, expect, it } from 'vitest'
import { formats } from './formats'

describe('formats', () => {
  it('money formats numbers with ko-KR grouping', () => {
    expect(formats.money.format(1234567)).toBe('1,234,567')
    expect(formats.money.format(null)).toBe('')
  })

  it('money parses empty input as null', () => {
    expect(formats.money.parse('')).toBeNull()
    expect(formats.money.parse('42')).toBe(42)
  })

  it('percent appends a percent sign', () => {
    expect(formats.percent.format(15)).toBe('15%')
  })
})
