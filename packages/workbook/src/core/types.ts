import type { CellType } from './cell-types'
import type { Scalar } from './formula/functions'

// Addresses: `sheet/row/col` is one cell; `sheet/@group/col` is every data row
// of a group (a list) in that column; `ext:screen/name` is a value another
// screen exports.
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
  // Vertically adjacent cells of a `spanRows` column with the same key merge
  // into one (the top one is shown). Read-only cells only.
  rowSpan?: string
  className?: string | ClassFn
  action?: { label: string; run: () => void } // renders a button
}

// A row drawn across the whole grid instead of in columns (an AG Grid full
// width row): structure such as a section title or an add button. It has no
// cells, so nothing can reference it and it never crosses a merged column.
export type FullWidthContent =
  | { kind: 'title'; text: string }
  | { kind: 'action'; label: string; run: () => void }

export type RowSpec = {
  id: string
  kind: string // informational (styling, debugging); never branched on by the grid
  className?: string
  group?: string // makes the row part of a list that formulas can reference
  type?: CellType // row-level type override
  cells: Record<string, CellSpec> // key = colId; a missing key renders an empty cell
  fullWidth?: FullWidthContent // then `cells` must be empty
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
  rowSpan?: string
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
  fullWidth?: FullWidthContent
}

export type SheetLeaf = {
  colId: string
  headerName: string
  type: CellType // column default type
  flex?: number
  width?: number
  editable?: boolean // data rows of this column are editable
  formula?: string // data rows of this column are this formula (`[.col]` = same row)
  // Cells of this column can merge down (`CellSpec.rowSpan`), e.g. a section
  // label on the left of a block. AG Grid: such a column can neither span
  // across nor be edited, and no other cell's span may cover it.
  spanRows?: boolean
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

// A list-like sheet: rows × columns, drawn by AG Grid (`SheetGrid`).
export type GridSheetDef<TState> = {
  kind?: 'grid'
  id: string
  title: string
  tab: string // the tab that shows this sheet (used by reference navigation)
  columns: SheetColumnDef[]
  layout: LayoutNode<TState>[]
}

// --- form sheets -----------------------------------------------------------

// A box of a form sheet's grid: 1-based row and column, and how many rows and
// columns it covers. Boxes may be any rectangle; they must not overlap.
export type Place = [
  row: number,
  col: number,
  rowSpan?: number,
  colSpan?: number,
]

// How a box looks; the renderer maps it to styles.
export type Look = 'title' | 'head' | 'label' | 'num' | 'shade' | 'strong'

export type FormItem =
  // Fixed text (not a cell: nothing references it).
  | { at: Place; text: string; look?: Look }
  // A cell, at the address `<sheet>/<ref>` (`ref` = `row/col`). `name` is the
  // row's readable name, used by the formula bar.
  | { at: Place; ref: string; cell: CellSpec; name?: string; look?: Look }

export type FormCtx<TState> = {
  state: TState
  sheetId: string
  update: Update<TState>
}

export type FormNode<TState> = (ctx: FormCtx<TState>) => FormItem[]

// A form-like sheet: boxes placed on a grid, as on a paper form, drawn with
// CSS grid (`FormSheet`). Its cells are workbook cells like any other.
export type FormSheetDef<TState> = {
  kind: 'form'
  id: string
  title: string
  tab: string
  tracks: string[] // column sizes, as CSS grid tracks
  colNames?: Record<string, string> // readable names of column ids
  layout: FormNode<TState>[]
}

export type SheetDef<TState> = GridSheetDef<TState> | FormSheetDef<TState>

export type FormView = {
  tracks: string[]
  items: { at: Place; text?: string; address?: Address; look?: Look }[]
}

export type WorkbookDef<TState> = {
  sheets: SheetDef<TState>[]
  // Values other screens may reference as `[ext:<this screen>/<name>]`.
  exports: Record<string, Address>
}

// --- other screens ---------------------------------------------------------

// A value a screen publishes for other screens. It is saved with the screen,
// so it can be read without loading that screen.
export type ExportedValue = {
  value: Scalar // as formulas see it (dates as serials)
  text: string // as the source screen shows it
  error?: string
  label: string // readable name in the source screen
  address: Address // the cell it comes from, in the source screen
}

export type ScreenExports = {
  screen: string
  title: string
  savedAt: string // ISO timestamp
  values: Record<string, ExportedValue>
}

export type ExternalValue = ExportedValue & {
  screen: string
  screenTitle: string
  savedAt: string
}

// Looks up a value another screen exported; undefined when it is not saved.
export type Externals = (
  screen: string,
  name: string,
) => ExternalValue | undefined

// A reference to another screen made by a formula of this workbook.
export type ExternalRef = {
  address: Address
  screen: string
  name: string
  value?: ExternalValue // missing when that screen has not saved it
}

export type SheetView = {
  id: string
  title: string
  tab: string
  columns: SheetColumnDef[] // empty for a form sheet
  rows: ResolvedRow[] // empty for a form sheet
  form?: FormView // form sheets only
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
  // What this workbook publishes (`WorkbookDef.exports`), evaluated.
  exports: Record<string, ExportedValue>
  // What it reads from other screens.
  external: (address: Address) => ExternalValue | undefined
  externalRefs: ExternalRef[]
}
