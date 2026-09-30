import { T } from '../core/cell-types'
import type { ColumnDef } from '../core/types'
import { buildWorkbook, defineWorkbook } from '../core/workbook'
import { items, subtotal } from '../index'
import { stableRows } from './stable-rows'

type S = { list: { id: string; amount: number }[] }
const columns: ColumnDef[] = [
  { colId: 'amount', headerName: '금액', type: T.money, editable: true },
  { colId: 'tax', headerName: '세액', type: T.money, formula: '=[.amount]/10' },
]
const def = defineWorkbook<S>([
  {
    id: 's',
    title: 's',
    columns,
    rows: [items('list'), subtotal('sum', '합계', 'list', ['amount'])],
  },
])
const rowsOf = (state: S) => buildWorkbook(def, state).sheets.s!.rows
const list = (...amounts: number[]): S => ({
  list: amounts.map((amount, i) => ({ id: `r${i}`, amount })),
})
const byId = (rows: { id: string }[]) =>
  new Map(rows.map((r) => [r.id, r] as const)) as never

describe('stableRows', () => {
  it('keeps the object of every unchanged row', () => {
    const before = rowsOf(list(10, 20, 30))
    const after = stableRows(rowsOf(list(10, 25, 30)), byId(before))
    expect(after[0]).toBe(before[0]) // unchanged
    expect(after[1]).not.toBe(before[1]) // edited
    expect(after[1].cells.tax.value).toBe(2.5)
    expect(after[2]).toBe(before[2])
    expect(after[3]).not.toBe(before[3]) // the sum changed
  })

  it('reuses nothing when everything is new', () => {
    const after = stableRows(rowsOf(list(1, 2)), new Map())
    expect(after.map((r) => r.id)).toEqual(['r0', 'r1', 'sum'])
  })

  it('writes through a reused row to the latest state', () => {
    let state = list(10, 20)
    const update = (fn: (s: S) => S) => {
      state = fn(state)
    }
    const first = buildWorkbook(def, state, { update }).sheets.s!.rows
    // Another row changes; row r0 is reused and then edited.
    update((s) => ({
      list: s.list.map((i) => (i.id === 'r1' ? { ...i, amount: 99 } : i)),
    }))
    const second = stableRows(
      buildWorkbook(def, state, { update }).sheets.s!.rows,
      byId(first),
    )
    expect(second[0]).toBe(first[0])
    second[0].cells.amount.write!(11)
    expect(state.list.map((i) => i.amount)).toEqual([11, 99])
  })
})
