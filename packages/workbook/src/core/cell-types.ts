import { isoToSerial, serialToIso } from './formula/dates'
import { FormulaError } from './formula/errors'
import type { Scalar } from './formula/functions'

// A cell data type pairs the underlying value stored in the state with how it
// is shown, edited and seen by formulas. It is picked per column, and can be
// overridden per row or per cell (cell > row > column).

export const INVALID = Symbol('invalid input')

// Semantic editor kinds, a type's default; the presentation may choose another
// and each view maps the id to its own editor (see presentation.ts).
// A view may offer more (an app registers its own ids); these are built in.
export type EditorKind = 'text' | 'number' | 'select' | 'checkbox' | 'date'

export type CellType<TValue = unknown> = {
  id: string
  align: 'left' | 'right'
  editor: EditorKind
  options?: readonly string[] // for the 'select' editor
  format: (value: unknown) => string
  // Editor input -> underlying value; INVALID rejects the edit.
  parse: (input: unknown) => TValue | typeof INVALID
  // Underlying value -> the value formulas see (dates become day serials).
  toEval: (value: unknown) => Scalar
  // Formula result -> underlying value; throws #VALUE! for a wrong kind.
  fromEval: (value: Scalar) => TValue
}

const wrongKind = (id: string, value: Scalar): never => {
  throw new FormulaError(
    '#VALUE!',
    `${String(value)} is not valid for a ${id} cell`,
  )
}

function numeric(id: string, show: (n: number) => string): CellType<number> {
  return {
    id,
    align: 'right',
    editor: 'number',
    format: (v) =>
      typeof v === 'number' ? show(v) : v == null ? '' : String(v),
    parse: (input) => {
      if (input === '' || input == null) return 0
      const n = Number(input)
      return Number.isFinite(n) ? n : INVALID
    },
    toEval: (v) => (typeof v === 'number' ? v : null),
    fromEval: (v) => {
      if (v === null) return 0
      return typeof v === 'number' ? v : wrongKind(id, v)
    },
  }
}

const text: CellType<string> = {
  id: 'text',
  align: 'left',
  editor: 'text',
  format: (v) => (v == null ? '' : String(v)),
  parse: (input) => (input == null ? '' : String(input)),
  toEval: (v) => (v == null ? '' : String(v)),
  fromEval: (v) => {
    if (v === null) return ''
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
    return String(v)
  },
}

const boolean: CellType<boolean> = {
  id: 'boolean',
  align: 'left',
  editor: 'checkbox',
  format: (v) => (v ? '예' : '아니오'),
  parse: (input) => input === true || String(input).toUpperCase() === 'TRUE',
  toEval: (v) => Boolean(v),
  fromEval: (v) => (typeof v === 'boolean' ? v : wrongKind('boolean', v)),
}

// Stored as an ISO string (`YYYY-MM-DD`). Typing accepts `2025-01-31`,
// `2025.01.31` and `20250131`.
const date: CellType<string> = {
  id: 'date',
  align: 'left',
  editor: 'date', // a date picker; typing is parsed the same way
  format: (v) => (typeof v === 'string' ? v : ''),
  parse: (input) => {
    const raw = String(input ?? '').trim()
    if (raw === '') return ''
    const match = /^(\d{4})[-./]?(\d{2})[-./]?(\d{2})$/.exec(raw)
    if (!match) return INVALID
    const iso = `${match[1]}-${match[2]}-${match[3]}`
    return isoToSerial(iso) === null ? INVALID : iso
  },
  toEval: (v) => isoToSerial(v),
  fromEval: (v) => {
    if (v === null) return ''
    return typeof v === 'number' ? serialToIso(v) : wrongKind('date', v)
  },
}

const select = (options: readonly string[]): CellType<string> => ({
  id: 'select',
  align: 'left',
  editor: 'select',
  options,
  format: (v) => (v == null ? '' : String(v)),
  parse: (input) => (input == null ? '' : String(input)),
  toEval: (v) => (v == null ? '' : String(v)),
  fromEval: (v) => text.fromEval(v),
})

const won = (n: number) => n.toLocaleString('ko-KR')

export const T = {
  text,
  boolean,
  date,
  select,
  number: numeric('number', (n) =>
    n.toLocaleString('ko-KR', { maximumFractionDigits: 4 }),
  ),
  integer: numeric('integer', (n) => Math.round(n).toLocaleString('ko-KR')),
  money: numeric('money', won),
  percent: numeric('percent', (n) => `${n}%`),
}
