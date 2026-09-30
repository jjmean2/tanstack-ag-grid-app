import { T } from './cell-types'
import { externalsFrom, screenExports } from './external'
import { formulaCell, inputCell, labelCell, row } from './layout'
import { screenStorage } from './screen-storage'
import type { ScreenExports, SheetColumnDef } from './types'
import { buildWorkbook, defineWorkbook } from './workbook'

const columns: SheetColumnDef[] = [
  { colId: 'label', headerName: '항목', type: T.text },
  { colId: 'value', headerName: '값', type: T.money },
]

type Source = { amount: number }

const source = defineWorkbook<Source>(
  [
    {
      id: 'src',
      title: '원천',
      tab: 'src',
      columns,
      layout: [
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
    tab: 'use',
    columns,
    layout: [
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

const noop = () => {}

describe('exports', () => {
  it('evaluates exported cells with a readable label', () => {
    const wb = buildWorkbook(source, { amount: 21 }, noop)
    expect(wb.exports.doubled).toMatchObject({
      value: 42,
      text: '42',
      label: '원천 › 두 배 › 값',
      address: 'src/double/value',
    })
  })

  it('reports an export that points at no cell', () => {
    const wb = buildWorkbook(source, { amount: 21 }, noop)
    expect(wb.exports.missing.error).toBe('#REF!')
    expect(wb.structuralErrors.map((e) => e.address)).toContain(
      'src/nope/value',
    )
  })
})

describe('external references', () => {
  const saved = (amount: number): Record<string, ScreenExports> => ({
    source: screenExports(
      buildWorkbook(source, { amount }, noop),
      'source',
      '원천 화면',
    ),
  })

  it('reads a value another screen saved', () => {
    const wb = buildWorkbook(consumer, {}, noop, externalsFrom(saved(21)))
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
    const wb = buildWorkbook(consumer, {}, noop, externalsFrom({}))
    expect(wb.cell('use/ext/value')?.error).toBe('#EXT!')
    expect(wb.cell('use/plus/value')?.error).toBe('#EXT!')
    expect(wb.structuralErrors).toEqual([])
    expect(wb.externalRefs[0].value).toBeUndefined()
  })

  it('has no in-workbook targets, so navigation leaves it to the page', () => {
    const wb = buildWorkbook(consumer, {}, noop, externalsFrom(saved(1)))
    expect(wb.targets('ext:source/doubled')).toEqual([])
  })

  it('rejects a malformed reference', () => {
    const bad = defineWorkbook<object>([
      {
        id: 'b',
        title: 'b',
        tab: 'b',
        columns,
        layout: [row('r', {}, () => ({ value: formulaCell('=[ext:/x]') }))],
      },
    ])
    expect(buildWorkbook(bad, {}, noop).cell('b/r/value')?.error).toBe(
      '#PARSE!',
    )
  })
})

describe('screenStorage', () => {
  beforeEach(() => localStorage.clear())

  it('saves state and exports separately and reads them back', () => {
    const exports = saved()
    expect(screenStorage.save('source', { amount: 5 }, exports)).toBe(true)
    expect(screenStorage.loadState('source')).toEqual({ amount: 5 })
    expect(screenStorage.loadExports(['source', 'other'])).toEqual({
      source: exports,
      other: undefined,
    })
  })

  it('ignores data saved in another format version', () => {
    localStorage.setItem(
      'workbook:source:state',
      JSON.stringify({ version: 0, data: { amount: 5 } }),
    )
    expect(screenStorage.loadState('source')).toBeUndefined()
  })

  function saved() {
    return screenExports(
      buildWorkbook(source, { amount: 5 }, noop),
      'source',
      '원천 화면',
    )
  }
})
