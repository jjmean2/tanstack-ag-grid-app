import { T } from './cell-types'
import { screenExports } from './external'
import { formulaCell, inputCell, labelCell, row } from '../index'
import type { ScreenExports, ColumnDef } from './types'
import { buildWorkbook, defineWorkbook } from './workbook'

const columns: ColumnDef[] = [
  { colId: 'label', headerName: '항목', type: T.text },
  { colId: 'value', headerName: '값', type: T.money },
]

type Source = { amount: number }

const source = defineWorkbook<Source>(
  [
    {
      id: 'src',
      title: '원천',
      columns,
      rows: [
        row('amount', {}, (ctx) => ({
          label: labelCell('금액'),
          value: inputCell(ctx.state.amount, () => {}),
        })),
        row('double', {}, () => ({
          label: labelCell('두 배'),
          value: formulaCell('=[amount/value]*2'),
        })),
      ],
    },
  ],
  { exports: { doubled: 'src/double/value', missing: 'src/nope/value' } },
)

const consumer = defineWorkbook<object>([
  {
    id: 'use',
    title: '사용',
    columns,
    rows: [
      row('ext', {}, () => ({
        label: labelCell('가져온 값'),
        value: formulaCell('=[ext:source/doubled]'),
      })),
      row('plus', {}, () => ({
        label: labelCell('더하기'),
        value: formulaCell('=[ext/value]+1'),
      })),
    ],
  },
])

describe('exports', () => {
  it('evaluates exported cells with a readable label', () => {
    const wb = buildWorkbook(source, { amount: 21 })
    expect(wb.exports.doubled).toMatchObject({
      value: 42,
      text: '42',
      label: '원천 › 두 배 › 값',
      address: 'src/double/value',
    })
  })

  it('reports an export that points at no cell', () => {
    const wb = buildWorkbook(source, { amount: 21 })
    expect(wb.exports.missing.error).toBe('#REF!')
    expect(wb.structuralErrors.map((e) => e.address)).toContain(
      'src/nope/value',
    )
  })
})

describe('external references', () => {
  const saved = (amount: number): Record<string, ScreenExports> => ({
    source: screenExports(
      buildWorkbook(source, { amount }),
      'source',
      '원천 화면',
    ),
  })

  it('reads a value another screen saved', () => {
    const wb = buildWorkbook(consumer, {}, { externals: saved(21) })
    expect(wb.value('use/ext/value')).toBe(42)
    expect(wb.value('use/plus/value')).toBe(43)
    expect(wb.labelOf('ext:source/doubled')).toBe(
      '원천 화면 › 원천 › 두 배 › 값',
    )
    expect(wb.externalRefs).toEqual([
      expect.objectContaining({
        address: 'ext:source/doubled',
        screen: 'source',
        name: 'doubled',
        value: expect.objectContaining({ address: 'src/double/value' }),
      }),
    ])
  })

  it('is #EXT! (not a structural error) while the screen is not saved', () => {
    const wb = buildWorkbook(consumer, {}, { externals: {} })
    expect(wb.cell('use/ext/value')?.error).toBe('#EXT!')
    expect(wb.cell('use/plus/value')?.error).toBe('#EXT!')
    expect(wb.structuralErrors).toEqual([])
    expect(wb.externalRefs[0].value).toBeUndefined()
  })

  it('has no in-workbook targets, so navigation leaves it to the page', () => {
    const wb = buildWorkbook(consumer, {}, { externals: saved(1) })
    expect(wb.targets('ext:source/doubled')).toEqual([])
  })

  it('rejects a malformed reference', () => {
    const bad = defineWorkbook<object>([
      {
        id: 'b',
        title: 'b',
        columns,
        rows: [row('r', {}, () => ({ value: formulaCell('=[ext:/x]') }))],
      },
    ])
    expect(buildWorkbook(bad, {}).cell('b/r/value')?.error).toBe('#PARSE!')
  })
})
