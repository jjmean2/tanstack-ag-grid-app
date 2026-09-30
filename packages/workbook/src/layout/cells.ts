import { T } from '../core/cell-types'
import type { CellSpec, Update } from '../core/types'
import { patch, read } from './state'
import type { ObjectKey, Slice } from './state'

// Cell specs: where a cell's value comes from (see `CellSource`), plus extras
// such as a type override, a span or tags.

export type CellExtras = Omit<CellSpec, 'source'>

export const literalCell = (
  value: unknown,
  extra: CellExtras = {},
): CellSpec => ({
  source: { kind: 'value', value },
  ...extra,
})

// A text label (always a text cell, whatever the column or row type).
export const labelCell = (text: string, extra: CellExtras = {}): CellSpec =>
  literalCell(text, { type: T.text, ...extra })

// An editable cell; `write` receives the parsed value.
export const inputCell = (
  value: unknown,
  write: (value: unknown) => void,
  extra: CellExtras = {},
): CellSpec => ({ source: { kind: 'value', value, write }, ...extra })

// An editable cell bound to `state[key][prop]`, where `state[key]` is a plain
// object: what `fields` does per row, for one cell (e.g. a box of a form).
export function boundCell<
  TState extends object,
  TKey extends ObjectKey<TState>,
>(
  ctx: { state: TState; update: Update<TState> },
  key: TKey,
  prop: keyof TState[TKey] & string,
  extra: CellExtras = {},
): CellSpec {
  const object = read(ctx.state, key) as Slice
  return inputCell(
    object[prop],
    (value) =>
      ctx.update((s) =>
        patch(s, key, { ...(read(s, key) as Slice), [prop]: value }),
      ),
    extra,
  )
}

// A fixed formula, e.g. `=SUM([@adds/tax])`. The cell's type is the result type.
export const formulaCell = (
  formula: string,
  extra: CellExtras = {},
): CellSpec => ({
  source: { kind: 'formula', formula },
  ...extra,
})
