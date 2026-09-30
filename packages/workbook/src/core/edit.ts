import { INVALID } from './cell-types'
import type { Cell } from './types'

const isBlank = (input: unknown) =>
  input === null || input === undefined || String(input).trim() === ''

// What a person typed (or picked) into a cell, as every view commits it:
// parsed by the cell's type, then written. On a formula cell a person may
// override, a blank input goes back to the formula. False when the cell cannot
// be written or the input is rejected.
export function commitInput(cell: Cell, input: unknown): boolean {
  if (!cell.write) return false
  if (cell.override && isBlank(input)) {
    cell.override.revert()
    return true
  }
  const value = cell.type.parse(input)
  if (value === INVALID) return false
  cell.write(value)
  return true
}
