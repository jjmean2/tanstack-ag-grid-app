import type { CellType } from './cell-types'

// Addresses: `sheet/row/col` is one cell; `sheet/@group/col` is every data row
// of a group (a list) in that column.
export type Address = string

export type CellRef = { sheetId: string; rowId: string; colId: string }

// Where a cell's value comes from (an axis separate from its data type).
export type CellSource =
  | { kind: 'value'; value: unknown; write?: (value: unknown) => void } // editable when `write` is set
  | { kind: 'formula'; formula: string } // fixed, read-only

// Chooses a class from the evaluated values (e.g. red when a check fails).
export type ClassFn = (result: {
  value: unknown
  error?: string
  get: (address: Address) => unknown
}) => string | undefined

// What a layout node produces, before types are resolved and formulas run.
export type CellSpec = {
  source: CellSource
  type?: CellType // cell-level type override
  span?: number
  className?: string | ClassFn
  action?: { label: string; run: () => void } // renders a button
}

export type RowSpec = {
  id: string
  kind: string // informational (styling, debugging); never branched on by the grid
  className?: string
  group?: string // makes the row part of a list that formulas can reference
  type?: CellType // row-level type override
  cells: Record<string, CellSpec> // key = colId; a missing key renders an empty cell
}

export type FormulaPart = { text: string; target?: Address }

// A fully resolved cell: what the grid shows and what other cells reference.
export type Cell = {
  address: Address
  sheetId: string
  rowId: string
  colId: string
  type: CellType
  source: CellSource
  value: unknown // underlying value (evaluated result for formula cells)
  error?: string
  errorDetail?: string
  span?: number
  className?: string
  action?: { label: string; run: () => void }
  // Formula cells: the text, split so references can be shown as links.
  formula?: { text: string; parts: FormulaPart[] }
}

export type ResolvedRow = {
  id: string
  kind: string
  className?: string
  group?: string
  cells: Record<string, Cell>
}

export type SheetLeaf = {
  colId: string
  headerName: string
  type: CellType // column default type
  flex?: number
  width?: number
  editable?: boolean // data rows of this column are editable
  formula?: string // data rows of this column are this formula (`[.col]` = same row)
}

export type SheetGroup = {
  headerName: string
  children: SheetColumnDef[]
}

export type SheetColumnDef = SheetLeaf | SheetGroup

export type Update<TState> = (updater: (state: TState) => TState) => void

export type BuildCtx<TState> = {
  state: TState
  sheetId: string
  columns: SheetLeaf[] // leaf columns, groups flattened
  update: Update<TState>
  declareGroup: (id: string, label: string) => void
}

// A layout node produces zero or more rows from the session state.
export type LayoutNode<TState> = (ctx: BuildCtx<TState>) => RowSpec[]

export type SheetDef<TState> = {
  id: string
  title: string
  tab: string // the tab that shows this sheet (used by reference navigation)
  columns: SheetColumnDef[]
  layout: LayoutNode<TState>[]
}

export type WorkbookDef<TState> = { sheets: SheetDef<TState>[] }

export type SheetView = {
  id: string
  title: string
  tab: string
  columns: SheetColumnDef[]
  rows: ResolvedRow[]
}

export type Workbook = {
  sheets: Record<string, SheetView | undefined>
  cell: (address: Address) => Cell | undefined
  cells: (address: Address) => Cell[] // one cell, or the members of a group
  value: (address: Address) => unknown
  targets: (address: Address) => CellRef[]
  // A readable name for an address. What the viewer already knows is left out:
  // the sheet when `from` is on the same sheet, the row when on the same row.
  labelOf: (
    address: Address,
    from?: { sheetId: string; rowId: string },
  ) => string
  tabOf: (sheetId: string) => string | undefined
  errors: { address: Address; code: string; detail?: string }[]
  structuralErrors: { address: Address; code: string; detail?: string }[]
}
