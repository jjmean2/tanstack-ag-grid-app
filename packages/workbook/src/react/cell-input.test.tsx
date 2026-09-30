import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { T } from '../core/cell-types'
import { CellInput } from './cell-input'
import { fields, formulaCell, labelCell, row } from '../index'
import { navigate } from '../core/navigation'
import { createSession } from '../core/session'
import type { ColumnDef, Workbook } from '../core/types'
import { defineWorkbook } from '../core/workbook'
import { useWorkbook, WorkbookProvider } from './workbook-context'

type S = { basic: { name: string; year: number } }

const columns: ColumnDef[] = [
  { colId: 'label', headerName: '항목', type: T.text },
  { colId: 'value', headerName: '값', type: T.text },
]

const def = defineWorkbook<S>([
  {
    id: 'form',
    title: '양식',
    columns,
    rows: [
      fields('basic', {
        name: '이름',
        year: { label: '연도', type: T.integer },
      }),
      row('next', {}, () => ({
        label: labelCell('다음 연도'),
        value: formulaCell('=[basic.year/value]+1', { type: T.integer }),
      })),
    ],
  },
])

function setup() {
  const session = createSession(def, { basic: { name: '가', year: 2025 } })
  const { store, ui } = session
  let wb!: Workbook
  function Probe() {
    wb = useWorkbook().wb
    return null
  }
  render(
    <WorkbookProvider session={session}>
      <CellInput address="form/basic.name/value" />
      <CellInput address="form/basic.year/value" />
      <CellInput address="form/next/value" />
      <Probe />
    </WorkbookProvider>,
  )
  const [name, year, next] = screen.getAllByRole('textbox')
  return { store, ui, name, year, next, wb: () => wb }
}

describe('CellInput', () => {
  it('commits a parsed value on Enter and formulas follow', async () => {
    const { store, year, next } = setup()
    await userEvent.click(year)
    await userEvent.clear(year)
    await userEvent.type(year, '2030{Enter}')
    expect(store.get().basic.year).toBe(2030)
    expect(next).toHaveValue('2,031')
  })

  it('selects the editable text on focus, so typing replaces it', async () => {
    const { store, year } = setup()
    await userEvent.click(year)
    expect(year).toHaveValue('2025') // no grouping separator while editing
    await userEvent.keyboard('2031{Enter}')
    expect(store.get().basic.year).toBe(2031)
  })

  it('rejects input the cell type cannot parse and keeps the value', async () => {
    const { store, year } = setup()
    await userEvent.click(year)
    await userEvent.clear(year)
    await userEvent.type(year, 'abc{Enter}')
    expect(year).toHaveAttribute('aria-invalid', 'true')
    await userEvent.tab() // blur drops the rejected draft
    expect(store.get().basic.year).toBe(2025)
    expect(year).toHaveValue('2,025')
  })

  it('drops the draft on Escape', async () => {
    const { store, name } = setup()
    await userEvent.click(name)
    await userEvent.type(name, '나{Escape}')
    await userEvent.tab()
    expect(store.get().basic.name).toBe('가')
  })

  it('shows a formula cell read-only', () => {
    const { next } = setup()
    expect(next).toHaveAttribute('readonly')
    expect(next).toHaveValue('2,026')
  })

  it('reports focus for the formula bar', async () => {
    const { ui, next } = setup()
    await userEvent.click(next)
    expect(ui.get().focused).toEqual({
      sheetId: 'form',
      rowId: 'next',
      colId: 'value',
    })
  })

  it('takes focus when a reference to it is followed', () => {
    const { ui, year, wb } = setup()
    act(() => navigate(ui, wb(), 'form/basic.year/value'))
    expect(year).toHaveFocus()
    expect(ui.get().pending).toBeNull()
  })
})
