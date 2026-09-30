import { enableDevValidations, themeQuartz } from 'ag-grid-community'
import { AllEnterpriseModule, ModuleRegistry } from 'ag-grid-enterprise'

ModuleRegistry.registerModules([AllEnterpriseModule])

// Readable messages for misconfigured options, in development only.
if (import.meta.env.DEV) enableDevValidations()

export const playgroundGridTheme = themeQuartz.withParams({
  accentColor: '#1f6f66',
  backgroundColor: '#ffffff', // = --wb-fixed-bg: empty cells look fixed too
  borderColor: '#d8ded8',
  headerBackgroundColor: '#eef3ed', // = --wb-head-bg, which total rows use
  headerFontWeight: 700,
  rowHoverColor: '#edf6f1',
  selectedRowBackgroundColor: '#dcefe8',
})
