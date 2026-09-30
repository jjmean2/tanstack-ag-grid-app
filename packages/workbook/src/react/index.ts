// @lab/workbook/react — React views: share a built workbook, and views that are
// not tied to a grid library (inputs, form sheets, the formula bar).

export type { OpenScreen } from './workbook-context'
export {
  WorkbookProvider,
  useWorkbook,
  useFocusAddress,
} from './workbook-context'
export { useStore } from './use-store'

// How cells show: `defineInputViews` without a grid (with one, use
// `defineCellViews` from @lab/workbook/ag-grid).
export type { CellViews } from './views'
export { defineInputViews } from './views'
export type { InputEditor, InputEditorProps } from './input-editors'

// Views.
export { CellInput, useCell } from './cell-input'
export type { Box, Place } from './form-layout'
export { FormSheet } from './form-sheet'
export { textBox, cellBox, checkBoxes } from './form-layout'
export { FormulaBar, savedAtText } from './formula-bar'
export { ExternalRefs } from './external-refs'
export { WorkbookErrorBoundary } from './error-boundary'
