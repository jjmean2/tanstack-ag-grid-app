import type { CellSpec, FormItem, Place, Tags } from '../core/types'

// Boxes of a form sheet: fixed text, or a cell at an address. Tags say what a
// box is (`head`, `label`, `num`, `shade`, `strong`, ...); the app's theme
// styles them.

// A fixed text box of a form sheet (a label, a heading, an empty shaded box).
export const textBox = (at: Place, text: string, tags?: Tags): FormItem => ({
  at,
  text,
  tags,
})

// A cell box of a form sheet, at `<sheet>/<ref>`. `name` names its row for
// the formula bar, e.g. `(1) 세금계산서 발급분`.
export const cellBox = (
  at: Place,
  ref: string,
  cell: CellSpec,
  opts: { name?: string; tags?: Tags } = {},
): FormItem => ({ at, ref, cell, ...opts })
