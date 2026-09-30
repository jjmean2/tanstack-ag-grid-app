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
