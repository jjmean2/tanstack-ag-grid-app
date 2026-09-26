import type { FormatId } from './formats'

// Where an edited cell writes its value back to.
export type EditTarget =
  | { scope: 'item'; id: string; field: string } // a field of a server item
  | { scope: 'input'; key: string } // the user-input store

// A fully resolved cell. Rows carry these so the grid column definitions do
// not need to know what kind of row they are rendering.
export type Cell = {
  value: unknown
  format?: FormatId // falls back to the column's format
  span?: number // number of columns to span to the right
  className?: string
  edit?: EditTarget // present = editable, and says where to write back
}

export type SheetRow = {
  id: string
  kind: string // informational (styling, debugging); never branched on by columns
  className?: string
  cells: Record<string, Cell> // key = colId; a missing key renders an empty cell
}

export type SheetLeaf<T> = {
  colId: string
  headerName: string
  format: FormatId
  flex?: number
  editable?: boolean
  derive?: (item: T) => unknown // computed column, not stored on the item
}

export type SheetGroup<T> = {
  headerName: string
  children: SheetColumnDef<T>[]
}

export type SheetColumnDef<T> = SheetLeaf<T> | SheetGroup<T>

export type BuildCtx<T> = {
  items: readonly T[]
  columns: SheetLeaf<T>[] // leaf columns, groups flattened
  inputs: Record<string, unknown>
  // Value of a cell in a row built earlier (top-to-bottom references only).
  get: (rowId: string, colId: string) => unknown
}

// A layout node produces zero or more rows.
export type LayoutNode<T> = (ctx: BuildCtx<T>) => SheetRow[]
