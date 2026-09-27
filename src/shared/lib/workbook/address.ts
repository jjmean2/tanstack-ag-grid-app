import { FormulaError } from './formula/errors'
import type { RefSyntax } from './formula/parser'
import type { Address } from './types'

export const cellAddress = (sheetId: string, rowId: string, colId: string) =>
  `${sheetId}/${rowId}/${colId}`

export const groupAddress = (sheetId: string, group: string, colId: string) =>
  `${sheetId}/@${group}/${colId}`

export const splitAddress = (address: Address) => {
  const [sheetId = '', rowId = '', colId = ''] = address.split('/')
  return { sheetId, rowId, colId }
}

export const isGroupAddress = (address: Address) =>
  splitAddress(address).rowId.startsWith('@')

// Turns a parsed reference into an address, relative to the cell holding the
// formula (its sheet and row supply whatever the reference leaves out).
export function resolveRef(
  ref: RefSyntax,
  from: { sheetId: string; rowId: string },
): Address {
  const { parts } = ref
  const at = (sheetId: string, row: string, colId: string) =>
    row.startsWith('@')
      ? groupAddress(sheetId, row.slice(1), colId)
      : cellAddress(sheetId, row, colId)

  if (parts.length === 1)
    return cellAddress(from.sheetId, from.rowId, parts[0].slice(1))
  if (parts.length === 2) return at(from.sheetId, parts[0], parts[1])
  if (parts.length === 3) return at(parts[0], parts[1], parts[2])
  throw new FormulaError('#PARSE!', `bad reference ${ref.raw}`)
}
