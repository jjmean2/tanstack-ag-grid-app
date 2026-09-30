import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
  boundCell,
  buildWorkbook,
  createSession,
  defineWorkbook,
  formulaCell,
  row,
  T,
} from '../index'
import {
  cellBox,
  checkBoxes,
  FormSheet,
  textBox,
  WorkbookProvider,
} from './index'

type S = { v: { a: number } }
const state: S = { v: { a: 2 } }

// The cells: rows × columns, like any sheet. Row labels name them.
const def = defineWorkbook<S>([
  {
    id: 'f',
    title: '서식',
    columns: [{ colId: 'v', headerName: '금액', type: T.money }],
    rows: [
      row('a', { label: '입력' }, (ctx) => ({ v: boundCell(ctx, 'v', 'a') })),
      row('b', { label: '결과' }, () => ({ v: formulaCell('=[a/v]*10') })),
    ],
  },
])

// The layout: the view's. "금액" is merged down two rows.
// ┌──────┬──────┐
// │ 금액 │  a   │
// │      ├──────┤
// │      │ a×10 │
// └──────┴──────┘
const boxes = [
  textBox([1, 1, 2, 1], '금액', 'head'),
  cellBox([1, 2], 'a/v'),
  cellBox([2, 2], 'b/v'),
]

describe('form sheet cells', () => {
  it('are ordinary cells, named by row label and column', () => {
    const wb = buildWorkbook(def, state)
    expect(wb.value('f/b/v')).toBe(20)
    expect(wb.labelOf('f/b/v')).toBe('서식 › 결과 › 금액')
  })
})

describe('checkBoxes', () => {
  it('accepts a layout without overlaps', () => {
    expect(checkBoxes(2, boxes)).toEqual([])
  })

  it('reports overlapping boxes, boxes outside the columns, bad refs', () => {
    expect(
      checkBoxes(3, [
        textBox([1, 1, 2, 2], 'A'),
        textBox([2, 2], 'B'),
        textBox([1, 2, 1, 3], 'C'),
        cellBox([3, 1], 'a'),
      ]),
    ).toEqual([
      'text "B" overlaps text "A"',
      'text "C" is outside the 3 columns',
      'cell "a": a cell is "row/col"',
    ])
  })
})

describe('FormSheet', () => {
  it('places boxes on a grid and edits cells in place', async () => {
    const session = createSession(def, state)
    render(
      <WorkbookProvider session={session}>
        <FormSheet sheet="f" tracks={['1fr', '1fr']} boxes={boxes} />
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
    expect(session.store.get().v.a).toBe(7)
    expect(result).toHaveValue('70')
  })

  it('refuses a layout with problems', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() =>
      render(
        <WorkbookProvider session={createSession(def, state)}>
          <FormSheet
            sheet="f"
            tracks={['1fr']}
            boxes={[textBox([1, 1, 1, 2], 'wide')]}
          />
        </WorkbookProvider>,
      ),
    ).toThrow(/outside the 1 columns/)
  })
})
