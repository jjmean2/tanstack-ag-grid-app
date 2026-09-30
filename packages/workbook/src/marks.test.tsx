import { render, screen } from '@testing-library/react'
import type { ColDef, CellClassParams } from 'ag-grid-community'

import { createGridColumns } from './ag-grid/columns'
import {
  buildWorkbook,
  cellBox,
  cellMarks,
  createStore,
  createUiStore,
  defineWorkbook,
  formulaCell,
  inputCell,
  labelCell,
  row,
  rowMarks,
  T,
  textBox,
} from './index'
import type { ResolvedRow, SheetColumnDef } from './index'
import { CellInput, FormSheet, WorkbookProvider } from './react'

type S = { amount: number }

const columns: SheetColumnDef[] = [
  { colId: 'label', headerName: '항목', type: T.text },
  { colId: 'value', headerName: '값', type: T.money },
]

const def = defineWorkbook<S>([
  {
    id: 'g',
    title: 'grid',
    tab: 't',
    columns,
    layout: [
      row('amount', { tags: 'subtotal' }, (ctx) => ({
        label: labelCell('금액'),
        value: inputCell(ctx.state.amount, () => {}, { tags: 'input' }),
      })),
      row('check', {}, () => ({
        value: formulaCell('=[amount/value]-100', {
          tags: ({ value }) => (value === 0 ? 'pass' : 'fail'),
        }),
      })),
    ],
  },
  {
    kind: 'form',
    id: 'f',
    title: 'form',
    tab: 't',
    tracks: ['1fr', '1fr'],
    layout: [
      () => [
        textBox([1, 1], '합계', 'head'),
        cellBox(
          [1, 2],
          'x/y',
          formulaCell('=[g/amount/value]*2', { type: T.money }),
          {
            tags: 'strong',
          },
        ),
      ],
    ],
  },
])

const noop = () => {}

describe('marks', () => {
  const wb = buildWorkbook(def, { amount: 100 }, noop)
  const amount = wb.cell('g/amount/value')!

  it('say what a cell is: type, source, editable, and its and its row’s tags', () => {
    expect(cellMarks(amount)).toEqual([
      'wb-cell',
      'wb-type-money',
      'wb-source-value',
      'wb-editable',
      'wb-align-right',
      'wb-tag-subtotal',
      'wb-tag-input',
    ])
  })

  it('choose value-dependent tags after evaluation', () => {
    expect(wb.cell('g/check/value')?.tags).toEqual(['pass'])
    const failing = buildWorkbook(def, { amount: 99 }, noop)
    expect(failing.cell('g/check/value')?.tags).toEqual(['fail'])
  })

  it('go on grid rows too', () => {
    expect(rowMarks(wb.sheets.g!.rows[0])).toEqual([
      'wb-row',
      'wb-tag-subtotal',
    ])
  })

  it('are the same on a grid cell and on an input', () => {
    const [, value] = createGridColumns(columns) as ColDef<ResolvedRow>[]
    const cellClass = value.cellClass as (
      p: CellClassParams<ResolvedRow>,
    ) => string[]
    const gridMarks = cellClass({
      data: wb.sheets.g!.rows[0],
    } as CellClassParams<ResolvedRow>)

    render(
      <WorkbookProvider
        store={createStore({ amount: 100 })}
        def={def}
        ui={createUiStore('t')}
      >
        <CellInput address="g/amount/value" />
        <FormSheet sheetId="f" />
      </WorkbookProvider>,
    )
    const input = screen.getAllByRole('textbox')[0]
    for (const mark of gridMarks) expect(input).toHaveClass(mark)
    expect(input).toHaveClass('wb-input', 'wb-input-field')
  })

  it('put a form box’s tags on the box and the cell’s marks on its input', () => {
    render(
      <WorkbookProvider
        store={createStore({ amount: 100 })}
        def={def}
        ui={createUiStore('t')}
      >
        <FormSheet sheetId="f" />
      </WorkbookProvider>,
    )
    expect(screen.getByText('합계')).toHaveClass(
      'wb-box',
      'wb-box-text',
      'wb-tag-head',
    )
    const input = screen.getByRole('textbox')
    expect(input).toHaveClass(
      'wb-input-form',
      'wb-source-formula',
      'wb-type-money',
    )
    expect(input.parentElement).toHaveClass('wb-box-cell', 'wb-tag-strong')
  })
})
