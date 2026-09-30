import { T } from './cell-types'
import { highlightMarks, referenceHighlights } from './highlight'
import type { ColumnDef } from './types'
import { buildWorkbook, defineWorkbook } from './workbook'
import { formulaCell, items, literalCell, row } from '../index'

type S = { list: { id: string; a: number }[] }
const columns: ColumnDef[] = [
  { colId: 'a', headerName: 'A', type: T.money },
  { colId: 'b', headerName: 'B', type: T.money },
]
const def = defineWorkbook<S>([
  {
    id: 's',
    title: 's',
    columns,
    rows: [
      row('x', {}, () => ({ a: literalCell(1), b: literalCell(2) })),
      row('y', {}, () => ({ a: literalCell(3), b: literalCell(4) })),
      items('list'),
      row('f', {}, () => ({
        // three references: a cell, a range, a list column; the cell again;
        // another screen's value.
        a: formulaCell(
          '=[x/a]+SUM([x/b]:[y/b])+SUM([@list/a])+[x/a]+IFERROR([ext:o/v],0)',
        ),
        b: literalCell(0),
      })),
    ],
  },
])
const wb = buildWorkbook(def, {
  list: [
    { id: 'l1', a: 5 },
    { id: 'l2', a: 6 },
  ],
})
const at = (rowId: string, colId: string) => ({ sheetId: 's', rowId, colId })

describe('referenceHighlights', () => {
  it("numbers the focused formula's references and the cells they cover", () => {
    const h = referenceHighlights(wb, at('f', 'a'))
    expect([...h.byTarget]).toEqual([
      ['s/x/a', 1],
      ['s/x/b:y/b', 2],
      ['s/@list/a', 3],
    ])
    expect(Object.fromEntries(h.byCell)).toEqual({
      's/x/a': 1,
      's/x/b': 2,
      's/y/b': 2,
      's/l1/a': 3,
      's/l2/a': 3,
    })
  })

  it('is empty without a focused formula', () => {
    expect(referenceHighlights(wb, null).byCell.size).toBe(0)
    expect(referenceHighlights(wb, at('x', 'a')).byCell.size).toBe(0)
  })

  it('is computed once per workbook and focused cell', () => {
    expect(referenceHighlights(wb, at('f', 'a'))).toBe(
      referenceHighlights(wb, at('f', 'a')),
    )
  })

  it('gives marks for a number', () => {
    expect(highlightMarks(2)).toEqual(['wb-referenced', 'wb-hl-2'])
    expect(highlightMarks(undefined)).toEqual([])
  })
})
