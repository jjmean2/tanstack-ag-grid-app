import type { BuildCtx, Cell, LayoutNode, SheetLeaf, SheetRow } from './types'

function valueOf<T extends { id: string }>(col: SheetLeaf<T>, item: T) {
  return col.derive
    ? col.derive(item)
    : (item as Record<string, unknown>)[col.colId]
}

function sumOf<T extends { id: string }>(
  ctx: BuildCtx<T>,
  items: readonly T[],
  colId: string,
) {
  const col = ctx.columns.find((c) => c.colId === colId)
  if (!col) throw new Error(`Unknown column: ${colId}`)
  return items.reduce((acc, item) => acc + (Number(valueOf(col, item)) || 0), 0)
}

// Section title row: the title sits in the first column and spans all columns.
export const title =
  <T extends { id: string }>(id: string, text: string): LayoutNode<T> =>
  (ctx) => [
    {
      id,
      kind: 'title',
      className: 'sheet-title',
      cells: {
        [ctx.columns[0].colId]: { value: text, span: ctx.columns.length },
      },
    },
  ]

// Expands the server items matching `pick` into data rows.
export const items =
  <T extends { id: string }>(pick: (item: T) => boolean): LayoutNode<T> =>
  (ctx) =>
    ctx.items.filter(pick).map((item) => ({
      id: item.id,
      kind: 'data',
      cells: Object.fromEntries(
        ctx.columns.map((col): [string, Cell] => [
          col.colId,
          {
            value: valueOf(col, item),
            edit:
              col.editable && !col.derive
                ? { scope: 'item', id: item.id, field: col.colId }
                : undefined,
          },
        ]),
      ),
    }))

// Subtotal / total row: per-column sums over the items matching `pick`.
export const subtotal =
  <T extends { id: string }>(
    id: string,
    label: string,
    pick: (item: T) => boolean,
    sumCols: string[],
    className = 'sheet-subtotal',
  ): LayoutNode<T> =>
  (ctx) => {
    const scope = ctx.items.filter(pick)
    return [
      {
        id,
        kind: 'subtotal',
        className,
        cells: {
          [ctx.columns[0].colId]: { value: label },
          ...Object.fromEntries(
            sumCols.map((colId): [string, Cell] => [
              colId,
              { value: sumOf(ctx, scope, colId) },
            ]),
          ),
        },
      },
    ]
  }

// Any other special row (input rows, difference rows, ...).
export const row =
  <T extends { id: string }>(
    id: string,
    className: string | undefined,
    cells: (ctx: BuildCtx<T>) => Record<string, Cell>,
  ): LayoutNode<T> =>
  (ctx) => [{ id, kind: 'custom', className, cells: cells(ctx) }]

export function buildRows<T extends { id: string }>(
  layout: LayoutNode<T>[],
  base: Omit<BuildCtx<T>, 'get'>,
): SheetRow[] {
  const built = new Map<string, SheetRow>()
  const ctx: BuildCtx<T> = {
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
