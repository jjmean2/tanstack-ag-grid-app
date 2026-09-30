import type { Tags } from '../core/types'

// The layout of a form sheet: boxes on a grid, as on a paper form. It is the
// view's, not the workbook's: the sheet defines cells as rows × columns, like
// any sheet; this places them (and fixed text) in boxes.

// 1-based row and column, and how many rows and columns the box covers. Boxes
// may be any rectangle; they must not overlap.
export type Place = [
  row: number,
  col: number,
  rowSpan?: number,
  colSpan?: number,
]

export type Box =
  // Fixed text: a label, a heading, an empty shaded box.
  | { at: Place; text: string; tags?: Tags }
  // A cell of the sheet, `row/col`.
  | { at: Place; cell: string; tags?: Tags }

export const textBox = (at: Place, text: string, tags?: Tags): Box => ({
  at,
  text,
  tags,
})

export const cellBox = (at: Place, cell: string, tags?: Tags): Box => ({
  at,
  cell,
  tags,
})

// What is wrong with a layout: a box outside the columns, two boxes over the
// same place, a cell ref that is not `row/col`. `FormSheet` throws the first
// one in development; tests can call it directly.
export function checkBoxes(columns: number, boxes: readonly Box[]): string[] {
  const problems: string[] = []
  const taken = new Map<string, string>()
  for (const box of boxes) {
    const [row, col, rowSpan = 1, colSpan = 1] = box.at
    const what = 'cell' in box ? `cell "${box.cell}"` : `text "${box.text}"`
    if ('cell' in box && !/^[^/]+\/[^/]+$/.test(box.cell))
      problems.push(`${what}: a cell is "row/col"`)
    if (row < 1 || col < 1 || col + colSpan - 1 > columns) {
      problems.push(`${what} is outside the ${columns} columns`)
      continue
    }
    for (let r = row; r < row + rowSpan; r++) {
      for (let c = col; c < col + colSpan; c++) {
        const other = taken.get(`${r},${c}`)
        if (other) problems.push(`${what} overlaps ${other}`)
        else taken.set(`${r},${c}`, what)
      }
    }
  }
  return problems
}
