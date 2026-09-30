// How this app shows workbook cells, in one place:
//   cell-views.tsx  rules (editor, display, alignment, marks) and the
//                   components behind the ids they use — types check they agree
//   theme.css       the looks of marks (imported by src/styles.css)
//   view.test.ts    checks that every tag and mark in use has a look
export { cellViews } from './cell-views'
