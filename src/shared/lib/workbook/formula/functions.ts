import {
  addMonths,
  completeMonths,
  endOfMonth,
  isoToSerial,
  partsToSerial,
  serialToParts,
} from './dates'
import { FormulaError } from './errors'

export type Scalar = number | string | boolean | null
// A group reference evaluates to a list of scalars.
export type Arg = Scalar | Scalar[]

export type FunctionDef = {
  min: number
  max: number
  call: (args: Arg[]) => Scalar
}

export const toNumber = (v: Scalar): number => {
  if (v === null) return 0
  if (typeof v === 'number') return v
  if (typeof v === 'boolean') return v ? 1 : 0
  const n = Number(v)
  if (v.trim() === '' || Number.isNaN(n)) {
    throw new FormulaError('#VALUE!', `"${v}" is not a number`)
  }
  return n
}

export const toBool = (v: Scalar): boolean => {
  if (v === null) return false
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  const upper = v.trim().toUpperCase()
  if (upper === 'TRUE') return true
  if (upper === 'FALSE') return false
  throw new FormulaError('#VALUE!', `"${v}" is not a boolean`)
}

export const toText = (v: Scalar): string => {
  if (v === null) return ''
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  return String(v)
}

const scalarOf = (arg: Arg): Scalar => {
  if (!Array.isArray(arg)) return arg
  if (arg.length === 1) return arg[0]
  throw new FormulaError(
    '#VALUE!',
    'a list was used where a single value is expected',
  )
}

// Numbers for SUM-like functions: in a list only numbers count (text, blanks
// and booleans are skipped); a value passed directly is converted.
const numbersOf = (args: Arg[]): number[] =>
  args.flatMap((arg) =>
    Array.isArray(arg)
      ? arg.filter((v): v is number => typeof v === 'number')
      : [toNumber(arg)],
  )

const listOf = (arg: Arg): Scalar[] => (Array.isArray(arg) ? arg : [arg])

const num = (n: number) => {
  if (!Number.isFinite(n)) throw new FormulaError('#NUM!')
  return n
}

// Moves the decimal point via exponent notation so 1.005 rounds like a spreadsheet.
const shift = (x: number, digits: number) => {
  const [mantissa, exponent = '0'] = String(x).split('e')
  return Number(`${mantissa}e${Number(exponent) + digits}`)
}

const roundWith =
  (mode: (n: number) => number) => (value: number, digits: number) => {
    const d = Math.trunc(digits)
    const sign = value < 0 ? -1 : 1
    return sign * shift(mode(shift(Math.abs(value), d)), -d)
  }
// Spreadsheet rounding: ties round away from zero.
const roundHalf = roundWith(Math.round)
const roundUp = roundWith(Math.ceil)
const roundDown = roundWith(Math.floor)

function matcher(criteria: Scalar): (v: Scalar) => boolean {
  if (typeof criteria !== 'string') {
    return (v) => v === criteria
  }
  const match = /^(<=|>=|<>|=|<|>)?([\s\S]*)$/.exec(criteria)
  const op = match?.[1] ?? '='
  const operand = match?.[2] ?? criteria
  const numeric = operand.trim() !== '' && !Number.isNaN(Number(operand))
  return (v) => {
    if (numeric) {
      if (typeof v !== 'number') return op === '<>'
      const n = Number(operand)
      if (op === '=') return v === n
      if (op === '<>') return v !== n
      if (op === '<') return v < n
      if (op === '>') return v > n
      if (op === '<=') return v <= n
      return v >= n
    }
    const a = toText(v).toLowerCase()
    const b = operand.toLowerCase()
    if (op === '=') return a === b
    if (op === '<>') return a !== b
    if (op === '<') return a < b
    if (op === '>') return a > b
    if (op === '<=') return a <= b
    return a >= b
  }
}

const serialOf = (v: Scalar): number => {
  if (typeof v === 'number') return v
  const serial = isoToSerial(v)
  if (serial === null) throw new FormulaError('#VALUE!', 'expected a date')
  return serial
}

