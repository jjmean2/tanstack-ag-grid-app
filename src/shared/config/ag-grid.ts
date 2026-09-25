import { themeQuartz } from 'ag-grid-community'
import { AllEnterpriseModule, ModuleRegistry } from 'ag-grid-enterprise'

ModuleRegistry.registerModules([AllEnterpriseModule])

export const playgroundGridTheme = themeQuartz.withParams({
  accentColor: '#1f6f66',
  backgroundColor: '#fffdf8',
  borderColor: '#d8ded8',
  headerBackgroundColor: '#eef3ed',
  headerFontWeight: 700,
  rowHoverColor: '#edf6f1',
  selectedRowBackgroundColor: '#dcefe8',
})
