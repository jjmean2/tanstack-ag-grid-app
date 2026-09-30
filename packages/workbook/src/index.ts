// @lab/workbook — the core. Framework-free: nothing here imports React or
// AG Grid, so a workbook can be defined, built and tested anywhere.
//
//   defineWorkbook ─▶ createSession(def, initial) ─▶ buildWorkbook (per state)
//   sheets of columns and row nodes         state + UI stores       cells, values, errors
//
// Views live in `@lab/workbook/react` and `@lab/workbook/ag-grid`.

// --- model -----------------------------------------------------------------
export type * from './core/types'
export type { CellType, EditorKind } from './core/cell-types'
export type { ErrorCode } from './core/formula/errors'
export type { Scalar } from './core/formula/functions'
export { T, INVALID } from './core/cell-types'
export { FormulaError } from './core/formula/errors'

// --- defining, building, checking -------------------------------------------
export { defineWorkbook, buildWorkbook } from './core/workbook'
export { checkWorkbook } from './core/check'

// --- row nodes and cell specs: turning state into rows ------------------------
export type { CellExtras } from './layout/cells'
export {
  literalCell,
  labelCell,
  inputCell,
  boundCell,
  formulaCell,
} from './layout/cells'
export type { FieldConfig, FieldsConfig } from './layout/grid'
export {
  title,
  items,
  fields,
  subtotal,
  addRow,
  row,
  spanned,
} from './layout/grid'
export type { ListKey, ObjectKey } from './layout/state'

// --- session: state, UI state, other screens' exports ------------------------
export type { WorkbookSession } from './core/session'
export { createSession } from './core/session'
export type { Store } from './store/create-store'
export { createStore } from './store/create-store'
export type { UiState } from './core/navigation'
export { navigate } from './core/navigation'
export { screenExports } from './core/external'

// --- presentation: how views show cells (rules; see defineCellViews) ----------
export type {
  Align,
  BuiltInDisplay,
  CellFacts,
  Presentation,
  PresentationRule,
} from './core/presentation'
