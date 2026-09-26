import type { FormatId } from '../sheet/formats'
import type { BuildCtx, Cell, LayoutNode, SheetLeaf, SheetRow } from './types'

type Slice = Record<string, unknown>
type Item = { id: string } & Slice

// Keys of the session state holding a list of `{ id }` items / a plain object.
export type ListKey<TState> = {
  [TKey in keyof TState]: TState[TKey] extends { id: string }[] ? TKey : never
}[keyof TState] &
  string
export type ObjectKey<TState> = {
  [TKey in keyof TState]: TState[TKey] extends readonly unknown[]
    ? never
    : TState[TKey] extends Slice
      ? TKey
      : never
}[keyof TState] &
  string

export type FieldSpec =
  string | { label: string; format?: FormatId; readOnly?: boolean }
export type FieldsSpec<TObject> = { [P in keyof TObject & string]?: FieldSpec }

const read = (state: unknown, key: string) => (state as Slice)[key]
const listOf = (state: unknown, key: string) => read(state, key) as Item[]
const patch = <TState extends object>(
  state: TState,
  key: string,
  next: unknown,
): TState => ({
  ...state,
  [key]: next,
})

const valueOf = (col: SheetLeaf, item: Item) =>
  col.derive ? col.derive(item as never) : item[col.colId]

const sumOf = (col: SheetLeaf, list: Item[]) =>
  list.reduce((acc, item) => acc + (Number(valueOf(col, item)) || 0), 0)

// Section title row: the title sits in the first column and spans all columns.
export function title<TState extends object>(
  id: string,
  text: string,
): LayoutNode<TState> {
  return (ctx) => [
    {
      id,
      kind: 'title',
      className: 'sheet-title',
      cells: {
        [ctx.columns[0].colId]: { value: text, span: ctx.columns.length },
      },
    },
  ]
}

// Unrolls a list in the state into data rows (one row per item).
// `removeCol` puts a delete button for the item in that column.
export function items<TState extends object, TKey extends ListKey<TState>>(
  key: TKey,
  opts: { removeCol?: string } = {},
): LayoutNode<TState> {
  return (ctx) =>
    listOf(ctx.state, key).map((item): SheetRow => ({
      id: item.id,
      kind: 'data',
      cells: Object.fromEntries(
        ctx.columns.map((col): [string, Cell] => {
          if (col.colId === opts.removeCol) {
            return [
              col.colId,
              {
                value: '',
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
              },
            ]
          }
          return [
            col.colId,
            {
              value: valueOf(col, item),
              edit:
                col.editable && !col.derive
                  ? (value) =>
                      ctx.update((s) =>
                        patch(
                          s,
                          key,
                          listOf(s, key).map((i) =>
                            i.id === item.id ? { ...i, [col.colId]: value } : i,
                          ),
                        ),
                      )
                  : undefined,
            },
          ]
        }),
      ),
    }))
}

// Unrolls a fixed object in the state into rows (label + value per property).
// Row ids are the property keys, so no server ids are needed.
export function fields<TState extends object, TKey extends ObjectKey<TState>>(
  key: TKey,
  spec: FieldsSpec<TState[TKey]>,
  opts: { labelCol?: string; valueCol?: string } = {},
): LayoutNode<TState> {
  return (ctx) => {
    const labelCol = opts.labelCol ?? ctx.columns[0].colId
    const valueCol = opts.valueCol ?? ctx.columns[1].colId
    const object = read(ctx.state, key) as Slice
    const entries = Object.entries(
      spec as unknown as Record<string, FieldSpec | undefined>,
    )

    return entries.flatMap(([prop, def]): SheetRow[] => {
      if (!def) return []
      const { label, format, readOnly } =
        typeof def === 'string'
          ? { label: def, format: undefined, readOnly: false }
          : { readOnly: false, ...def }
      return [
        {
          id: `${key}.${prop}`,
          kind: 'field',
          cells: {
            [labelCol]: { value: label },
            [valueCol]: {
              value: object[prop],
              format,
              edit: readOnly
                ? undefined
                : (value) =>
                    ctx.update((s) =>
                      patch(s, key, {
                        ...(read(s, key) as Slice),
                        [prop]: value,
                      }),
                    ),
            },
          },
        },
      ]
    })
  }
}

// Subtotal / total row: per-column sums over one or more lists.
export function subtotal<TState extends object>(
  id: string,
  label: string,
  key: ListKey<TState> | ListKey<TState>[],
  sumCols: string[],
  className = 'sheet-subtotal',
): LayoutNode<TState> {
  return (ctx) => {
    const keys = Array.isArray(key) ? key : [key]
    const all = keys.flatMap((k) => listOf(ctx.state, k))
    return [
      {
        id,
        kind: 'subtotal',
        className,
        cells: {
          [ctx.columns[0].colId]: { value: label },
          ...Object.fromEntries(
            sumCols.map((colId): [string, Cell] => {
              const col = ctx.columns.find((c) => c.colId === colId)
              if (!col) throw new Error(`Unknown column: ${colId}`)
              return [colId, { value: sumOf(col, all) }]
            }),
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
  label: string,
): LayoutNode<TState> {
  return (ctx) => [
    {
      id,
      kind: 'action',
      className: 'sheet-add-row',
      cells: {
        [ctx.columns[0].colId]: {
          value: '',
          span: ctx.columns.length,
          className: 'sheet-action',
          action: {
            label,
            run: () =>
              ctx.update((s) => patch(s, key, [...listOf(s, key), create()])),
          },
        },
      },
    },
  ]
}

// Any other special row (input rows, difference rows, ...).
export function row<TState extends object>(
  id: string,
  className: string | undefined,
  cells: (ctx: BuildCtx<TState>) => Record<string, Cell>,
): LayoutNode<TState> {
  return (ctx) => [{ id, kind: 'custom', className, cells: cells(ctx) }]
}

export function buildRows<TState>(
  layout: LayoutNode<TState>[],
  base: Omit<BuildCtx<TState>, 'get'>,
): SheetRow[] {
  const built = new Map<string, SheetRow>()
  const ctx: BuildCtx<TState> = {
    ...base,
    get: (rowId, colId) => built.get(rowId)?.cells[colId]?.value,
  }
  return layout.flatMap((node) => {
    const rows = node(ctx)
    // Rows are evaluated top to bottom, so a row can only reference rows above it.
    rows.forEach((r) => built.set(r.id, r))
    return rows
  })
}