// Eager functions. `IF`, `IFS` and `IFERROR` need lazy arguments and live in
// the evaluator (see LAZY_FUNCTIONS).
export const FUNCTIONS: Record<string, FunctionDef | undefined> = {
  // math / aggregation
  SUM: {
    min: 1,
    max: Infinity,
    call: (a) => num(numbersOf(a).reduce((x, y) => x + y, 0)),
  },
  AVERAGE: {
    min: 1,
    max: Infinity,
    call: (a) => {
      const n = numbersOf(a)
      if (n.length === 0) throw new FormulaError('#DIV/0!')
      return num(n.reduce((x, y) => x + y, 0) / n.length)
    },
  },
  MIN: {
    min: 1,
    max: Infinity,
    call: (a) => {
      const n = numbersOf(a)
      return n.length ? Math.min(...n) : 0
    },
  },
  MAX: {
    min: 1,
    max: Infinity,
    call: (a) => {
      const n = numbersOf(a)
      return n.length ? Math.max(...n) : 0
    },
  },
  COUNT: {
    min: 1,
    max: Infinity,
    call: (a) => a.flatMap(listOf).filter((v) => typeof v === 'number').length,
  },
  ABS: { min: 1, max: 1, call: ([v]) => Math.abs(toNumber(scalarOf(v))) },
  MOD: {
    min: 2,
    max: 2,
    call: ([n, d]) => {
      const divisor = toNumber(scalarOf(d))
      if (divisor === 0) throw new FormulaError('#DIV/0!')
      const dividend = toNumber(scalarOf(n))
      return dividend - divisor * Math.floor(dividend / divisor)
    },
  },
  ROUND: {
    min: 2,
    max: 2,
    call: ([v, d]) =>
      num(roundHalf(toNumber(scalarOf(v)), toNumber(scalarOf(d)))),
  },
  ROUNDUP: {
    min: 2,
    max: 2,
    call: ([v, d]) =>
      num(roundUp(toNumber(scalarOf(v)), toNumber(scalarOf(d)))),
  },
  ROUNDDOWN: {
    min: 2,
    max: 2,
    call: ([v, d]) =>
      num(roundDown(toNumber(scalarOf(v)), toNumber(scalarOf(d)))),
  },

  // conditional aggregation
  SUMIF: {
    min: 2,
    max: 3,
    call: (args) => {
      const [range, criteria] = args
      const sumRange = args[2] as Arg | undefined
      const keys = listOf(range)
      const values = sumRange === undefined ? keys : listOf(sumRange)
      if (values.length !== keys.length)
        throw new FormulaError('#VALUE!', 'ranges differ in size')
      const test = matcher(scalarOf(criteria))
      return keys.reduce<number>(
        (sum, key, i) =>
          test(key) && typeof values[i] === 'number' ? sum + values[i] : sum,
        0,
      )
    },
  },
  COUNTIF: {
    min: 2,
    max: 2,
    call: ([range, criteria]) => {
      const test = matcher(scalarOf(criteria))
      return listOf(range).filter(test).length
    },
  },

  // logical
  AND: {
    min: 1,
    max: Infinity,
    call: (a) => a.flatMap(listOf).every((v) => toBool(v)),
  },
  OR: {
    min: 1,
    max: Infinity,
    call: (a) => a.flatMap(listOf).some((v) => toBool(v)),
  },
  NOT: { min: 1, max: 1, call: ([v]) => !toBool(scalarOf(v)) },
  ISBLANK: {
    min: 1,
    max: 1,
    call: ([v]) => {
      const s = scalarOf(v)
      return s === null || s === ''
    },
  },

  // date
  DATE: {
    min: 3,
    max: 3,
    call: ([y, m, d]) =>
      partsToSerial(
        toNumber(scalarOf(y)),
        toNumber(scalarOf(m)),
        toNumber(scalarOf(d)),
      ),
  },
  YEAR: {
    min: 1,
    max: 1,
    call: ([v]) => serialToParts(serialOf(scalarOf(v))).year,
  },
  MONTH: {
    min: 1,
    max: 1,
    call: ([v]) => serialToParts(serialOf(scalarOf(v))).month,
  },
  DAY: {
    min: 1,
    max: 1,
    call: ([v]) => serialToParts(serialOf(scalarOf(v))).day,
  },
  EDATE: {
    min: 2,
    max: 2,
    call: ([v, n]) => addMonths(serialOf(scalarOf(v)), toNumber(scalarOf(n))),
  },
  EOMONTH: {
    min: 2,
    max: 2,
    call: ([v, n]) => endOfMonth(serialOf(scalarOf(v)), toNumber(scalarOf(n))),
  },
  DAYS: {
    min: 2,
    max: 2,
    call: ([end, start]) => serialOf(scalarOf(end)) - serialOf(scalarOf(start)),
  },
  DATEDIF: {
    min: 3,
    max: 3,
    call: ([start, end, unit]) => {
      const a = serialOf(scalarOf(start))
      const b = serialOf(scalarOf(end))
      if (b < a)
        throw new FormulaError('#NUM!', 'end date is before start date')
      const u = toText(scalarOf(unit)).toUpperCase()
      if (u === 'D') return b - a
      if (u === 'M') return completeMonths(a, b)
      if (u === 'Y') return Math.floor(completeMonths(a, b) / 12)
      throw new FormulaError('#NUM!', `unsupported DATEDIF unit "${u}"`)
    },
  },

  // text
  CONCAT: {
    min: 1,
    max: Infinity,
    call: (a) => a.flatMap(listOf).map(toText).join(''),
  },
  LEFT: {
    min: 1,
    max: 2,
    call: (args) => {
      const n = args[1] as Arg | undefined
      return toText(scalarOf(args[0])).slice(
        0,
        n === undefined ? 1 : Math.max(0, toNumber(scalarOf(n))),
      )
    },
  },
  RIGHT: {
    min: 1,
    max: 2,
    call: (args) => {
      const text = toText(scalarOf(args[0]))
      const n = args[1] as Arg | undefined
      const count = n === undefined ? 1 : Math.max(0, toNumber(scalarOf(n)))
      return count === 0 ? '' : text.slice(-count)
    },
  },
  LEN: { min: 1, max: 1, call: ([t]) => toText(scalarOf(t)).length },
}

// Functions that decide themselves which arguments to evaluate.
export const LAZY_FUNCTIONS: Record<
  string,
  { min: number; max: number } | undefined
> = {
  IF: { min: 2, max: 3 },
  IFS: { min: 2, max: Infinity },
  IFERROR: { min: 2, max: 2 },
}
