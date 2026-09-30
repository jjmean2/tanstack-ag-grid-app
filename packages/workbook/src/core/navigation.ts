import { createStore } from '../store/create-store'
import type { Store } from '../store/create-store'
import type { Address, CellRef, Workbook, WorkbookList } from './types'

// UI state shared by the views and the formula bar. Tabs and pages are the
// app's: to show a target that is not mounted, the app watches `pending` and
// brings the view that shows its sheet (see the app's ScreenLayout).
export type UiState = {
  focused: CellRef | null // the cell that has focus, in any view
  // A request to move focus to cells, consumed by the view that shows them
  // (which may mount only after the app switched to it). `flash` draws the
  // eye to them (following a reference); `waitFor` is a row the view must
  // show before it moves focus (a row just added, which shifts the others).
  pending: {
    targets: CellRef[]
    nonce: number
    flash: boolean
    waitFor?: string
  } | null
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
export function requestFocus(
  ui: Store<UiState>,
  targets: CellRef[],
  { flash = true, waitFor }: { flash?: boolean; waitFor?: string } = {},
) {
  if (targets.length === 0) return
  counter += 1
  const nonce = counter
  ui.set((s) => ({ ...s, pending: { targets, nonce, flash, waitFor } }))
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

// Where focus goes when a row is added:
//   'new'   to the new row, to type into it: in the column focus was in if a
//           person types into it there, else the first one they do
//   'keep'  stays on the focused cell, as a spreadsheet does when a row is
//           inserted: the cell (not the position) keeps focus, so inserting
//           above does not leave focus on the new row, and a toolbar button
//           hands focus back to the grid
export type InsertFocus = 'new' | 'keep'

// Adds a row to a list (at the end, or next to a row) and moves focus as
// asked. The view takes the request once it shows the new row (the rows
// after it have moved by then).
export function insertListRow(
  ui: Store<UiState>,
  list: WorkbookList,
  at?: { before?: string; after?: string },
  { focus = 'new' }: { focus?: InsertFocus } = {},
): CellRef | undefined {
  const { focused } = ui.get()
  const here = focused?.sheetId === list.sheetId ? focused : null
  const target = list.insert(at, here?.colId)
  if (!target) return target
  const to = focus === 'keep' ? here : target
  if (to) requestFocus(ui, [to], { flash: false, waitFor: target.rowId })
  return target
}
