import type { ColDef, IRowNode, SpanRowsParams } from 'ag-grid-community'

import { T } from './cell-types'
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
} from './layout'
import type { ResolvedRow, SheetColumnDef, SheetDef } from './types'
import { buildWorkbook, defineWorkbook } from './workbook'

type Item = { id: string; name: string; amount: number }
type S = { list: Item[] }

const columns: SheetColumnDef[] = [
  { colId: 'section', headerName: '구분', type: T.text, spanRows: true },
  { colId: 'name', headerName: '항목', type: T.text, editable: true },
  { colId: 'amount', headerName: '금액', type: T.money, editable: true },
]

const sheet = (layout: SheetDef<S>['layout'], cols = columns): SheetDef<S> => ({
  id: 's',
  title: 's',
  tab: 's',
  columns: cols,
  layout,
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
          addRow('add', 'list', () => ({ id: 'x' }), '+'),
          subtotal('sum', '소계', 'list', ['amount']),
        ]),
      ]),
    ]),
    state,
    noop,
  )
  const rows = wb.sheets.s!.rows

  it('merges the block: every row gets the label with one key', () => {
    expect(rows.slice(1).map((r) => r.cells.section.rowSpan)).toEqual([
      'blk',
      'blk',
      'blk',
      'blk',
    ])
    expect(rows[1].cells.section.value).toBe('구분1')
  })

  it('keeps full-width rows to the right of it', () => {
    expect(rows[0].cells.section).toBeUndefined()
    expect(rows[0].cells.name.span).toBe(2)
    expect(rows.find((r) => r.id === 'add')?.cells.name.span).toBe(2)
    expect(rows.find((r) => r.id === 'sum')?.cells.name.value).toBe('소계')
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
    buildWorkbook(defineWorkbook<S>([def]), state, noop)

  it('rejects spanRows columns that are not leading', () => {
    expect(() =>
      defineWorkbook<S>([sheet([], [columns[1], columns[0], columns[2]])]),
    ).toThrow(/must come before/)
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
  const [section, name] = createGridColumns(columns) as ColDef<ResolvedRow>[]
  const rows = buildWorkbook(
    defineWorkbook<S>([
      sheet([
        spanned('one', 'section', '1', [items('list')]),
        spanned('two', 'section', '2', [title('t', '제목')]),
      ]),
    ]),
    state,
    noop,
  ).sheets.s!.rows
  const node = (data: ResolvedRow) => ({ data }) as IRowNode<ResolvedRow>
  const spans = (a: ResolvedRow, b: ResolvedRow) =>
    (section.spanRows as (p: SpanRowsParams<ResolvedRow>) => boolean)({
      nodeA: node(a),
      nodeB: node(b),
    } as SpanRowsParams<ResolvedRow>)

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
