import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type {
  CellClassParams,
  CellEditorSelectorFunc,
  CellRendererSelectorFunc,
  ColDef,
  EditableCallback,
} from 'ag-grid-community'

import { createGridColumns } from './ag-grid/columns'
import { defineCellViews } from './ag-grid/views'
import { defaultPresenter, definePresentation } from './core/presentation'
import {
  buildWorkbook,
  createSession,
  defineWorkbook,
  fields,
  formulaCell,
  labelCell,
  row,
  T,
} from './index'
import type { Row, ColumnDef } from './index'
import { CellInput, defineInputViews, WorkbookProvider } from './react'
import type { CellViews, InputEditor } from './react'

type S = {
  info: { amount: number; start: string; note: string }
}
const state: S = { info: { amount: -5, start: '2026-01-01', note: '' } }

const columns: ColumnDef[] = [
  { colId: 'label', headerName: '항목', type: T.text },
  { colId: 'value', headerName: '값', type: T.money },
]

const def = defineWorkbook<S>([
  {
    id: 's',
    title: 's',
    columns,
    rows: [
      fields('info', {
        amount: '금액',
        start: { label: '시작일', type: T.date },
        note: { label: '메모', type: T.text },
      }),
      row('sum', { tags: 'total' }, () => ({
        label: labelCell('합계'),
        value: formulaCell('=[info.amount/value]*2'),
      })),
    ],
  },
])

const wb = buildWorkbook(def, state)
const amount = wb.cell('s/info.amount/value')!
const start = wb.cell('s/info.start/value')!
const note = wb.cell('s/info.note/value')!
const sum = wb.cell('s/sum/value')!

describe('default presentation', () => {
  it('uses the type’s editor and alignment when the cell can be written', () => {
    expect(defaultPresenter(amount)).toMatchObject({
      editor: 'number',
      display: 'text',
      align: 'right',
    })
    expect(defaultPresenter(start).editor).toBe('date')
  })

  it('shows formula cells read-only', () => {
    expect(defaultPresenter(sum).editor).toBeNull()
    expect(defaultPresenter(sum).marks).not.toContain('wb-editable')
  })

  it('computes a cell once', () => {
    expect(defaultPresenter(amount)).toBe(defaultPresenter(amount))
  })
})

describe('presentation rules', () => {
  const present = definePresentation([
    // An app's editor id; views that do not know it fall back to text.
    {
      when: (f) => f.type === 'text' && f.writable,
      then: { editor: 'memo' },
    },
    // Value-dependent: a mark the theme styles.
    {
      when: (f) => typeof f.value === 'number' && f.value < 0,
      then: { marks: ['wb-negative'] },
    },
    // Later rules win for fields; marks add up.
    {
      when: (f) => f.tags.includes('total'),
      then: (current) => ({
        align: 'center',
        marks: [...(current.editor ? [] : ['wb-locked'])],
      }),
    },
    // A rule cannot make a formula cell editable.
    { when: (f) => f.formula, then: { editor: 'text' } },
    // It can make a writable cell read-only.
    { when: (f) => f.type === 'date', then: { editor: null } },
  ])

  it('choose editors, alignment and marks', () => {
    expect(present(note).editor).toBe('memo')
    expect(present(amount).marks).toContain('wb-negative')
    expect(present(sum)).toMatchObject({ align: 'center', editor: null })
    expect(present(sum).marks).toEqual(
      expect.arrayContaining(['wb-align-center', 'wb-locked', 'wb-tag-total']),
    )
  })

  it('never make a cell writable, but may make it read-only', () => {
    expect(present(sum).editor).toBeNull()
    expect(present(start).editor).toBeNull()
    expect(present(start).marks).not.toContain('wb-editable')
  })

  it('reach the grid through the editor and display registries', () => {
    const custom = definePresentation([
      { when: (f) => f.type === 'money', then: { display: 'badge' } },
    ])
    const Badge = () => null
    const [, value] = createGridColumns(columns, {
      present: custom,
      displays: { badge: Badge },
    }) as ColDef<Row>[]
    const params = (rowId: string) =>
      ({ data: wb.sheets.s!.rows.find((r) => r.id === rowId) }) as never
    const editorOf = value.cellEditorSelector as CellEditorSelectorFunc
    const rendererOf = value.cellRendererSelector as CellRendererSelectorFunc
    const editable = value.editable as EditableCallback
    const classOf = value.cellClass as (p: CellClassParams) => string[]

    expect(editorOf(params('info.start'))?.component).toBe(
      'agDateStringCellEditor',
    )
    expect(editorOf(params('info.amount'))?.component).toBe(
      'agNumberCellEditor',
    )
    expect(rendererOf(params('info.amount'))?.component).toBe(Badge)
    expect(editable(params('sum'))).toBe(false)
    expect(classOf(params('info.amount'))).toContain('wb-editable')
  })
})

describe('CellInput and the presentation', () => {
  const renderInputs = (views?: CellViews) => {
    const session = createSession(def, state)
    render(
      <WorkbookProvider session={session} views={views}>
        <CellInput address="s/info.start/value" />
        <CellInput address="s/info.amount/value" />
      </WorkbookProvider>,
    )
    return session.store
  }

  it('offers a date picker for the date editor and commits its value', async () => {
    const store = renderInputs()
    const date = screen.getByDisplayValue('2026-01-01')
    expect(date).toHaveAttribute('type', 'date')
    await userEvent.clear(date)
    await userEvent.type(date, '2026-03-15')
    expect(store.get().info.start).toBe('2026-03-15')
  })

  it('draws an app editor id with the component registered for it', () => {
    const Memo: InputEditor = ({ text, control }) => (
      <textarea
        data-testid="memo"
        data-cell={control['data-cell']}
        defaultValue={text}
      />
    )
    render(
      <WorkbookProvider
        session={createSession(def, state)}
        views={defineInputViews({
          editors: { memo: Memo },
          rules: [{ when: (f) => f.type === 'text', then: { editor: 'memo' } }],
        })}
      >
        <CellInput address="s/info.note/value" />
        <CellInput address="s/info.amount/value" />
      </WorkbookProvider>,
    )
    expect(screen.getByTestId('memo')).toHaveAttribute(
      'data-cell',
      's/info.note/value',
    )
    // Other cells keep the built-in editors.
    expect(screen.getByDisplayValue('-5').tagName).toBe('INPUT')
  })

  it('follows rules that make a cell read-only', () => {
    renderInputs(
      defineInputViews({
        rules: [{ when: (f) => f.type === 'money', then: { editor: null } }],
      }),
    )
    const input = screen.getByDisplayValue('-5')
    expect(input).toHaveAttribute('readonly')
    expect(input).not.toHaveClass('wb-editable')
  })
})

describe('defineCellViews', () => {
  const Input: InputEditor = () => null
  const grid = { component: 'agTextCellEditor' }

  it('builds grid and input registries from one list of editors', () => {
    const views = defineCellViews({
      editors: { year: { grid, input: Input } },
      rules: [{ when: (f) => f.type === 'year', then: { editor: 'year' } }],
    })
    expect(views.input.year).toBe(Input)
    expect(views.input.date).toBeDefined() // defaults kept
  })

  it('makes a missing component or an unknown id a type error', () => {
    defineCellViews({
      // @ts-expect-error an editor needs a component for every view
      editors: { year: { grid } },
    })
    defineCellViews({
      editors: { year: { grid, input: Input } },
      // @ts-expect-error 'yaer' is neither built in nor registered
      rules: [{ when: () => true, then: { editor: 'yaer' } }],
    })
    expect(true).toBe(true)
  })
})
