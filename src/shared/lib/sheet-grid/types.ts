import type { FormatId } from '../sheet/formats'

// A fully resolved cell. Rows carry these, so the grid column definitions do
// not need to know what kind of row they are rendering.
export type Cell = {
  value: unknown
  format?: FormatId // falls back to the column's format
  span?: number // number of columns to span to the right
  className?: string
  edit?: (value: unknown) => void // present = editable; writes to the store
  action?: { label: string; run: () => void } // renders a button instead of a value
}

export type SheetRow = {
  id: string
  kind: string // informational (styling, debugging); never branched on by columns
  className?: string
  cells: Record<string, Cell> // key = colId; a missing key renders an empty cell
}

export type SheetLeaf<T = never> = {
  colId: string
  headerName: string
  format: FormatId
  flex?: number
  width?: number
  editable?: boolean // data rows of this column are editable
  derive?: (item: T) => unknown // computed column, not stored on the item
}

export type SheetGroup<T = never> = {
  headerName: string
  children: SheetColumnDef<T>[]
}

export type SheetColumnDef<T = never> = SheetLeaf<T> | SheetGroup<T>

export type BuildCtx<TState> = {
  state: TState
  columns: SheetLeaf[] // leaf columns, groups flattened
  update: (updater: (state: TState) => TState) => void
  // Value of a cell in a row built earlier (top-to-bottom references only).
  get: (rowId: string, colId: string) => unknown
}

// A layout node produces zero or more rows from the session state.
export type LayoutNode<TState> = (ctx: BuildCtx<TState>) => SheetRow[]
