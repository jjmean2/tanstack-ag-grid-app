import { createStore } from '../store/create-store'
import type { Store } from '../store/create-store'
import type { Address, CellRef, Workbook, WorkbookList } from './types'

// UI state shared by the views and the formula bar. Tabs and pages are the
// app's: to show a target that is not mounted, the app watches `pending` and
// brings the view that shows its sheet (see the app's ScreenLayout).
export type UiState = {
  focused: CellRef | null // the cell that has focus, in any view
  // A request to move focus to cells, consumed by the view that shows them
  // (which may mount only after the app switched to it).
  pending: { targets: CellRef[]; nonce: number } | null
}

export const createUiStore = (): Store<UiState> =>
  createStore<UiState>({ focused: null, pending: null })

// Takes a navigation request for handling. The same cell may be shown by more
// than one view (a grid and an input): only the first to claim it moves focus.
export function claimPending(ui: Store<UiState>, nonce: number): boolean {
  if (ui.get().pending?.nonce !== nonce) return false
  ui.set((s) => ({ ...s, pending: null }))
  return true
}

// Reports the focused cell (from a grid or an input) to the formula bar.
export function reportFocus(ui: Store<UiState>, ref: CellRef) {
  ui.set((s) =>
    s.focused?.sheetId === ref.sheetId &&
    s.focused.rowId === ref.rowId &&
    s.focused.colId === ref.colId
      ? s
      : { ...s, focused: ref },
  )
}

let counter = 0

// Posts a request to move focus to cells; the view showing them takes it.
export function requestFocus(ui: Store<UiState>, targets: CellRef[]) {
  if (targets.length === 0) return
  counter += 1
  const nonce = counter
  ui.set((s) => ({ ...s, pending: { targets, nonce } }))
}

// Moves focus to a cell, or to the first cell of a list (the grid highlights
// all of them).
export function navigate(
  ui: Store<UiState>,
  workbook: Workbook,
  address: Address,
) {
  requestFocus(ui, workbook.targets(address))
}

// Adds a row to a list (at the end, or next to a row) and moves focus to it,
// so a person can type into it at once. The view takes the request once the
// rebuilt workbook shows the row.
export function insertListRow(
  ui: Store<UiState>,
  list: WorkbookList,
  at?: { before?: string; after?: string },
) {
  const target = list.insert(at)
  if (target) requestFocus(ui, [target])
  return target
}
