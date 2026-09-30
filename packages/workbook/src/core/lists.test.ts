import { T } from './cell-types'
import { createUiStore, insertListRow } from './navigation'
import { createStore } from '../store/create-store'
import type { ColumnDef, FullWidthContent } from './types'
import { buildWorkbook, defineWorkbook } from './workbook'
import { addRow, items, subtotal } from '../index'

type Item = { id: string; name: string; amount: number }
type S = { list: Item[]; fixed: Item[] }

let next = 0
const newItem = (): Item => ({ id: `n${++next}`, name: '', amount: 0 })

const columns: ColumnDef[] = [
  { colId: 'name', headerName: '이름', type: T.text, editable: true },
  { colId: 'amount', headerName: '금액', type: T.money, editable: true },
  { colId: 'tax', headerName: '세액', type: T.money, formula: '=[.amount]/10' },
]

const def = defineWorkbook<S>([
  {
    id: 's',
    title: 's',
    columns,
    rows: [
      addRow('add', 'list', '+ 추가'),
      items('list', { create: newItem, removable: true, label: '목록' }),
      subtotal('sum', '합계', 'list', ['amount']),
      items('fixed'), // no `create`: rows cannot be added
    ],
  },
])

function session() {
  next = 0
  const store = createStore<S>({
    list: [
      { id: 'a', name: 'A', amount: 10 },
      { id: 'b', name: 'B', amount: 20 },
    ],
    fixed: [{ id: 'f', name: 'F', amount: 1 }],
  })
  const build = () => buildWorkbook(def, store.get(), { update: store.set })
  return { store, build, ui: createUiStore() }
}

describe('lists', () => {
  it('are found by address and by a cell of their rows', () => {
    const wb = session().build()
    expect(wb.list('s/@list')).toMatchObject({
      label: '목록',
      rowIds: ['a', 'b'],
      canInsert: true,
    })
    expect(
      wb.listOf({ sheetId: 's', rowId: 'b', colId: 'amount' })?.address,
    ).toBe('s/@list')
    expect(
      wb.listOf({ sheetId: 's', rowId: 'sum', colId: 'amount' }),
    ).toBeUndefined()
    expect(wb.list('s/@fixed')).toMatchObject({
      canInsert: false,
      canRemove: false,
    })
    expect(wb.list('s/@nope')).toBeUndefined()
  })

  it('insert at the end, above or below a row, and remove', () => {
    const { store, build } = session()
    const ids = () => store.get().list.map((i) => i.id)
    build().list('s/@list')!.insert()
    expect(ids()).toEqual(['a', 'b', 'n1'])
    build().list('s/@list')!.insert({ after: 'a' })
    expect(ids()).toEqual(['a', 'n2', 'b', 'n1'])
    build().list('s/@list')!.insert({ before: 'a' })
    expect(ids()).toEqual(['n3', 'a', 'n2', 'b', 'n1'])
    build().list('s/@list')!.remove('n2')
    expect(ids()).toEqual(['n3', 'a', 'b', 'n1'])
  })

  it('follow in formulas', () => {
    const { store, build } = session()
    build().list('s/@list')!.insert({ after: 'a' })
    store.set((s) => ({
      ...s,
      list: s.list.map((i) => (i.id === 'n1' ? { ...i, amount: 5 } : i)),
    }))
    expect(build().value('s/sum/amount')).toBe(35)
  })

  it('move focus to the new row, in its first editable column', () => {
    const { build, ui } = session()
    const target = insertListRow(ui, build().list('s/@list')!, { after: 'b' })
    expect(target).toEqual({ sheetId: 's', rowId: 'n1', colId: 'name' })
    expect(ui.get().pending?.targets).toEqual([target])
  })

  it("go to the new row in the focused cell's column, if it is typed into", () => {
    const { build, ui } = session()
    ui.set((u) => ({
      ...u,
      focused: { sheetId: 's', rowId: 'a', colId: 'amount' },
    }))
    const target = insertListRow(ui, build().list('s/@list')!, { after: 'a' })
    expect(target).toEqual({ sheetId: 's', rowId: 'n1', colId: 'amount' })
    // A formula column is not typed into: the first one that is.
    ui.set((u) => ({
      ...u,
      focused: { sheetId: 's', rowId: 'a', colId: 'tax' },
    }))
    expect(insertListRow(ui, build().list('s/@list')!)?.colId).toBe('name')
  })

  it('keep the focused cell, once the new row is shown, without flashing', () => {
    const { build, ui } = session()
    const here = { sheetId: 's', rowId: 'b', colId: 'amount' }
    ui.set((u) => ({ ...u, focused: here }))
    insertListRow(
      ui,
      build().list('s/@list')!,
      { before: 'b' },
      { focus: 'keep' },
    )
    expect(ui.get().pending).toMatchObject({
      targets: [here],
      flash: false,
      waitFor: 'n1',
    })
  })

  it('back an add button made by addRow', () => {
    const { store, build } = session()
    const add = build().sheets.s!.rows.find((r) => r.id === 'add')!
      .fullWidth as Extract<FullWidthContent, { kind: 'action' }>
    expect(add.list).toBe('s/@list')
    add.run()
    expect(store.get().list).toHaveLength(3)
  })
})
