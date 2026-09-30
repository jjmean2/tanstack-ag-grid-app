import { T } from './cell-types'
import type { CellType } from './cell-types'
import type { BuildCtx, CellSpec, LayoutNode, RowSpec } from './types'

type Slice = Record<string, unknown>
type Item = { id: string } & Slice

// Keys of the session state holding a list of `{ id }` items / a plain object.
export type ListKey<TState> = {
  [K in keyof TState]: TState[K] extends { id: string }[] ? K : never
}[keyof TState] &
  string
export type ObjectKey<TState> = {
  [K in keyof TState]: TState[K] extends readonly unknown[]
    ? never
    : TState[K] extends Slice
      ? K
      : never
}[keyof TState] &
  string

export type FieldDef =
  string | { label: string; type?: CellType; readOnly?: boolean }
export type FieldsSpec<TObject> = { [P in keyof TObject & string]?: FieldDef }

type CellExtras = Omit<CellSpec, 'source'>

// --- cell helpers ----------------------------------------------------------

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

// A fixed formula, e.g. `=SUM([@adds/tax])`. The cell's type is the result type.
export const formulaCell = (
  formula: string,
  extra: CellExtras = {},
): CellSpec => ({
  source: { kind: 'formula', formula },
  ...extra,
})

// --- state access ----------------------------------------------------------

const read = (state: unknown, key: string) => (state as Slice)[key]
const listOf = (state: unknown, key: string) => read(state, key) as Item[]
const patch = <TState extends object>(
  state: TState,
  key: string,
  next: unknown,
): TState => ({ ...state, [key]: next })

// The columns rows fill, left to right: all but the leading `spanRows` columns,
// which hold merged section labels (see `spanned`).
const contentColumns = (ctx: Pick<BuildCtx<unknown>, 'columns'>) =>
  ctx.columns.filter((col) => !col.spanRows)

// --- layout nodes ----------------------------------------------------------

// Section title row: the title sits in the first column and spans all columns.
export function title<TState extends object>(
  id: string,
  text: string,
): LayoutNode<TState> {
  return (ctx) => {
    const cols = contentColumns(ctx)
    return [
      {
        id,
        kind: 'title',
        className: 'sheet-title',
        cells: { [cols[0].colId]: labelCell(text, { span: cols.length }) },
      },
    ]
  }
}

// Merges the `colId` column down across every row `nodes` produce, showing
// `text` once: a section label on the left of a block (구분). The column must
// set `spanRows`; `key` must differ from the neighbouring blocks'.
export function spanned<TState extends object>(
  key: string,
  colId: string,
  text: string,
  nodes: LayoutNode<TState>[],
): LayoutNode<TState> {
  return (ctx) =>
    nodes
      .flatMap((node) => node(ctx))
      .map((spec) => ({
        ...spec,
        cells: { ...spec.cells, [colId]: labelCell(text, { rowSpan: key }) },
      }))
}

// Unrolls a list in the state into data rows (one row per item), forming the
// group `key` that formulas can reference as `[@key/col]`.
// `removeCol` puts a delete button for the item in that column.
export function items<TState extends object, TKey extends ListKey<TState>>(
  key: TKey,
  opts: { removeCol?: string; label?: string } = {},
): LayoutNode<TState> {
  return (ctx) => {
    ctx.declareGroup(key, opts.label ?? key)
    return listOf(ctx.state, key).map((item): RowSpec => ({
      id: item.id,
      kind: 'data',
      group: key,
      cells: Object.fromEntries(
        contentColumns(ctx).map((col): [string, CellSpec] => {
          if (col.colId === opts.removeCol) {
            return [
              col.colId,
              labelCell('', {
                className: 'sheet-action',
                action: {
                  label: '삭제',
                  run: () =>
                    ctx.update((s) =>
                      patch(
                        s,
                        key,
                        listOf(s, key).filter((i) => i.id !== item.id),
                      ),
                    ),
                },
              }),
            ]
          }
          if (col.formula) return [col.colId, formulaCell(col.formula)]
          return [
            col.colId,
            col.editable
              ? inputCell(item[col.colId], (value) =>
                  ctx.update((s) =>
                    patch(
                      s,
                      key,
                      listOf(s, key).map((i) =>
                        i.id === item.id ? { ...i, [col.colId]: value } : i,
                      ),
                    ),
                  ),
                )
              : literalCell(item[col.colId]),
          ]
        }),
      ),
    }))
  }
}

