import type { Cell, Row, Tags } from './types'

// Marks: the classes every view puts on a cell or a row, so one theme styles a
// cell the same way whether a grid, an input or a form box shows it. They say
// what the cell is, never how it looks:
//
//   wb-cell                       every cell
//   wb-type-<type id>             wb-type-money, wb-type-date, ...
//   wb-source-value | -formula    where the value comes from
//   wb-overridable                a formula cell a person may type over
//   wb-overridden                 ... and did: it shows their value
//   wb-error                      evaluated to an error (#REF!, #DIV/0!, ...)
//   wb-action                     holds a button
//   wb-tag-<tag>                  tags from the definition: the cell's own and
//                                 its row's, so a row's tags reach its cells in
//                                 any view
//
//   wb-row, wb-tag-<tag>          on a grid row too (for its empty cells)
//
// The presentation (presentation.ts) adds what rules decide: wb-editable when
// the view lets the user edit it, wb-align-right|center, and marks of its own.
//
// The app's theme maps marks to styles; the library only styles what is
// structural (see styles.css).

export const tagClass = (tag: string) => `wb-tag-${tag}`

export const toTags = (tags: Tags | undefined): string[] =>
  tags === undefined ? [] : typeof tags === 'string' ? [tags] : [...tags]

// The marks that follow from what a cell is. Views use the presentation's
// `marks`, which start with these.
export function factMarks(cell: Cell): string[] {
  const marks = [
    'wb-cell',
    `wb-type-${cell.type.id}`,
    `wb-source-${cell.source.kind}`,
  ]
  if (cell.override) marks.push('wb-overridable')
  if (cell.override?.active) marks.push('wb-overridden')
  if (cell.error) marks.push('wb-error')
  if (cell.action) marks.push('wb-action')
  marks.push(...cell.rowTags.map(tagClass), ...cell.tags.map(tagClass))
  return marks
}

export const rowMarks = (row: Pick<Row, 'tags'>): string[] => [
  'wb-row',
  ...row.tags.map(tagClass),
]
