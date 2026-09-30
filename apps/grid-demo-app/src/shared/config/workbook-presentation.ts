import { definePresentation } from '@lab/workbook'

// How this app shows workbook cells — decisions only; looks are in
// workbook-theme.css. Every view (grid, input, form box) follows these rules.
//
// A rule looks at a cell's facts (type id, writable, formula, error, tags,
// value) and sets any of: `editor` (an editor id, or null for read-only),
// `display` (how the value shows), `align`, and `marks` (classes the theme
// styles). Rules apply in order; later ones win, marks add up.
//
// The library's defaults come first: the type's editor when the cell can be
// written (date → date picker, select → dropdown, ...), a button for actions,
// the type's alignment. A rule can make a cell read-only, never writable.
//
// A new id for `editor`/`display` also needs a component for each view that
// should offer it: `SheetGridProvider` (editors / displays) for grids.
export const presentation = definePresentation([
  // Negative amounts get a mark: a condition on the value, which CSS cannot
  // express. The theme colours it.
  {
    when: (f) => typeof f.value === 'number' && f.value < 0,
    then: { marks: ['wb-negative'] },
  },
  // Years read best centred.
  { when: (f) => f.type === 'year', then: { align: 'center' } },
])
