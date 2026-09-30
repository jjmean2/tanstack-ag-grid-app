import { createStore } from '../store/create-store'
import type { Store } from '../store/create-store'
import type { Address, CellRef, Workbook } from './types'

// UI state shared by the tabs, the grids and the formula bar.
export type UiState = {
  tab: string
  focused: CellRef | null // the cell that has focus, in any grid
  // A request to move focus to cells, consumed by the grid that shows them
  // (which may first have to be mounted by switching tabs).
  pending: { targets: CellRef[]; nonce: number } | null
}

export const createUiStore = (tab: string): Store<UiState> =>
  createStore<UiState>({ tab, focused: null, pending: null })

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

// Moves focus to a cell, or to the first cell of a list (the grid highlights
// all of them). Switches tab first when the target sheet is on another tab.
export function navigate(
  ui: Store<UiState>,
  workbook: Workbook,
  address: Address,
) {
  const targets = workbook.targets(address)
  if (targets.length === 0) return
  counter += 1
  const nonce = counter
  ui.set((s) => ({
    ...s,
    tab: workbook.tabOf(targets[0].sheetId) ?? s.tab,
    pending: { targets, nonce },
  }))
}
