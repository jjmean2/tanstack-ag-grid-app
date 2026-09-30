import { T } from './cell-types'
import { parseFormula } from './formula/parser'
import type { ColumnDef } from './types'
import { buildWorkbook, defineWorkbook } from './workbook'
import {
  formulaCell,
  items,
  labelCell,
  literalCell,
  row,
  title,
} from '../index'

type S = { list: { id: string; kind: string; a: number; b: number }[] }

const columns: ColumnDef[] = [
  { colId: 'kind', headerName: '구분', type: T.text },
  { colId: 'a', headerName: 'A', type: T.money },
  { colId: 'b', headerName: 'B', type: T.money },
  { colId: 'c', headerName: 'C', type: T.money },
]

// top    |      | 1  | 2  |
// (title)
// x1     | 과세 | 10 | 20 |      (list)
// x2     | 면세 | 30 | 40 |
// bottom |      | 5  |    |      (b empty)
const def = (formulas: Record<string, string>) =>
  defineWorkbook<S>([
    {
      id: 's',
      title: '시트',
      columns,
      rows: [
        row('top', { label: '위' }, () => ({
          a: literalCell(1),
          b: literalCell(2),
        })),
        title('t', '제목'),
        items('list'),
        row('bottom', { label: '아래' }, () => ({ a: literalCell(5) })),
        row('out', {}, () =>
          Object.fromEntries(
            Object.entries(formulas).map(([col, f]) => [col, formulaCell(f)]),
          ),
        ),
      ],
    },
    {
      id: 'o',
      title: '다른 시트',
      columns: [{ colId: 'v', headerName: '값', type: T.money }],
      rows: [
        row('r', {}, () => ({
          v: formulaCell('=SUM([s/top/a]:[s/bottom/b])'),
        })),
      ],
    },
  ])

const state: S = {
  list: [
    { id: 'x1', kind: '과세', a: 10, b: 20 },
    { id: 'x2', kind: '면세', a: 30, b: 40 },
  ],
}
const build = (formulas: Record<string, string>) =>
  buildWorkbook(def(formulas), state)

describe('ranges', () => {
  it('parse as one reference with two corners', () => {
    const parsed = parseFormula('=SUM([top/a] : [bottom/b])+1')
    if (parsed instanceof Error) throw parsed
    expect(parsed.refs).toHaveLength(1)
    expect(parsed.refs[0].raw).toBe('[top/a] : [bottom/b]')
    expect(parsed.refs[0].to?.parts).toEqual(['bottom', 'b'])
  })

  it('cover the rectangle between two cells, across list and fixed rows', () => {
    const wb = build({
      a: '=SUM([top/a]:[bottom/b])', // 1+2 + 10+20 + 30+40 + 5
      b: '=SUM([x1/a]:[x2/a])', // one column of the list
      c: '=COUNT([top/a]:[bottom/b])', // bottom/b is empty: not counted
    })
    expect(wb.value('s/out/a')).toBe(108)
    expect(wb.value('s/out/b')).toBe(40)
    expect(wb.value('s/out/c')).toBe(7)
  })

  it('take corners in any order', () => {
    expect(build({ a: '=SUM([bottom/b]:[top/a])' }).value('s/out/a')).toBe(108)
  })

  it('line up with each other for SUMIF', () => {
    const wb = build({
      a: '=SUMIF([x1/kind]:[x2/kind],"과세",[x1/b]:[x2/b])',
    })
    expect(wb.value('s/out/a')).toBe(20)
  })

  it('grow with a list between their corners', () => {
    const more = {
      list: [...state.list, { id: 'x3', kind: '과세', a: 100, b: 0 }],
    }
    const wb = buildWorkbook(def({ a: '=SUM([top/a]:[bottom/a])' }), more)
    expect(wb.value('s/out/a')).toBe(1 + 10 + 30 + 100 + 5)
  })

  it('reach into another sheet', () => {
    expect(build({}).value('o/r/v')).toBe(108)
  })

  it('are #REF! when a corner row is gone', () => {
    const wb = build({ a: '=SUM([top/a]:[x9/a])' })
    expect(wb.cell('s/out/a')?.error).toBe('#REF!')
  })

  it('are #CYCLE! when they contain their own cell', () => {
    const wb = build({ a: '=SUM([top/a]:[out/b])' })
    expect(wb.cell('s/out/a')?.error).toBe('#CYCLE!')
  })

  it('reject a list or another screen as a corner, and two sheets', () => {
    expect(
      build({ a: '=SUM([@list/a]:[bottom/a])' }).cell('s/out/a')?.error,
    ).toBe('#PARSE!')
    expect(build({ a: '=SUM([top/a]:[o/r/v])' }).cell('s/out/a')?.error).toBe(
      '#REF!',
    )
  })

  it('name themselves "first ~ last" and list their cells', () => {
    const wb = build({ a: '=SUM([top/a]:[bottom/b])' })
    const target = wb.cell('s/out/a')!.formula!.parts[1].target!
    expect(wb.labelOf(target)).toBe('시트 › 위 › A ~ 아래 › B')
    // 7 cells: bottom/b has none.
    expect(wb.targets(target)).toHaveLength(7)
  })
})

describe('ids', () => {
  it('reject ":" in row and column ids', () => {
    const withRow = (id: string) =>
      defineWorkbook<S>([
        {
          id: 's',
          title: 's',
          columns,
          rows: [row(id, {}, () => ({ a: labelCell('x') }))],
        },
      ])
    expect(() => buildWorkbook(withRow('a:b'), state)).toThrow(
      /must not contain/,
    )
    expect(() =>
      defineWorkbook([
        {
          id: 's',
          title: 's',
          columns: [{ colId: 'a:b', headerName: 'x', type: T.text }],
          rows: [],
        },
      ]),
    ).toThrow(/Column id must not contain/)
  })
})
