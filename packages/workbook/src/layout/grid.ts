import type { CellType } from '../core/cell-types'
import type {
  CellSpec,
  ListOps,
  RowsCtx,
  RowsNode,
  RowSpec,
  Tags,
} from '../core/types'
import { formulaCell, inputCell, labelCell, literalCell } from './cells'
import { listOf, patch, read } from './state'
import type { Item, ListKey, ObjectKey, Slice } from './state'

// Row nodes: each turns the session state into rows, top to bottom. A sheet's
// `rows` is a list of them.

export type FieldConfig =
  string | { label: string; type?: CellType; readOnly?: boolean }
export type FieldsConfig<TObject> = {
  [P in keyof TObject & string]?: FieldConfig
}

// The columns rows fill, left to right: all but the leading `spanRows` columns,
// which hold merged section labels (see `spanned`).
const contentColumns = (ctx: Pick<RowsCtx<unknown>, 'columns'>) =>
  ctx.columns.filter((col) => !col.spanRows)

// Section title row, drawn across the whole grid (a full width row).
export function title<TState extends object>(
  id: string,
  text: string,
): RowsNode<TState> {
  return () => [
    {
      id,
      tags: 'title',
      cells: {},
      fullWidth: { kind: 'title', text },
    },
  ]
}

// Merges the `colId` column down across every row `nodes` produce, showing
// `text` once: a section label on the left of a block (구분). The column must
// set `spanRows`; `key` must differ from the neighbouring blocks'. A full
// width row among them would cut the merge in two, so keep those outside.
export function spanned<TState extends object>(
  key: string,
  colId: string,
  text: string,
  nodes: RowsNode<TState>[],
): RowsNode<TState> {
  return (ctx) =>
    nodes
      .flatMap((node) => node(ctx))
      .map((spec) =>
        spec.fullWidth
          ? spec
          : {
              ...spec,
              cells: {
                ...spec.cells,
                [colId]: labelCell(text, { rowSpan: key }),
              },
            },
      )
}

// An item of the list `state[key]`.
type ItemOf<
  TState,
  TKey extends keyof TState,
> = TState[TKey] extends readonly (infer TItem)[] ? TItem : never

// Unrolls a list in the state into data rows (one row per item), forming the
// group `key` that formulas can reference as `[@key/col]`.
// What a person may do to the list is the definition's to say:
//   create     makes a new item: rows can be added (`addRow`, the grid's
//              context menu, `useList` / `useFocusedList` anywhere)
//   removable  rows can be removed (context menu, `useList`); on by default
//              with `removeCol`, which puts a delete button in that column
export function items<TState extends object, TKey extends ListKey<TState>>(
  key: TKey,
  opts: {
    create?: () => ItemOf<TState, TKey>
    removable?: boolean
    removeCol?: string
    label?: string
  } = {},
): RowsNode<TState> {
  return (ctx) => {
    const columns = contentColumns(ctx)
    const setList = (fn: (list: Item[]) => Item[]) =>
      ctx.update((s) => patch(s, key, fn(listOf(s, key))))
    const { create } = opts
    const remove = (id: string) => setList((l) => l.filter((i) => i.id !== id))
    const list: ListOps = {
      remove:
        (opts.removable ?? opts.removeCol !== undefined) ? remove : undefined,
      insert:
        create &&
        ((at = {}) => {
          const item = create() as Item
          setList((l) => {
            const next = [...l]
            const ref = at.after ?? at.before
            const found =
              ref === undefined ? -1 : l.findIndex((i) => i.id === ref)
            const index =
              found < 0 ? l.length : at.after !== undefined ? found + 1 : found
            next.splice(index, 0, item)
            return next
          })
          return item.id
        }),
      // A new row takes focus in its first editable column.
      focusCol: columns.find(
        (col) => col.editable && !col.formula && col.colId !== opts.removeCol,
      )?.colId,
    }
    ctx.declareGroup(key, opts.label ?? key, list)
    return listOf(ctx.state, key).map((item): RowSpec => ({
      id: item.id,
      group: key,
      cells: Object.fromEntries(
        columns.map((col): [string, CellSpec] => {
          if (col.colId === opts.removeCol) {
            return [
              col.colId,
              labelCell('', {
                action: { label: '삭제', run: () => remove(item.id) },
              }),
            ]
          }
          if (col.formula) return [col.colId, formulaCell(col.formula)]
          return [
            col.colId,
            col.editable
              ? inputCell(item[col.colId], (value) =>
                  setList((l) =>
                    l.map((i) =>
                      i.id === item.id ? { ...i, [col.colId]: value } : i,
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
  spec: FieldsConfig<TState[TKey]>,
  opts: { labelCol?: string; valueCol?: string; label?: string } = {},
): RowsNode<TState> {
  return (ctx) => {
    ctx.declareGroup(key, opts.label ?? key)
    const cols = contentColumns(ctx)
    const labelCol = opts.labelCol ?? cols[0].colId
    const valueCol = opts.valueCol ?? cols[1].colId
    const object = read(ctx.state, key) as Slice
    const entries = Object.entries(
      spec as unknown as Record<string, FieldConfig | undefined>,
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
  tags: Tags = 'subtotal',
): RowsNode<TState> {
  return (ctx) => {
    const groups = Array.isArray(keys) ? keys : [keys]
    return [
      {
        id,
        tags,
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

// A full width row holding a button that appends a new item to the list
// `key` of this sheet (made by its `items(key, { create })`). One place for
// such a button; `useList` / `useFocusedList` put one anywhere else.
export function addRow<TState extends object, TKey extends ListKey<TState>>(
  id: string,
  key: TKey,
  text: string,
): RowsNode<TState> {
  return (ctx) => [
    {
      id,
      tags: 'add-row',
      cells: {},
      fullWidth: {
        kind: 'action',
        label: text,
        run: () => void ctx.list(key)?.insert?.(),
        list: `${ctx.sheetId}/@${key}`,
      },
    },
  ]
}

// Any other special row. `type` overrides the column type for every cell of
// the row that does not set its own (label cells should use `labelCell`).
export function row<TState extends object>(
  id: string,
  opts: { label?: string; tags?: Tags; type?: CellType },
  cells: (ctx: Parameters<RowsNode<TState>>[0]) => Record<string, CellSpec>,
): RowsNode<TState> {
  return (ctx) => [
    {
      id,
      label: opts.label,
      tags: opts.tags,
      type: opts.type,
      cells: cells(ctx),
    },
  ]
}
