import { enableDevValidations, themeQuartz } from 'ag-grid-community'
import { AllEnterpriseModule, ModuleRegistry } from 'ag-grid-enterprise'

ModuleRegistry.registerModules([AllEnterpriseModule])

// Readable messages for misconfigured options, in development only.
if (import.meta.env.DEV) enableDevValidations()

// The grid's look, from the tokens of the workbook theme
// (shared/ui/workbook-view/theme.css), which the form sheets use too: change
// a token there and grids and forms change together. AG Grid takes CSS
// `var()` values for its theme parameters.
export const playgroundGridTheme = themeQuartz.withParams({
  accentColor: 'var(--wb-accent)',
  backgroundColor: 'var(--wb-fixed-bg)', // empty cells look fixed too
  foregroundColor: 'var(--wb-ink)',
  borderColor: 'var(--wb-grid-line)',
  headerBackgroundColor: 'var(--wb-head-bg)', // total rows use it too
  headerFontWeight: 'var(--wb-head-weight)',
  fontFamily: 'var(--wb-sans)',
  fontSize: 'var(--wb-font-size)',
  rowHeight: 'var(--wb-row-height)',
  cellHorizontalPadding: 'var(--wb-cell-padding)',
  wrapperBorderRadius: 'var(--wb-radius)',
  // One line between cells, across and down, as the form sheets draw them:
  // columnBorder in the body, a full-height one between header cells. The
  // short line AG Grid draws between header cells is the resize handle's
  // mark; it is hidden (dragging the edge still resizes a resizable column).
  columnBorder: true,
  headerColumnBorder: true,
  headerColumnBorderHeight: '100%',
  headerColumnResizeHandleColor: 'transparent',
  rowHoverColor: '#edf6f1',
  selectedRowBackgroundColor: '#dcefe8',
})
