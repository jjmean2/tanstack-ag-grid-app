import type {
  DefaultMenuItem,
  GetContextMenuItemsParams,
  MenuItemDef,
} from 'ag-grid-community'

import type { Row } from '../core/types'

// The words the grid adds to AG Grid's menus; pass some to `defineCellViews`.
export const gridTexts = {
  revertToFormula: '수식으로 되돌리기',
}
export type GridTexts = typeof gridTexts

// The cell context menu (AG Grid Enterprise, ContextMenuModule): AG Grid's
// items, preceded by "back to the formula" on a formula cell showing a
// person's value.
export function contextMenuItems(
  params: GetContextMenuItemsParams<Row>,
  texts: GridTexts,
): (DefaultMenuItem | MenuItemDef<Row>)[] {
  const defaults = params.defaultItems ?? []
  const colId = params.column?.getColId()
  const override = colId ? params.node?.data?.cells[colId]?.override : undefined
  if (!override?.active) return defaults
  return [
    { name: texts.revertToFormula, action: override.revert },
    ...(defaults.length > 0 ? ['separator' as const, ...defaults] : []),
  ]
}
