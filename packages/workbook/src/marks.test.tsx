import { render, screen } from '@testing-library/react'
import type { ColDef, CellClassParams } from 'ag-grid-community'

import { createGridColumns } from './ag-grid/columns'
import { rowMarks } from './core/marks'
import { defaultPresenter } from './core/presentation'
import {
  buildWorkbook,
  createSession,
  defineWorkbook,
  formulaCell,
  inputCell,
  labelCell,
  row,
  T,
} from './index'
import type { Row, ColumnDef } from './index'
import {
  CellInput,
  cellBox,
  FormSheet,
  textBox,
  WorkbookProvider,
} from './react'

type S = { amount: number }

const columns: ColumnDef[] = [
  { colId: 'label', headerName: '항목', type: T.text },
  { colId: 'value', headerName: '값', type: T.money },
]

const def = defineWorkbook<S>([
  {
    id: 'g',
    title: 'grid',
    columns,
    rows: [
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
    id: 'f',
    title: 'form',
    columns: [{ colId: 'y', headerName: 'y', type: T.money }],
    rows: [row('x', {}, () => ({ y: formulaCell('=[g/amount/value]*2') }))],
  },
])

const form = (
  <FormSheet
    sheet="f"
    tracks={['1fr', '1fr']}
    boxes={[textBox([1, 1], '합계', 'head'), cellBox([1, 2], 'x/y', 'strong')]}
  />
)
const session = () => createSession(def, { amount: 100 })

describe('marks', () => {
  const wb = buildWorkbook(def, { amount: 100 })
  const amount = wb.cell('g/amount/value')!

  it('say what a cell is: type, source, tags (its row’s and its own), then editable and alignment', () => {
    expect(defaultPresenter(amount).marks).toEqual([
      'wb-cell',
      'wb-type-money',
      'wb-source-value',
      'wb-tag-subtotal',
      'wb-tag-input',
      'wb-editable',
      'wb-align-right',
    ])
  })

  it('choose value-dependent tags after evaluation', () => {
    expect(wb.cell('g/check/value')?.tags).toEqual(['pass'])
    const failing = buildWorkbook(def, { amount: 99 })
    expect(failing.cell('g/check/value')?.tags).toEqual(['fail'])
  })

  it('go on grid rows too', () => {
    expect(rowMarks(wb.sheets.g!.rows[0])).toEqual([
      'wb-row',
      'wb-tag-subtotal',
    ])
  })

  it('are the same on a grid cell and on an input', () => {
    const [, value] = createGridColumns(columns) as ColDef<Row>[]
    const cellClass = value.cellClass as (p: CellClassParams<Row>) => string[]
    const gridMarks = cellClass({
      data: wb.sheets.g!.rows[0],
    } as CellClassParams<Row>)

    render(
      <WorkbookProvider session={session()}>
        <CellInput address="g/amount/value" />
        {form}
      </WorkbookProvider>,
    )
    const input = screen.getAllByRole('textbox')[0]
    for (const mark of gridMarks) expect(input).toHaveClass(mark)
    expect(input).toHaveClass('wb-input', 'wb-input-field')
  })

  it('put a form box’s tags on the box and the cell’s marks on its input', () => {
    render(<WorkbookProvider session={session()}>{form}</WorkbookProvider>)
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
