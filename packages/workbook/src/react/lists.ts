import { insertListRow } from '../core/navigation'
import type { UiState } from '../core/navigation'
import type { Address, WorkbookList } from '../core/types'
import type { Store } from '../store/create-store'
import { useStore } from './use-store'
import { useWorkbook } from './workbook-context'

// A list shown as rows (`items`), and what a person can do to it, for a
// button anywhere on the screen: a toolbar, a menu, a key. Adding moves focus
// to the new row. What a new item is, the definition says (`items(key,
// { create })`); where the buttons are, the view.
export type ListControls = {
  address: Address // `sheet/@list`
  label: string
  rowIds: readonly string[]
  canInsert: boolean
  canRemove: boolean
  append: () => void
  insertAbove: (rowId: string) => void
  insertBelow: (rowId: string) => void
  remove: (rowId: string) => void
}

export function listControls(
  ui: Store<UiState>,
  list: WorkbookList,
): ListControls {
  return {
    address: list.address,
    label: list.label,
    rowIds: list.rowIds,
    canInsert: list.canInsert,
    canRemove: list.canRemove,
    append: () => void insertListRow(ui, list),
    insertAbove: (rowId) => void insertListRow(ui, list, { before: rowId }),
    insertBelow: (rowId) => void insertListRow(ui, list, { after: rowId }),
    remove: list.remove,
  }
}

// The list at `sheet/@list`.
export function useList(address: Address): ListControls | undefined {
  const { wb, ui } = useWorkbook()
  const list = wb.list(address)
  return list && listControls(ui, list)
}

// The list whose row has focus, and that row: "add below", "delete this
// row". Undefined while focus is elsewhere (a total, an input).
export function useFocusedList():
  { list: ListControls; rowId: string } | undefined {
  const { wb, ui } = useWorkbook()
  const focused = useStore(ui, (s) => s.focused)
  const list = focused ? wb.listOf(focused) : undefined
  return list && focused
    ? { list: listControls(ui, list), rowId: focused.rowId }
    : undefined
}
