import { FormulaError } from './errors'

// Reference syntax inside brackets, `/`-separated:
//   [sheet/row/col]   a cell
//   [row/col]         a cell in the same sheet
//   [.col]            a cell in the same row
//   [sheet/@group/col] / [@group/col]   every data row of a group (a list)
//   [ext:screen/name] a value exported by another screen
// and, joined by `:`, a rectangle between two cells of one sheet (as in a
// spreadsheet's A1:B9):
//   [row/col]:[row/col]   [sheet/row/col]:[sheet/row/col]
export type RefSyntax = {
  raw: string // as written; for a range, both corners and the `:`
  start: number
  end: number
  parts: string[]
  to?: RefSyntax // a range: its far corner (this one is the near corner)
}

export type Node =
  | { t: 'num'; v: number }
  | { t: 'str'; v: string }
  | { t: 'bool'; v: boolean }
  | { t: 'ref'; ref: RefSyntax }
  | { t: 'un'; op: '-' | '+'; a: Node }
  | { t: 'bin'; op: string; a: Node; b: Node }
  | { t: 'call'; name: string; args: Node[] }

export type Parsed = { text: string; ast: Node; refs: RefSyntax[] }

type Token = {
  kind:
    | 'num'
    | 'str'
    | 'ref'
    | 'id'
    | 'op'
    | 'lp'
    | 'rp'
    | 'comma'
    | 'colon'
    | 'eof'
  text: string
  value?: number | string
  start: number
  end: number
}

const fail = (detail: string): never => {
  throw new FormulaError('#PARSE!', detail)
}

function tokenize(text: string): Token[] {
  if (!text.startsWith('=')) fail('a formula must start with "="')
  const tokens: Token[] = []
  let i = 1

  while (i < text.length) {
    const ch = text[i]
    if (/\s/.test(ch)) {
      i += 1
      continue
    }
    const start = i

    if (/[0-9.]/.test(ch)) {
      const match = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(text.slice(i))
      if (!match) fail(`bad number at ${i}`)
      const raw = match![0]
      i += raw.length
      tokens.push({ kind: 'num', text: raw, value: Number(raw), start, end: i })
      continue
    }

    if (ch === '"') {
      let value = ''
      i += 1
      for (;;) {
        if (i >= text.length) fail('unterminated string')
        if (text[i] === '"') {
          if (text[i + 1] === '"') {
            value += '"'
            i += 2
            continue
          }
          i += 1
          break
        }
        value += text[i]
        i += 1
      }
      tokens.push({
        kind: 'str',
        text: text.slice(start, i),
        value,
        start,
        end: i,
      })
      continue
    }

    if (ch === '[') {
      const close = text.indexOf(']', i)
      if (close < 0) fail('unterminated reference')
      i = close + 1
      tokens.push({ kind: 'ref', text: text.slice(start, i), start, end: i })
      continue
    }

    if (/[A-Za-z_]/.test(ch)) {
      const match = /^[A-Za-z_][A-Za-z0-9_]*/.exec(text.slice(i))
      const raw = match![0]
      i += raw.length
      tokens.push({ kind: 'id', text: raw, start, end: i })
      continue
    }

    const two = text.slice(i, i + 2)
    if (two === '<=' || two === '>=' || two === '<>') {
      i += 2
      tokens.push({ kind: 'op', text: two, start, end: i })
      continue
    }
    if ('+-*/^&=<>'.includes(ch)) {
      i += 1
      tokens.push({ kind: 'op', text: ch, start, end: i })
      continue
    }
    if (ch === ':') {
      i += 1
      tokens.push({ kind: 'colon', text: ch, start, end: i })
      continue
    }
    if (ch === '(' || ch === ')' || ch === ',') {
      i += 1
      tokens.push({
        kind: ch === '(' ? 'lp' : ch === ')' ? 'rp' : 'comma',
        text: ch,
        start,
        end: i,
      })
      continue
    }
    fail(`unexpected "${ch}" at ${i}`)
  }

  tokens.push({ kind: 'eof', text: '', start: text.length, end: text.length })
  return tokens
}

