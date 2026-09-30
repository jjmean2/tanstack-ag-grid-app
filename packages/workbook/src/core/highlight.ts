import { cellAddress, isExternalAddress } from './address'
import type { Address, CellRef, Workbook } from './types'
import { leafColumns } from './workbook'

// The cells the focused cell's formula references, for views to highlight
// (as a spreadsheet does while editing a formula). Derived, never stored: the
// focus (UI state) and the formula's parts (the workbook) give it.
//
// Each distinct reference gets a number, 1..HIGHLIGHT_COLORS in formula order
// (then again from 1), so a reference in the formula bar and the cells it
// covers share a colour. Views put `highlightMarks(n)` on them; the theme
// styles those marks.

export const HIGHLIGHT_COLORS = 6

// A covered cell: its reference's number, and which of its sides are on the
// outline of that reference (the neighbour on that side is not covered by
// it), so a grid can draw a range as one rectangle, as AG Grid draws a
// selected range.
export type Highlight = {
  n: number
  top: boolean
  right: boolean
  bottom: boolean
  left: boolean
}

export type Highlights = {
  byTarget: ReadonlyMap<Address, number> // a reference's address → its number
  byCell: ReadonlyMap<Address, Highlight> // a covered cell's address → it
}

const NONE: Highlights = { byTarget: new Map(), byCell: new Map() }

// Where each cell sits in its sheet as a grid shows it: row index (full width
// rows count, so a title between rows breaks an outline) and column index.
function positionsOf(wb: Workbook, sheetId: string) {
  const sheet = wb.sheets[sheetId]
  return {
    row: new Map(sheet?.rows.map((row, i) => [row.id, i])),
    col: new Map(leafColumns(sheet?.columns ?? []).map((c, i) => [c.colId, i])),
  }
}

function compute(wb: Workbook, focused: CellRef): Highlights {
  const cell = wb.cell(
    cellAddress(focused.sheetId, focused.rowId, focused.colId),
  )
  if (!cell?.formula) return NONE
  const byTarget = new Map<Address, number>()
  const byCell = new Map<Address, Highlight>()
  const positions = new Map<string, ReturnType<typeof positionsOf>>()
  const at = (ref: CellRef) => {
    let p = positions.get(ref.sheetId)
    if (!p) positions.set(ref.sheetId, (p = positionsOf(wb, ref.sheetId)))
    return [p.row.get(ref.rowId) ?? -1, p.col.get(ref.colId) ?? -1] as const
  }
  for (const { target } of cell.formula.parts) {
    // Another screen's value has no cell here.
    if (!target || isExternalAddress(target) || byTarget.has(target)) continue
    const n = (byTarget.size % HIGHLIGHT_COLORS) + 1
    byTarget.set(target, n)
    const refs = wb.targets(target)
    const key = (sheetId: string, r: number, c: number) =>
      `${sheetId}|${r}|${c}`
    const covered = new Set(refs.map((ref) => key(ref.sheetId, ...at(ref))))
    for (const ref of refs) {
      const address = cellAddress(ref.sheetId, ref.rowId, ref.colId)
      // A cell under two references keeps the first one's colour.
      if (byCell.has(address)) continue
      const [r, c] = at(ref)
      const out = (dr: number, dc: number) =>
        !covered.has(key(ref.sheetId, r + dr, c + dc))
      byCell.set(address, {
        n,
        top: out(-1, 0),
        right: out(0, 1),
        bottom: out(1, 0),
        left: out(0, -1),
      })
    }
  }
  return { byTarget, byCell }
}

// One computation per workbook and focused cell, shared by every view.
const cache = new WeakMap<Workbook, { key: string; value: Highlights }>()

export function referenceHighlights(
  wb: Workbook,
  focused: CellRef | null,
): Highlights {
  if (!focused) return NONE
  const key = cellAddress(focused.sheetId, focused.rowId, focused.colId)
  const hit = cache.get(wb)
  if (hit?.key === key) return hit.value
  const value = compute(wb, focused)
  cache.set(wb, { key, value })
  return value
}

// Marks for a highlighted reference (in the formula bar) or cell:
// `wb-referenced` and its colour slot `wb-hl-<n>`.
export const highlightMarks = (n: number | undefined): string[] =>
  n === undefined ? [] : ['wb-referenced', `wb-hl-${n}`]

// Marks for a highlighted cell, with the sides of its outline:
// `wb-hl-top|right|bottom|left`. A view whose cells are not laid out as the
// sheet's rows and columns (a form) passes `outline: false`: every side.
export function cellHighlightMarks(
  h: Highlight | undefined,
  { outline = true }: { outline?: boolean } = {},
): string[] {
  if (!h) return []
  const sides = (['top', 'right', 'bottom', 'left'] as const).filter(
    (side) => !outline || h[side],
  )
  return [...highlightMarks(h.n), ...sides.map((side) => `wb-hl-${side}`)]
}

// Whether two highlights draw the same.
export const sameHighlight = (a?: Highlight, b?: Highlight) =>
  a === b ||
  (a !== undefined &&
    b !== undefined &&
    a.n === b.n &&
    a.top === b.top &&
    a.right === b.right &&
    a.bottom === b.bottom &&
    a.left === b.left)
