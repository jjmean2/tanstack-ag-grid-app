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

// A rectangle between two cells of one sheet: `sheet/row/col:row/col`. Row
// and column ids therefore never contain ":" (checked when building).
export const rangeAddress = (from: Address, to: Address) => {
  const { rowId, colId } = splitAddress(to)
  return `${from}:${rowId}/${colId}`
}

export const isRangeAddress = (address: Address) =>
  !isExternalAddress(address) && address.includes(':')

// The two corner cells of a range.
export const splitRange = (address: Address) => {
  const [from = '', to = ''] = address.split(':')
  return { from, to: `${splitAddress(from).sheetId}/${to}` }
}

const EXT = 'ext:'

export const externalAddress = (screen: string, name: string) =>
  `${EXT}${screen}/${name}`

export const isExternalAddress = (address: Address) => address.startsWith(EXT)

export const splitExternal = (address: Address) => {
  const [screen = '', name = ''] = address.slice(EXT.length).split('/')
  return { screen, name }
}

// Turns a parsed reference into an address, relative to the cell holding the
// formula (its sheet and row supply whatever the reference leaves out).
export function resolveRef(
  ref: RefSyntax,
  from: { sheetId: string; rowId: string },
): Address {
  const { parts } = ref
  if (parts[0].startsWith(EXT)) {
    const screen = parts[0].slice(EXT.length)
    if (parts.length !== 2 || screen === '')
      throw new FormulaError('#PARSE!', `bad reference ${ref.raw}`)
    return externalAddress(screen, parts[1])
  }
  const at = (sheetId: string, row: string, colId: string) =>
    row.startsWith('@')
      ? groupAddress(sheetId, row.slice(1), colId)
      : cellAddress(sheetId, row, colId)

  if (ref.to) {
    // A range: two single cells of one sheet.
    const corner = (r: RefSyntax) => {
      const address = resolveRef({ ...r, to: undefined }, from)
      if (isExternalAddress(address) || isGroupAddress(address))
        throw new FormulaError(
          '#PARSE!',
          `a range is between two cells: ${ref.raw}`,
        )
      return address
    }
    const a = corner(ref)
    const b = corner(ref.to)
    if (splitAddress(a).sheetId !== splitAddress(b).sheetId)
      throw new FormulaError('#REF!', `a range is within one sheet: ${ref.raw}`)
    return rangeAddress(a, b)
  }

  if (parts.length === 1)
    return cellAddress(from.sheetId, from.rowId, parts[0].slice(1))
  if (parts.length === 2) return at(from.sheetId, parts[0], parts[1])
  if (parts.length === 3) return at(parts[0], parts[1], parts[2])
  throw new FormulaError('#PARSE!', `bad reference ${ref.raw}`)
}