// Binding powers, lowest to highest (same order as a spreadsheet):
// comparison < & < + - < * / < ^ < unary minus.
const BINARY_BP: Record<string, number | undefined> = {
  '=': 1,
  '<>': 1,
  '<': 1,
  '>': 1,
  '<=': 1,
  '>=': 1,
  '&': 2,
  '+': 3,
  '-': 3,
  '*': 4,
  '/': 4,
  '^': 5,
}
const UNARY_BP = 6

function toRef(token: Token): RefSyntax {
  const inner = token.text.slice(1, -1).trim()
  const parts = inner.split('/').map((p) => p.trim())
  const valid =
    inner !== '' &&
    parts.length <= 3 &&
    parts.every((p) => p !== '') &&
    (parts.length > 1 || (parts[0].startsWith('.') && parts[0].length > 1))
  if (!valid) fail(`bad reference ${token.text}`)
  return { raw: token.text, start: token.start, end: token.end, parts }
}

class Parser {
  private pos = 0
  readonly refs: RefSyntax[] = []

  constructor(
    private readonly tokens: Token[],
    private readonly text: string,
  ) {}

  private peek() {
    return this.tokens[this.pos]
  }

  private next() {
    const token = this.tokens[this.pos]
    this.pos += 1
    return token
  }

  parseAll(): Node {
    const node = this.expression(0)
    if (this.peek().kind !== 'eof') fail(`unexpected "${this.peek().text}"`)
    return node
  }

  private expression(minBp: number): Node {
    let left = this.prefix()
    for (;;) {
      const token = this.peek()
      if (token.kind !== 'op') break
      const bp = BINARY_BP[token.text]
      if (bp === undefined || bp < minBp) break
      this.next()
      const right = this.expression(bp + 1)
      left = { t: 'bin', op: token.text, a: left, b: right }
    }
    return left
  }

  private prefix(): Node {
    const token = this.next()
    switch (token.kind) {
      case 'num':
        return { t: 'num', v: token.value as number }
      case 'str':
        return { t: 'str', v: token.value as string }
      case 'ref': {
        let ref = toRef(token)
        // `[a]:[b]`: a range. The colon binds before any operator.
        if (this.peek().kind === 'colon') {
          this.next()
          const end = this.next()
          if (end.kind !== 'ref') fail('a range is "[cell]:[cell]"')
          const to = toRef(end)
          ref = {
            ...ref,
            raw: this.text.slice(ref.start, to.end),
            end: to.end,
            to,
          }
        }
        this.refs.push(ref)
        return { t: 'ref', ref }
      }
      case 'id':
        return this.identifier(token)
      case 'lp': {
        const inner = this.expression(0)
        if (this.next().kind !== 'rp') fail('missing ")"')
        return inner
      }
      case 'op':
        if (token.text === '-' || token.text === '+') {
          return { t: 'un', op: token.text, a: this.expression(UNARY_BP) }
        }
        return fail(`unexpected "${token.text}"`)
      default:
        return fail(`unexpected "${token.text || 'end of formula'}"`)
    }
  }

  private identifier(token: Token): Node {
    if (this.peek().kind === 'lp') {
      this.next()
      const args: Node[] = []
      if (this.peek().kind === 'rp') {
        this.next()
      } else {
        for (;;) {
          args.push(this.expression(0))
          const sep = this.next()
          if (sep.kind === 'rp') break
          if (sep.kind !== 'comma')
            fail(`expected "," or ")" in ${token.text}()`)
        }
      }
      return { t: 'call', name: token.text.toUpperCase(), args }
    }
    const upper = token.text.toUpperCase()
    if (upper === 'TRUE') return { t: 'bool', v: true }
    if (upper === 'FALSE') return { t: 'bool', v: false }
    throw new FormulaError('#NAME?', token.text)
  }
}

const cache = new Map<string, Parsed | FormulaError>()

// Parses once per distinct formula text. Errors are returned, not thrown, so
// they can be cached too.
export function parseFormula(text: string): Parsed | FormulaError {
  const hit = cache.get(text)
  if (hit) return hit
  let result: Parsed | FormulaError
  try {
    const parser = new Parser(tokenize(text), text)
    const ast = parser.parseAll()
    result = { text, ast, refs: parser.refs }
  } catch (error) {
    if (!(error instanceof FormulaError)) throw error
    result = error
  }
  cache.set(text, result)
  return result
}