// Unrolls a fixed object in the state into rows (label + value per property),
// forming the group `key`. Row ids are `key.prop`, so no server ids are needed.
export function fields<TState extends object, TKey extends ObjectKey<TState>>(
  key: TKey,
  spec: FieldsSpec<TState[TKey]>,
  opts: { labelCol?: string; valueCol?: string; label?: string } = {},
): LayoutNode<TState> {
  return (ctx) => {
    ctx.declareGroup(key, opts.label ?? key)
    const cols = contentColumns(ctx)
    const labelCol = opts.labelCol ?? cols[0].colId
    const valueCol = opts.valueCol ?? cols[1].colId
    const object = read(ctx.state, key) as Slice
    const entries = Object.entries(
      spec as unknown as Record<string, FieldDef | undefined>,
    )

    return entries.flatMap(([prop, def]): RowSpec[] => {
      if (!def) return []
      const { label, type, readOnly } =
        typeof def === 'string'
          ? { label: def, type: undefined, readOnly: false }
          : { readOnly: false, ...def }
      const write = (value: unknown) =>
        ctx.update((s) =>
          patch(s, key, { ...(read(s, key) as Slice), [prop]: value }),
        )
      return [
        {
          id: `${key}.${prop}`,
          kind: 'field',
          group: key,
          cells: {
            [labelCol]: labelCell(label),
            [valueCol]: readOnly
              ? literalCell(object[prop], { type })
              : inputCell(object[prop], write, { type }),
          },
        },
      ]
    })
  }
}

// Subtotal / total row: `=SUM(...)` formulas over one or more lists.
export function subtotal<TState extends object>(
  id: string,
  text: string,
  keys: ListKey<TState> | ListKey<TState>[],
  sumCols: string[],
  className = 'sheet-subtotal',
): LayoutNode<TState> {
  return (ctx) => {
    const groups = Array.isArray(keys) ? keys : [keys]
    return [
      {
        id,
        kind: 'subtotal',
        className,
        cells: {
          [contentColumns(ctx)[0].colId]: labelCell(text),
          ...Object.fromEntries(
            sumCols.map((colId): [string, CellSpec] => [
              colId,
              formulaCell(
                `=SUM(${groups.map((g) => `[@${g}/${colId}]`).join(',')})`,
              ),
            ]),
          ),
        },
      },
    ]
  }
}

// A full-width row holding a button that appends a new item to a list.
export function addRow<TState extends object, TKey extends ListKey<TState>>(
  id: string,
  key: TKey,
  create: () => { id: string },
  text: string,
): LayoutNode<TState> {
  return (ctx) => [
    {
      id,
      kind: 'action',
      className: 'sheet-add-row',
      cells: {
        [contentColumns(ctx)[0].colId]: labelCell('', {
          span: contentColumns(ctx).length,
          className: 'sheet-action',
          action: {
            label: text,
            run: () =>
              ctx.update((s) => patch(s, key, [...listOf(s, key), create()])),
          },
        }),
      },
    },
  ]
}

// Any other special row. `type` overrides the column type for every cell of
// the row that does not set its own (label cells should use `labelCell`).
export function row<TState extends object>(
  id: string,
  opts: { className?: string; type?: CellType },
  cells: (ctx: Parameters<LayoutNode<TState>>[0]) => Record<string, CellSpec>,
): LayoutNode<TState> {
  return (ctx) => [
    {
      id,
      kind: 'custom',
      className: opts.className,
      type: opts.type,
      cells: cells(ctx),
    },
  ]
}
