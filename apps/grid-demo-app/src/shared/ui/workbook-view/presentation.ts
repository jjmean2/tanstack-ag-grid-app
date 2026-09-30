import { definePresentation } from '@lab/workbook'

// How this app shows workbook cells: the decisions. Every view (grid, input,
// form box) follows them. Next to this file:
//   components.tsx  the components behind editor / display ids used here
//   theme.css       the looks of marks
//   view.test.ts    checks the three agree
//
// A rule looks at a cell's facts (type id, writable, formula, error, tags,
// value) and sets any of: `editor` (an editor id, or null for read-only),
// `display` (how the value shows when not editing), `align`, and `marks`
// (classes theme.css styles). Rules apply in order; later ones win, marks add
// up.
//
// The library's defaults come first: the type's editor when the cell can be
// written (date → date picker, select → dropdown, ...), a button for actions,
// the type's alignment. A rule can make a cell read-only, never writable.
export const presentation = definePresentation([
  // Negative amounts get a mark: a condition on the value, which CSS cannot
  // express.
  {
    when: (f) => typeof f.value === 'number' && f.value < 0,
    then: { marks: ['wb-negative'] },
  },
  // Years: centred, edited as a whole number in range (editor 'year').
  { when: (f) => f.type === 'year', then: { align: 'center', editor: 'year' } },
  // A check's verdict in words shows as a badge (display 'status').
  {
    when: (f) =>
      f.type === 'text' && (f.tags.includes('pass') || f.tags.includes('fail')),
    then: { display: 'status' },
  },
])
