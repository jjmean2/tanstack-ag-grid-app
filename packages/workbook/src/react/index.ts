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
export { CellInput, useCell, useHighlight } from './cell-input'
export type { ListControls } from './lists'
export { useFocusedList, useList } from './lists'
export type { Box, Place } from './form-layout'
export { FormSheet } from './form-sheet'
export { textBox, cellBox, checkBoxes } from './form-layout'
export { FormulaBar, formulaBarTexts, savedAtText } from './formula-bar'
export { ExternalRefs, externalRefsTexts } from './external-refs'

// The data behind the formula bar and the external refs panel, for an app
// that draws its own.
export type {
  ExternalRefItem,
  FormulaBarPart,
  FormulaBarRef,
  FormulaBarState,
} from './use-formula-bar'
export { useExternalRefs, useFormulaBar } from './use-formula-bar'
export { WorkbookErrorBoundary } from './error-boundary'
