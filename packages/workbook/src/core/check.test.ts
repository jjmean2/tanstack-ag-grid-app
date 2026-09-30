import {
  checkWorkbook,
  defineWorkbook,
  formulaCell,
  items,
  labelCell,
  row,
  T,
} from '../index'
import type { SheetColumnDef } from '../index'

type S = { list: { id: string }[] }

const columns: SheetColumnDef[] = [
  { colId: 'label', headerName: '항목', type: T.text },
  { colId: 'value', headerName: '값', type: T.money },
]

const def = defineWorkbook<S>([
  {
    id: 's',
    title: 's',
    tab: 's',
    columns,
    layout: [
      items('list'),
      // A fixed row whose id collides with an item id `x`.
      row('x', {}, () => ({ label: labelCell('x') })),
      row('bad', {}, () => ({ value: formulaCell('=[nowhere/value]') })),
    ],
  },
])

describe('checkWorkbook', () => {
  it('reports errors that only some data causes, per sample', () => {
    expect(
      checkWorkbook(def, {
        empty: { list: [] },
        clash: { list: [{ id: 'x' }] },
      }),
    ).toEqual([
      'empty: s/bad/value #REF! (#REF! s/nowhere/value)',
      'clash: Duplicate row id "x" in sheet "s"',
    ])
  })
})
