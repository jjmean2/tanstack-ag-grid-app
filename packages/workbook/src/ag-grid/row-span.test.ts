import type { ColDef, IRowNode, SpanRowsParams } from 'ag-grid-community'

import { T } from '../core/cell-types'
import { createGridColumns } from './columns'
import {
  addRow,
  inputCell,
  items,
  labelCell,
  row,
  spanned,
  subtotal,
  title,
} from '../index'
import type { SheetDef, Row, ColumnDef } from '../core/types'
import { buildWorkbook, defineWorkbook } from '../core/workbook'

type Item = { id: string; name: string; amount: number }
type S = { list: Item[] }

const columns: ColumnDef[] = [
  { colId: 'section', headerName: '구분', type: T.text, spanRows: true },
  { colId: 'name', headerName: '항목', type: T.text, editable: true },
  { colId: 'amount', headerName: '금액', type: T.money, editable: true },
]

const sheet = (rows: SheetDef<S>['rows'], cols = columns): SheetDef<S> => ({
  id: 's',
  title: 's',
  columns: cols,
  rows,
})

const state: S = {
  list: [
    { id: 'a', name: 'A', amount: 1 },
    { id: 'b', name: 'B', amount: 2 },
  ],
}
const noop = () => {}

describe('layout with a spanRows column', () => {
  const wb = buildWorkbook(
    defineWorkbook<S>([
      sheet([
        title('t', '제목'),
        spanned('blk', 'section', '구분1', [
          items('list'),
          subtotal('sum', '소계', 'list', ['amount']),
          addRow('add', 'list', () => ({ id: 'x' }), '+'),
        ]),
      ]),
    ]),
    state,
  )
  const rows = wb.sheets.s!.rows
  const byId = (id: string) => rows.find((r) => r.id === id)!

  it('merges the block: every row gets the label with one key', () => {
    expect(
      ['a', 'b', 'sum'].map((id) => byId(id).cells.section.rowSpan),
    ).toEqual(['blk', 'blk', 'blk'])
    expect(byId('a').cells.section.value).toBe('구분1')
  })

  it('makes titles and add buttons full width rows without cells', () => {
    expect(byId('t')).toMatchObject({
      cells: {},
      fullWidth: { kind: 'title', text: '제목' },
    })
    // Left out of the merge, which it would otherwise cut in two.
    expect(byId('add')).toMatchObject({
      cells: {},
      fullWidth: { kind: 'action', label: '+' },
    })
  })

  it('puts subtotal labels in the first column past the merged one', () => {
    expect(byId('sum').cells.name.value).toBe('소계')
  })

  it('names rows by their first column past the merged one', () => {
    expect(wb.labelOf('s/a/amount')).toBe('s › A › 금액')
  })

  it('leaves formulas over the block unaffected', () => {
    expect(wb.value('s/sum/amount')).toBe(3)
  })
})

describe('definition checks', () => {
  const build = (def: SheetDef<S>) =>
    buildWorkbook(defineWorkbook<S>([def]), state)

  const middle = [columns[1], columns[0], columns[2]] // 항목 | 구분 | 금액

  it('allows a spanRows column in the middle', () => {
    const wb = build(
      sheet(
        [spanned('k', 'section', '구분', [items('list'), title('t', '제목')])],
        middle,
      ),
    )
    expect(wb.cell('s/a/section')?.rowSpan).toBe('k')
  })

  it('rejects a span that would cover a spanRows column', () => {
    expect(() =>
      build(
        sheet(
          [row('r', {}, () => ({ name: labelCell('x', { span: 2 }) }))],
          middle,
        ),
      ),
    ).toThrow(/cannot cover a spanRows column/)
  })

  it('rejects cells in a full width row', () => {
    expect(() =>
      build(
        sheet([
          () => [
            {
              id: 'r',
              cells: { name: labelCell('x') },
              fullWidth: { kind: 'title', text: 'x' },
            },
          ],
        ]),
      ),
    ).toThrow(/full width row has no cells/)
  })

  it('rejects rowSpan outside a spanRows column', () => {
    expect(() =>
      build(
        sheet([
          row('r', {}, () => ({ name: labelCell('x', { rowSpan: 'k' }) })),
        ]),
      ),
    ).toThrow(/needs a spanRows column/)
  })

  it('rejects an editable cell in a spanRows column', () => {
    expect(() =>
      build(
        sheet([
          row('r', {}, () => ({
            section: inputCell('x', noop, { rowSpan: 'k' }),
          })),
        ]),
      ),
    ).toThrow(/cannot be editable/)
  })

  it('rejects spanning across from a spanRows column', () => {
    expect(() =>
      build(
        sheet([row('r', {}, () => ({ section: labelCell('x', { span: 2 }) }))]),
      ),
    ).toThrow(/cannot span across/)
  })
})

describe('grid adapter', () => {
  const [section, name] = createGridColumns(columns) as ColDef<Row>[]
  const rows = buildWorkbook(
    defineWorkbook<S>([
      sheet([
        spanned('one', 'section', '1', [items('list')]),
        spanned('two', 'section', '2', [title('t', '제목')]),
      ]),
    ]),
    state,
  ).sheets.s!.rows
  const node = (data: Row) => ({ data }) as IRowNode<Row>
  const spans = (a: Row, b: Row) =>
    (section.spanRows as (p: SpanRowsParams<Row>) => boolean)({
      nodeA: node(a),
      nodeB: node(b),
    } as SpanRowsParams<Row>)

  it('uses spanRows instead of colSpan on a spanRows column', () => {
    expect(section.colSpan).toBeUndefined()
    expect(section.editable).toBeUndefined()
    expect(typeof section.spanRows).toBe('function')
    expect(name.spanRows).toBeUndefined()
    expect(typeof name.colSpan).toBe('function')
  })

  it('merges adjacent cells with the same key only', () => {
    expect(spans(rows[0], rows[1])).toBe(true)
    expect(spans(rows[1], rows[2])).toBe(false)
  })
})
