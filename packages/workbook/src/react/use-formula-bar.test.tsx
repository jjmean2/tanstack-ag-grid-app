import { act, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'

import { T } from '../core/cell-types'
import { createSession } from '../core/session'
import type { SavedExports } from '../core/types'
import { defineWorkbook } from '../core/workbook'
import {
  formulaCell,
  inputCell,
  items,
  labelCell,
  overrideOf,
  row,
} from '../index'
import { FormulaBar } from './formula-bar'
import { useExternalRefs, useFormulaBar } from './use-formula-bar'
import { WorkbookProvider } from './workbook-context'

type S = { list: { id: string; amount: number }[] }

const def = defineWorkbook<S>([
  {
    id: 's',
    title: '시트',
    columns: [
      { colId: 'name', headerName: '항목', type: T.text },
      { colId: 'amount', headerName: '금액', type: T.money },
    ],
    rows: [
      items('list'),
      row('in', {}, () => ({
        name: labelCell('입력'),
        amount: inputCell(5, () => {}),
      })),
      row('sum', {}, () => ({
        name: labelCell('합계'),
        amount: formulaCell('=SUM([@list/amount])+[in/amount]+[ext:other/v]'),
      })),
    ],
  },
])

const externals: SavedExports = {
  other: {
    screen: 'other',
    title: '다른 화면',
    savedAt: '2026-10-01T00:00:00.000Z',
    values: {
      v: {
        value: 100,
        text: '100',
        label: '원천 › 값',
        address: 'src/v/value',
      },
    },
  },
}

function setup(focus?: string) {
  const session = createSession(
    def,
    {
      list: [
        { id: 'a', amount: 1 },
        { id: 'b', amount: 2 },
      ],
    },
    { externals },
  )
  if (focus) {
    const [sheetId, rowId, colId] = focus.split('/')
    session.ui.set((s) => ({ ...s, focused: { sheetId, rowId, colId } }))
  }
  const openScreen = vi.fn()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <WorkbookProvider session={session} openScreen={openScreen}>
      {children}
    </WorkbookProvider>
  )
  return { session, openScreen, wrapper }
}

describe('useFormulaBar', () => {
  it('has no cell until one is focused', () => {
    const { wrapper } = setup()
    expect(renderHook(useFormulaBar, { wrapper }).result.current).toEqual({
      cell: undefined,
    })
  })

  it('splits the formula into text and resolved references', () => {
    const { wrapper } = setup('s/sum/amount')
    const bar = renderHook(useFormulaBar, { wrapper }).result.current
    if (!bar.cell) throw new Error('no cell')
    expect(bar).toMatchObject({
      label: '시트 › 합계 › 금액',
      source: 'formula',
      formula: '=SUM([@list/amount])+[in/amount]+[ext:other/v]',
      value: '108',
    })
    const refs = bar.parts.flatMap((p) => (p.ref ? [p.ref] : []))
    expect(refs).toMatchObject([
      { kind: 'group', address: 's/@list/amount', count: 2, missing: false },
      { kind: 'cell', address: 's/in/amount', value: '5', missing: false },
      {
        kind: 'external',
        address: 'ext:other/v',
        value: '100',
        savedAt: '2026-10-01T00:00:00.000Z',
        missing: false,
      },
    ])
    expect(bar.parts.map((p) => p.text).join('')).toBe(bar.formula)
  })

  it('follows a reference: focus in this workbook, or the other screen', () => {
    const { session, openScreen, wrapper } = setup('s/sum/amount')
    const bar = renderHook(useFormulaBar, { wrapper }).result.current
    if (!bar.cell) throw new Error('no cell')
    const [group, cell, ext] = bar.parts.flatMap((p) => (p.ref ? [p.ref] : []))
    act(() => cell.follow())
    expect(session.ui.get().pending?.targets).toEqual([
      { sheetId: 's', rowId: 'in', colId: 'amount' },
    ])
    act(() => group.follow())
    expect(session.ui.get().pending?.targets).toHaveLength(2)
    ext.follow()
    expect(openScreen).toHaveBeenCalledWith('other', 'src/v/value')
  })

  it('tells input values from fixed ones', () => {
    const input = renderHook(useFormulaBar, {
      wrapper: setup('s/in/amount').wrapper,
    })
    expect(input.result.current).toMatchObject({ source: 'input', parts: [] })
    const fixed = renderHook(useFormulaBar, {
      wrapper: setup('s/in/name').wrapper,
    })
    expect(fixed.result.current).toMatchObject({ source: 'fixed' })
  })
})

describe('useExternalRefs', () => {
  it('lists the other screens values with a way to open them', () => {
    const { openScreen, wrapper } = setup()
    const [ref] = renderHook(useExternalRefs, { wrapper }).result.current
    expect(ref).toMatchObject({
      address: 'ext:other/v',
      screen: 'other',
      value: { text: '100', error: false },
    })
    ref.open()
    expect(openScreen).toHaveBeenCalledWith('other', 'src/v/value')
  })
})

describe('FormulaBar', () => {
  it('takes other words', async () => {
    const { wrapper: Wrapper } = setup()
    render(
      <Wrapper>
        <FormulaBar texts={{ noCell: 'No cell', raw: 'Raw' }} />
      </Wrapper>,
    )
    expect(screen.getByText('No cell')).toBeInTheDocument()
    await userEvent.click(screen.getByLabelText('Raw'))
    expect(screen.getByLabelText('Raw')).toBeChecked()
  })
})

describe('useFormulaBar on an overridable formula', () => {
  type O = { overrides: { v?: number } }
  const odef = defineWorkbook<O>([
    {
      id: 'o',
      title: '덮어쓰기',
      columns: [{ colId: 'v', headerName: '값', type: T.money }],
      rows: [
        row('r', {}, (ctx) => ({
          v: formulaCell('=1+2', {
            override: overrideOf(ctx, 'overrides', 'v'),
          }),
        })),
      ],
    },
  ])

  function osetup(overrides: O['overrides']) {
    const session = createSession(odef, { overrides })
    session.ui.set((s) => ({
      ...s,
      focused: { sheetId: 'o', rowId: 'r', colId: 'v' },
    }))
    const wrapper = ({ children }: { children: ReactNode }) => (
      <WorkbookProvider session={session}>{children}</WorkbookProvider>
    )
    return { session, wrapper }
  }

  it('is a formula until overridden', () => {
    const bar = renderHook(useFormulaBar, { wrapper: osetup({}).wrapper })
      .result.current
    expect(bar).toMatchObject({
      source: 'formula',
      overridable: true,
      value: '3',
    })
    if (bar.cell) expect(bar.revert).toBeUndefined()
  })

  it("shows the person's value, the formula result, and goes back", async () => {
    const { session, wrapper: Wrapper } = osetup({ v: 10 })
    const bar = renderHook(useFormulaBar, { wrapper: Wrapper }).result.current
    expect(bar).toMatchObject({
      source: 'override',
      value: '10',
      computed: '3',
    })

    render(
      <Wrapper>
        <FormulaBar />
      </Wrapper>,
    )
    expect(screen.getByText('수동 입력 · 수식 결과 3')).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: '수식으로 되돌리기' }),
    )
    expect(session.store.get().overrides).toEqual({})
    expect(screen.getByText('= 3')).toBeInTheDocument()
  })
})
