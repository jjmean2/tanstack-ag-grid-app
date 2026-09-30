import type { CellType } from './cell-types'
import type { Scalar } from './formula/functions'

// The model, in three stages:
//
//   definition (…Def)   what a workbook is: sheets of columns and row nodes
//   spec (…Spec)        what row nodes produce from the state, per build
//   built (plain)       Workbook, Sheet, Row, Cell: what views and formulas see

// --- addresses ---------------------------------------------------------------

// `sheet/row/col` is one cell; `sheet/@group/col` is every data row of a group
// (a list) in that column; `ext:screen/name` is a value another screen exports.
export type Address = string

export type CellRef = { sheetId: string; rowId: string; colId: string }

// --- definition --------------------------------------------------------------

export type LeafColumnDef = {
  colId: string
  headerName: string
  type: CellType // column default type
  flex?: number
  width?: number
  editable?: boolean // data rows (`items`) of this column are editable
  formula?: string // data rows of this column are this formula (`[.col]` = same row)
  // Grid: cells of this column can merge down (`CellSpec.rowSpan`), e.g. a
  // section label on the left of a block. Such a column can neither span
  // across nor be edited, and no other cell's span may cover it (AG Grid).
  spanRows?: boolean
}

export type ColumnGroupDef = {
  headerName: string
  children: ColumnDef[]
}

export type ColumnDef = LeafColumnDef | ColumnGroupDef

// A sheet is columns and rows. How it is laid out on screen is the view's
// business: a grid shows rows × columns, a form sheet places the cells in
// boxes (see `FormSheet`).
export type SheetDef<TState> = {
  id: string
  title: string
  columns: ColumnDef[]
  rows: RowsNode<TState>[]
}

export type WorkbookDef<TState> = {
  sheets: SheetDef<TState>[]
  // Values other screens may reference as `[ext:<this screen>/<name>]`.
  exports: Record<string, Address>
}

// --- specs: what row nodes produce ---------------------------------------------

export type Update<TState> = (updater: (state: TState) => TState) => void

export type RowsCtx<TState> = {
  state: TState
  update: Update<TState>
  sheetId: string
  columns: LeafColumnDef[] // leaf columns, groups flattened
  declareGroup: (id: string, label: string) => void
}

// Turns the session state into zero or more rows.
export type RowsNode<TState> = (ctx: RowsCtx<TState>) => RowSpec[]

// Tags: words that say what a cell or row *is* (`subtotal`, `input`, `pass`),
// never how it looks. Views mark them (`wb-tag-<tag>`); the app's theme styles
// them.
export type Tags = string | readonly string[]

// Chooses tags from evaluated values (e.g. `fail` when a check fails).
export type TagFn = (result: {
  value: unknown
  error?: string
  get: (address: Address) => unknown
}) => Tags | undefined

// Where a cell's value comes from (an axis separate from its data type).
export type CellSource =
  | { kind: 'value'; value: unknown; write?: (value: unknown) => void } // editable when `write` is set
  | { kind: 'formula'; formula: string } // fixed, read-only

export type CellSpec = {
  source: CellSource
  type?: CellType // cell-level type override
  tags?: Tags | TagFn
  action?: { label: string; run: () => void } // shown as a button
  // Grid layout hints (a form sheet places cells itself):
  span?: number // across
  rowSpan?: string // down: adjacent cells of a `spanRows` column with this key merge
}

// A grid row drawn across the whole grid instead of in columns (a section
// title, an add button). It has no cells.
export type FullWidthContent =
  | { kind: 'title'; text: string }
  | { kind: 'action'; label: string; run: () => void }

export type RowSpec = {
  id: string
  label?: string // readable name; else the first column's value
  tags?: Tags // apply to the row and every cell of it
  group?: string // makes the row part of a list that formulas can reference
  type?: CellType // row-level type override
  cells: Record<string, CellSpec> // key = colId; a missing key is an empty cell
  fullWidth?: FullWidthContent // then `cells` must be empty
}

// --- built ---------------------------------------------------------------------

export type FormulaPart = { text: string; target?: Address }

export type Cell = {
  address: Address
  sheetId: string
  rowId: string
  colId: string
  type: CellType // resolved: cell > row > column
  source: CellSource
  value: unknown // underlying value (evaluated result for formula cells)
  error?: string
  errorDetail?: string
  tags: string[] // its own, resolved
  rowTags: string[] // its row's
  action?: { label: string; run: () => void }
  span?: number
  rowSpan?: string
  // Formula cells: the text, split so references can be shown as links.
  formula?: { text: string; parts: FormulaPart[] }
}

export type Row = {
  id: string
  label?: string
  tags: string[]
  group?: string
  cells: Record<string, Cell>
  fullWidth?: FullWidthContent
}

export type Sheet = {
  id: string
  title: string
  columns: ColumnDef[]
  rows: Row[]
}

export type Workbook = {
  sheets: Record<string, Sheet | undefined>
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
  errors: { address: Address; code: string; detail?: string }[]
  structuralErrors: { address: Address; code: string; detail?: string }[]
  // What this workbook publishes (`WorkbookDef.exports`), evaluated.
  exports: Record<string, ExportedValue>
  // What it reads from other screens.
  external: (address: Address) => ExternalValue | undefined
  externalRefs: ExternalRef[]
}

// --- other screens ---------------------------------------------------------------

// A value a screen publishes for other screens, saved with it so it can be read
// without loading that screen.
export type ExportedValue = {
  value: Scalar // as formulas see it (dates as serials)
  text: string // as the source screen shows it
  error?: string
  label: string // readable name in the source screen
  address: Address // the cell it comes from, in the source screen
}

// Everything one screen published, as saved.
export type ScreenExports = {
  screen: string
  title: string
  savedAt: string // ISO timestamp
  values: Record<string, ExportedValue>
}

// The saved exports of the screens a workbook reads, by screen id.
export type SavedExports = Record<string, ScreenExports | undefined>

// One exported value as read by another screen.
export type ExternalValue = ExportedValue & {
  screen: string
  screenTitle: string
  savedAt: string
}

// A reference to another screen made by a formula of this workbook.
export type ExternalRef = {
  address: Address
  screen: string
  name: string
  value?: ExternalValue // missing when that screen has not saved it
}
