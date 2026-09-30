import type {
  DefaultMenuItem,
  GetContextMenuItemsParams,
  MenuItemDef,
} from 'ag-grid-community'

import type { Row } from '../core/types'
import type { ListControls } from '../react/lists'

// The words the grid adds to AG Grid's menus; pass some to `defineCellViews`.
export const gridTexts = {
  revertToFormula: '수식으로 되돌리기',
  insertAbove: '위에 행 추가',
  insertBelow: '아래에 행 추가',
  removeRow: '행 삭제',
}
export type GridTexts = typeof gridTexts

// The cell context menu (AG Grid Enterprise, ContextMenuModule): AG Grid's
// items, preceded by ours: "back to the formula" on a formula cell showing a
// person's value; adding and removing rows on a row of a list (`listOf` gives
// the list a row belongs to).
export function contextMenuItems(
  params: GetContextMenuItemsParams<Row>,
  texts: GridTexts,
  listOf: (rowId: string) => ListControls | undefined = () => undefined,
): (DefaultMenuItem | MenuItemDef<Row>)[] {
  const defaults = params.defaultItems ?? []
  const row = params.node?.data
  const colId = params.column?.getColId()
  const override = colId ? row?.cells[colId]?.override : undefined
  const list = row ? listOf(row.id) : undefined

  const ours: MenuItemDef<Row>[][] = []
  if (override?.active)
    ours.push([{ name: texts.revertToFormula, action: override.revert }])
  if (row && list && (list.canInsert || list.canRemove)) {
    const id = row.id
    ours.push([
      ...(list.canInsert
        ? [
            { name: texts.insertAbove, action: () => list.insertAbove(id) },
            { name: texts.insertBelow, action: () => list.insertBelow(id) },
          ]
        : []),
      ...(list.canRemove
        ? [{ name: texts.removeRow, action: () => list.remove(id) }]
        : []),
    ])
  }
  const groups: (DefaultMenuItem | MenuItemDef<Row>)[][] = [...ours]
  if (defaults.length > 0) groups.push(defaults)
  return groups.flatMap((group, i) =>
    i === 0 ? group : ['separator' as const, ...group],
  )
}
