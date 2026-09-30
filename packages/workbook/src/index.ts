// @lab/workbook — the core. Framework-free: nothing here imports React or
// AG Grid, so a workbook can be defined, built and tested anywhere.
//
//   state ──(definition)──▶ buildWorkbook ──▶ Workbook (cells, values, errors)
//
// Views live in `@lab/workbook/react` and `@lab/workbook/ag-grid`.

// --- model -----------------------------------------------------------------
export type * from './core/types'
export type { CellType, EditorKind } from './core/cell-types'
export type { ErrorCode } from './core/formula/errors'
export type { Scalar } from './core/formula/functions'

export { T, INVALID } from './core/cell-types'
export { FormulaError } from './core/formula/errors'
export {
  cellAddress,
  groupAddress,
  externalAddress,
  splitAddress,
  splitExternal,
  isGroupAddress,
  isExternalAddress,
} from './core/address'

// --- marks: the classes every view puts on cells, for the app's theme -----
export { cellMarks, rowMarks, tagClass, toTags } from './core/marks'

// --- defining and building a workbook -------------------------------------
export { defineWorkbook, buildWorkbook, flattenLeafs } from './core/workbook'
export { checkWorkbook } from './core/check'

// --- layout: turning state into rows (grid sheets) and boxes (form sheets) --
export type { CellExtras } from './layout/cells'
export {
  literalCell,
  labelCell,
  inputCell,
  boundCell,
  formulaCell,
} from './layout/cells'
export type { FieldDef, FieldsSpec } from './layout/grid'
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
export { textBox, cellBox } from './layout/form'

// --- state: the session store and the UI state (focus, navigation) --------
export type { Store } from './store/create-store'
export { createStore } from './store/create-store'
export type { UiState } from './core/navigation'
export {
  createUiStore,
  navigate,
  claimPending,
  reportFocus,
} from './core/navigation'

// --- other screens and persistence ----------------------------------------
export { screenExports, externalsFrom } from './core/external'
export { screenStorage } from './persistence/screen-storage'
