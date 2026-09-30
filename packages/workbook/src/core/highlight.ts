import { cellAddress, isExternalAddress } from './address'
import type { Address, CellRef, Workbook } from './types'

// The cells the focused cell's formula references, for views to highlight
// (as a spreadsheet does while editing a formula). Derived, never stored: the
// focus (UI state) and the formula's parts (the workbook) give it.
//
// Each distinct reference gets a number, 1..HIGHLIGHT_COLORS in formula order
// (then again from 1), so a reference in the formula bar and the cells it
// covers share a colour. Views put `highlightMarks(n)` on them; the theme
// styles those marks.

export const HIGHLIGHT_COLORS = 6

export type Highlights = {
  byTarget: ReadonlyMap<Address, number> // a reference's address → its number
  byCell: ReadonlyMap<Address, number> // a covered cell's address → number
}

const NONE: Highlights = { byTarget: new Map(), byCell: new Map() }

function compute(wb: Workbook, focused: CellRef): Highlights {
  const cell = wb.cell(
    cellAddress(focused.sheetId, focused.rowId, focused.colId),
  )
  if (!cell?.formula) return NONE
  const byTarget = new Map<Address, number>()
  const byCell = new Map<Address, number>()
  for (const { target } of cell.formula.parts) {
    // Another screen's value has no cell here.
    if (!target || isExternalAddress(target) || byTarget.has(target)) continue
    const n = (byTarget.size % HIGHLIGHT_COLORS) + 1
    byTarget.set(target, n)
    for (const ref of wb.targets(target)) {
      const address = cellAddress(ref.sheetId, ref.rowId, ref.colId)
      // A cell under two references keeps the first one's colour.
      if (!byCell.has(address)) byCell.set(address, n)
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

// Marks for a highlighted cell or reference: `wb-referenced` and its colour
// slot `wb-hl-<n>`.
export const highlightMarks = (n: number | undefined): string[] =>
  n === undefined ? [] : ['wb-referenced', `wb-hl-${n}`]
