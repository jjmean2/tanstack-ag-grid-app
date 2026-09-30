import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { createStore } from '../store/create-store'
import { T } from '../core/cell-types'
import { FormSheet } from './form-sheet'
import { boundCell, cellBox, formulaCell, textBox } from '../index'
import { createUiStore } from '../core/navigation'
import type { FormNode } from '../core/types'
import { buildWorkbook, defineWorkbook } from '../core/workbook'
import { WorkbookProvider } from './workbook-context'

type S = { v: { a: number } }
const state: S = { v: { a: 2 } }
const noop = () => {}

const form = (layout: FormNode<S>[], tracks = ['1fr', '1fr', '1fr']) =>
  defineWorkbook<S>([
    { kind: 'form', id: 'f', title: '서식', tab: 't', tracks, layout },
  ])

// ┌──────┬──────┐
// │ 금액 │  a   │
// │      ├──────┤
// │      │ a×10 │   "금액" is merged down two rows
// └──────┴──────┘
const layout: FormNode<S> = (ctx) => [
  textBox([1, 1, 2, 1], '금액', 'head'),
  cellBox([1, 2], 'a/v', boundCell(ctx, 'v', 'a', { type: T.money }), {
    name: '입력',
  }),
  cellBox([2, 2], 'b/v', formulaCell('=[a/v]*10', { type: T.money }), {
    name: '결과',
  }),
]

describe('form sheet definition', () => {
  it('builds cells that formulas and lookups see', () => {
    const wb = buildWorkbook(form([layout], ['1fr', '1fr']), state, noop)
    expect(wb.value('f/b/v')).toBe(20)
    expect(wb.labelOf('f/b/v')).toBe('서식 › 결과 › v')
    expect(wb.sheets.f?.form?.items.map((i) => i.address ?? i.text)).toEqual([
      '금액',
      'f/a/v',
      'f/b/v',
    ])
  })

  it('rejects overlapping boxes', () => {
    const overlap: FormNode<S> = () => [
      textBox([1, 1, 2, 2], 'A'),
      textBox([2, 2], 'B'),
    ]
    expect(() => buildWorkbook(form([overlap]), state, noop)).toThrow(
      /text "B" of form "f" overlaps text "A"/,
    )
  })

  it('rejects a box outside the columns', () => {
    const wide: FormNode<S> = () => [textBox([1, 2, 1, 3], 'A')]
    expect(() => buildWorkbook(form([wide]), state, noop)).toThrow(
      /outside its 3 columns/,
    )
  })

  it('rejects a malformed ref', () => {
    const bad: FormNode<S> = () => [cellBox([1, 1], 'a', formulaCell('=1'))]
    expect(() => buildWorkbook(form([bad]), state, noop)).toThrow(
      /ref must be "row\/col"/,
    )
  })
})

describe('FormSheet', () => {
  it('draws boxes on a grid and edits cells in place', async () => {
    const store = createStore(state)
    render(
      <WorkbookProvider
        store={store}
        def={form([layout], ['1fr', '1fr'])}
        ui={createUiStore('t')}
      >
        <FormSheet sheetId="f" />
      </WorkbookProvider>,
    )
    expect(screen.getByText('금액')).toHaveStyle({
      gridRow: '1 / span 2',
      gridColumn: '1 / span 1',
    })
    const [input, result] = screen.getAllByRole('textbox')
    expect(result).toHaveAttribute('readonly')
    await userEvent.click(input)
    await userEvent.keyboard('7{Enter}')
    expect(store.get().v.a).toBe(7)
    expect(result).toHaveValue('70')
  })
})
