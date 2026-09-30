import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'

import { T } from './cell-types'
import { checkWorkbook } from './check'
import { formulaCell, items, labelCell, row } from './layout'
import type { SheetColumnDef } from './types'
import { defineWorkbook } from './workbook'
import { WorkbookErrorBoundary } from './workbook-error-boundary'

type S = { list: { id: string }[] }

const columns: SheetColumnDef[] = [
  { colId: 'label', headerName: '항목', type: T.text },
  { colId: 'value', headerName: '값', type: T.money },
]

const def = defineWorkbook<S>([
  {
    id: 's',
    title: 's',
    tab: 's',
    columns,
    layout: [
      items('list'),
      // A fixed row whose id collides with an item id `x`.
      row('x', {}, () => ({ label: labelCell('x') })),
      row('bad', {}, () => ({ value: formulaCell('=[nowhere/value]') })),
    ],
  },
])

describe('checkWorkbook', () => {
  it('reports errors that only some data causes, per sample', () => {
    expect(
      checkWorkbook(def, {
        empty: { list: [] },
        clash: { list: [{ id: 'x' }] },
      }),
    ).toEqual([
      'empty: s/bad/value #REF! (#REF! s/nowhere/value)',
      'clash: Duplicate row id "x" in sheet "s"',
    ])
  })
})

describe('WorkbookErrorBoundary', () => {
  it('shows the error in place of the screen and can retry', async () => {
    let broken = true
    function Screen() {
      if (broken) throw new Error('Unknown column "zz"')
      return <p>screen</p>
    }
    function Harness() {
      const [, rerender] = useState(0)
      return (
        <>
          <button type="button" onClick={() => rerender((n) => n + 1)}>
            again
          </button>
          <WorkbookErrorBoundary>
            <Screen />
          </WorkbookErrorBoundary>
        </>
      )
    }
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<Harness />)
    expect(screen.getByRole('alert')).toHaveTextContent('Unknown column "zz"')

    broken = false
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(screen.getByText('screen')).toBeInTheDocument()
  })
})
