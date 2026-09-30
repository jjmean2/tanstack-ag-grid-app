import type { GetContextMenuItemsParams } from 'ag-grid-community'

import { T } from '../core/cell-types'
import type { Cell, Row } from '../core/types'
import { contextMenuItems, gridTexts } from './context-menu'

const cell = (override?: Cell['override']): Cell => ({
  address: 's/r/v',
  sheetId: 's',
  rowId: 'r',
  colId: 'v',
  type: T.money,
  source: { kind: 'formula', formula: '=1' },
  value: 1,
  tags: [],
  rowTags: [],
  override,
})

const params = (c: Cell) =>
  ({
    defaultItems: ['copy', 'paste'],
    column: { getColId: () => 'v' },
    node: { data: { id: 'r', tags: [], cells: { v: c } } satisfies Row },
  }) as unknown as GetContextMenuItemsParams<Row>

describe('context menu', () => {
  it('offers going back to the formula on an overridden cell', () => {
    const revert = vi.fn()
    const items = contextMenuItems(
      params(cell({ active: true, revert })),
      gridTexts,
    )
    expect(items).toEqual([
      { name: '수식으로 되돌리기', action: revert },
      'separator',
      'copy',
      'paste',
    ])
  })

  it("keeps AG Grid's items elsewhere", () => {
    expect(
      contextMenuItems(
        params(cell({ active: false, revert: vi.fn() })),
        gridTexts,
      ),
    ).toEqual(['copy', 'paste'])
    expect(contextMenuItems(params(cell()), gridTexts)).toEqual([
      'copy',
      'paste',
    ])
  })
})

describe('context menu on a list row', () => {
  const list = {
    address: 's/@list',
    label: '목록',
    rowIds: ['r'],
    canInsert: true,
    canRemove: true,
    append: vi.fn(),
    insertAbove: vi.fn(),
    insertBelow: vi.fn(),
    remove: vi.fn(),
  }

  it('adds above or below the row and removes it', () => {
    const items = contextMenuItems(params(cell()), gridTexts, () => list)
    expect(items.map((i) => (typeof i === 'string' ? i : i.name))).toEqual([
      '위에 행 추가',
      '아래에 행 추가',
      '행 삭제',
      'separator',
      'copy',
      'paste',
    ])
    const [above, below, remove] = items as unknown as { action: () => void }[]
    above.action()
    below.action()
    remove.action()
    expect(list.insertAbove).toHaveBeenCalledWith('r')
    expect(list.insertBelow).toHaveBeenCalledWith('r')
    expect(list.remove).toHaveBeenCalledWith('r')
  })

  it('offers only removing when the list cannot make items', () => {
    const items = contextMenuItems(params(cell()), gridTexts, () => ({
      ...list,
      canInsert: false,
    }))
    expect(items.map((i) => (typeof i === 'string' ? i : i.name))).toEqual([
      '행 삭제',
      'separator',
      'copy',
      'paste',
    ])
  })
})
