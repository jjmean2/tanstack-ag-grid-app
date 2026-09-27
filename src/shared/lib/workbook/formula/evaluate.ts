import { FormulaError } from './errors'
import {
  FUNCTIONS,
  LAZY_FUNCTIONS,
  toBool,
  toNumber,
  toText,
} from './functions'
import type { Arg, Scalar } from './functions'
import type { Node, RefSyntax } from './parser'

export type Env = {
  // Resolves a reference to its value(s); throws FormulaError when it cannot.
  ref: (ref: RefSyntax) => Arg
}

const num = (n: number) => {
  if (!Number.isFinite(n)) throw new FormulaError('#NUM!')
  return n
}

const scalar = (v: Arg): Scalar => {
  if (!Array.isArray(v)) return v
  if (v.length === 1) return v[0]
  throw new FormulaError(
    '#VALUE!',
    'a list was used where a single value is expected',
  )
}

// -1 / 0 / 1. Blanks take the type of the other side; across types the order
// is number < text < boolean, and text compares case-insensitively.
function compare(a: Scalar, b: Scalar): number {
  const left =
    a ?? (typeof b === 'string' ? '' : typeof b === 'boolean' ? false : 0)
  const right =
    b ?? (typeof a === 'string' ? '' : typeof a === 'boolean' ? false : 0)
  const rank = (v: number | string | boolean) =>
    typeof v === 'number' ? 0 : typeof v === 'string' ? 1 : 2
  if (rank(left) !== rank(right)) return rank(left) < rank(right) ? -1 : 1
  const x = typeof left === 'string' ? left.toLowerCase() : left
  const y = typeof right === 'string' ? right.toLowerCase() : right
  return x < y ? -1 : x > y ? 1 : 0
}

function checkArity(name: string, count: number, min: number, max: number) {
  if (count < min || count > max) {
    throw new FormulaError(
      '#PARSE!',
      `${name}() takes ${min === max ? min : `${min}-${max}`} argument(s)`,
    )
  }
}

function evalNode(node: Node, env: Env): Arg {
  switch (node.t) {
    case 'num':
    case 'str':
    case 'bool':
      return node.v
    case 'ref':
      return env.ref(node.ref)
    case 'un': {
      const n = toNumber(scalar(evalNode(node.a, env)))
      return node.op === '-' ? -n : n
    }
    case 'bin': {
      const a = scalar(evalNode(node.a, env))
      const b = scalar(evalNode(node.b, env))
      switch (node.op) {
        case '+':
          return num(toNumber(a) + toNumber(b))
        case '-':
          return num(toNumber(a) - toNumber(b))
        case '*':
          return num(toNumber(a) * toNumber(b))
        case '/': {
          const divisor = toNumber(b)
          if (divisor === 0) throw new FormulaError('#DIV/0!')
          return num(toNumber(a) / divisor)
        }
        case '^':
          return num(Math.pow(toNumber(a), toNumber(b)))
        case '&':
          return toText(a) + toText(b)
        case '=':
          return compare(a, b) === 0
        case '<>':
          return compare(a, b) !== 0
        case '<':
          return compare(a, b) < 0
        case '>':
          return compare(a, b) > 0
        case '<=':
          return compare(a, b) <= 0
        default:
          return compare(a, b) >= 0
      }
    }
    case 'call':
      return evalCall(node, env)
  }
}

function evalCall(node: Extract<Node, { t: 'call' }>, env: Env): Arg {
  const { name, args } = node

  const lazy = LAZY_FUNCTIONS[name]
  if (lazy) {
    checkArity(name, args.length, lazy.min, lazy.max)
    if (name === 'IF') {
      const condition = toBool(scalar(evalNode(args[0], env)))
      if (condition) return evalNode(args[1], env)
      return args.length === 3 ? evalNode(args[2], env) : false
    }
    if (name === 'IFS') {
      if (args.length % 2 !== 0)
        checkArity(name, args.length, args.length + 1, args.length + 1)
      for (let i = 0; i < args.length; i += 2) {
        if (toBool(scalar(evalNode(args[i], env))))
          return evalNode(args[i + 1], env)
      }
      throw new FormulaError('#N/A', 'no IFS condition matched')
    }
    // IFERROR: only the first argument's errors are caught.
    try {
      return evalNode(args[0], env)
    } catch (error) {
      if (error instanceof FormulaError) return evalNode(args[1], env)
      throw error
    }
  }

  const def = FUNCTIONS[name]
  if (!def) throw new FormulaError('#NAME?', name)
  checkArity(name, args.length, def.min, def.max)
  return def.call(
    args.map((arg) => {
      const value = evalNode(arg, env)
      // A reference is passed as a list, even for a single cell, so functions
      // can tell it from a literal (a blank referenced cell is skipped by
      // AVERAGE, a literal is not).
      return arg.t === 'ref' && !Array.isArray(value) ? [value] : value
    }),
  )
}

export function evaluate(ast: Node, env: Env): Scalar {
  const result = evalNode(ast, env)
  if (Array.isArray(result)) {
    throw new FormulaError(
      '#VALUE!',
      'a list cannot be the result of a formula',
    )
  }
  return result
}
