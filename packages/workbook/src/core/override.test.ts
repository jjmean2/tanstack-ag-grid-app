import { T } from './cell-types'
import { commitInput } from './edit'
import { defaultPresenter } from './presentation'
import { createStore } from '../store/create-store'
import type { ColumnDef } from './types'
import { buildWorkbook, defineWorkbook } from './workbook'
import { boundCell, formulaCell, labelCell, overrideOf, row } from '../index'

type S = {
  base: { amount: number }
  overrides: { tax?: number }
}

const columns: ColumnDef[] = [
  { colId: 'label', headerName: '항목', type: T.text },
  { colId: 'value', headerName: '금액', type: T.money },
]

const def = defineWorkbook<S>([
  {
    id: 's',
    title: '시트',
    columns,
    rows: [
      row('base', {}, (ctx) => ({
        label: labelCell('금액'),
        value: boundCell(ctx, 'base', 'amount'),
      })),
      // A formula a person may override.
      row('tax', {}, (ctx) => ({
        label: labelCell('세액'),
        value: formulaCell('=[base/value]*10/100', {
          override: overrideOf(ctx, 'overrides', 'tax'),
        }),
      })),
      // An ordinary formula over it.
      row('total', {}, () => ({
        label: labelCell('합계'),
        value: formulaCell('=[base/value]+[tax/value]'),
      })),
    ],
  },
])

function session(overrides: S['overrides'] = {}) {
  const store = createStore<S>({ base: { amount: 1000 }, overrides })
  const build = () => buildWorkbook(def, store.get(), { update: store.set })
  return { store, build }
}

describe('a formula cell a person may override', () => {
  it('shows the formula result while not overridden, and can be written', () => {
    const wb = session().build()
    const tax = wb.cell('s/tax/value')!
    expect(tax.value).toBe(100)
    expect(tax.write).toBeDefined()
    expect(tax.override).toMatchObject({ active: false })
    expect(defaultPresenter(tax)).toMatchObject({ editor: 'number' })
  })

  it("shows a person's value, which dependants read, and keeps the formula result", () => {
    const wb = session({ tax: 7 }).build()
    const tax = wb.cell('s/tax/value')!
    expect(tax.value).toBe(7)
    expect(tax.override).toMatchObject({
      active: true,
      computed: { value: 100 },
    })
    expect(tax.formula?.text).toBe('=[base/value]*10/100')
    expect(wb.value('s/total/value')).toBe(1007)
    expect(defaultPresenter(tax).marks).toContain('wb-overridden')
  })

  it('stores what a person types in the state, and goes back on blank', () => {
    const { store, build } = session()
    expect(commitInput(build().cell('s/tax/value')!, '250')).toBe(true)
    expect(store.get().overrides).toEqual({ tax: 250 })
    expect(build().value('s/total/value')).toBe(1250)

    expect(commitInput(build().cell('s/tax/value')!, '')).toBe(true)
    expect(store.get().overrides).toEqual({})
    expect(build().value('s/tax/value')).toBe(100)
  })

  it('goes back with revert, keeping other overrides', () => {
    const { store, build } = session({ tax: 7 })
    store.set((s) => ({
      ...s,
      overrides: { ...s.overrides, other: 1 } as S['overrides'],
    }))
    build().cell('s/tax/value')!.override!.revert()
    expect(store.get().overrides).toEqual({ other: 1 })
  })

  it('follows its inputs again once reverted', () => {
    const { store, build } = session({ tax: 7 })
    store.set((s) => ({ ...s, base: { amount: 2000 } }))
    expect(build().value('s/tax/value')).toBe(7) // still the person's value
    build().cell('s/tax/value')!.override!.revert()
    expect(build().value('s/tax/value')).toBe(200)
  })

  it('rejects input the type cannot parse', () => {
    const { store, build } = session()
    expect(commitInput(build().cell('s/tax/value')!, 'abc')).toBe(false)
    expect(store.get().overrides).toEqual({})
  })

  it('keeps a formula error out of an overridden cell', () => {
    const broken = defineWorkbook<S>([
      {
        id: 's',
        title: '시트',
        columns,
        rows: [
          row('tax', {}, (ctx) => ({
            value: formulaCell('=1/0', {
              override: overrideOf(ctx, 'overrides', 'tax'),
            }),
          })),
        ],
      },
    ])
    const wb = buildWorkbook(broken, {
      base: { amount: 0 },
      overrides: { tax: 5 },
    })
    const cell = wb.cell('s/tax/value')!
    expect(cell.value).toBe(5)
    expect(cell.error).toBeUndefined()
    expect(cell.override?.computed?.error).toBe('#DIV/0!')
    expect(wb.errors).toEqual([])
  })

  it('treats a missing overrides object as empty', () => {
    const wb = buildWorkbook(def, { base: { amount: 1000 } } as S)
    expect(wb.value('s/tax/value')).toBe(100)
  })

  it('cannot be overridden in a spanRows column', () => {
    const merged = defineWorkbook<S>([
      {
        id: 's',
        title: '시트',
        columns: [{ ...columns[0], spanRows: true }, columns[1]],
        rows: [
          row('r', {}, (ctx) => ({
            label: formulaCell('="x"', {
              type: T.text,
              rowSpan: 'k',
              override: overrideOf(ctx, 'overrides', 'tax'),
            }),
          })),
        ],
      },
    ])
    expect(() =>
      buildWorkbook(merged, { base: { amount: 0 }, overrides: {} }),
    ).toThrow(/cannot be editable/)
  })
})

describe('ordinary cells', () => {
  it('are unchanged: inputs write, formulas are read-only', () => {
    const { store, build } = session()
    const wb = build()
    expect(wb.cell('s/total/value')!.write).toBeUndefined()
    expect(wb.cell('s/total/value')!.override).toBeUndefined()
    expect(commitInput(wb.cell('s/total/value')!, '1')).toBe(false)
    expect(commitInput(wb.cell('s/base/value')!, '')).toBe(true) // money: blank is 0
    expect(store.get().base.amount).toBe(0)
  })
})
