// How this app shows workbook cells, in one place:
//   presentation.ts  decisions — which editor, display, alignment, marks
//   components.tsx   the components behind editor and display ids
//   theme.css        the looks of marks (imported by src/styles.css)
//   view.test.ts     checks that the three agree
export { presentation } from './presentation'
export { gridDisplays, gridEditors, inputEditors } from './components'
