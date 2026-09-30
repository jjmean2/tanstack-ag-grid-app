import {
  cellAddress,
  groupAddress,
  isExternalAddress,
  isGroupAddress,
  isRangeAddress,
  resolveRef,
  splitAddress,
  splitExternal,
  splitRange,
} from './address'
import { toTags } from './marks'
import type { CellType } from './cell-types'
import { FormulaError, STRUCTURAL_ERRORS } from './formula/errors'
import { evaluate } from './formula/evaluate'
import type { Arg, Scalar } from './formula/functions'
import { parseFormula } from './formula/parser'
import type { Parsed } from './formula/parser'
import type {
  Address,
  Cell,
  CellSpec,
  ColumnDef,
  ExportedValue,
  ExternalRef,
  ExternalValue,
  FormulaPart,
  LeafColumnDef,
  ListOps,
  Row,
  RowsCtx,
  SavedExports,
  Sheet,
  SheetDef,
  TagFn,
  Update,
  Workbook,
  WorkbookDef,
  WorkbookList,
} from './types'

// The columns that hold cells, column groups flattened.
export function leafColumns(defs: ColumnDef[]): LeafColumnDef[] {
  return defs.flatMap((d) => ('children' in d ? leafColumns(d.children) : [d]))
}

// `exports` names the cells other screens may reference as
// `[ext:<screen>/<name>]`, so they depend on a name rather than on the layout.
export function defineWorkbook<TState>(
  sheets: SheetDef<TState>[],
  opts: { exports?: Record<string, Address> } = {},
): WorkbookDef<TState> {
  const ids = new Set<string>()
  for (const sheet of sheets) {
    if (/[/:]/.test(sheet.id))
      throw new Error(`Sheet id must not contain "/" or ":": ${sheet.id}`)
    for (const leaf of leafColumns(sheet.columns))
      if (/[/:]/.test(leaf.colId))
        throw new Error(
          `Column id must not contain "/" or ":": ${sheet.id}/${leaf.colId}`,
        )
    if (ids.has(sheet.id)) throw new Error(`Duplicate sheet id: ${sheet.id}`)
    ids.add(sheet.id)
  }
  return { sheets, exports: opts.exports ?? {} }
}

// Splits the formula text around its references, so each reference can be shown
// as a link to the cell (or list) it points at.
function toParts(
  parsed: Parsed,
  from: { sheetId: string; rowId: string },
): FormulaPart[] {
  const parts: FormulaPart[] = []
  let pos = 0
  for (const ref of parsed.refs) {
    if (ref.start > pos) parts.push({ text: parsed.text.slice(pos, ref.start) })
    let target: Address | undefined
    try {
      target = resolveRef(ref, from)
    } catch {
      target = undefined
    }
    parts.push({ text: ref.raw, target })
    pos = ref.end
  }
  if (pos < parsed.text.length) parts.push({ text: parsed.text.slice(pos) })
  return parts
}

// Builds every sheet from the session state (no view involved), then evaluates
// all formulas, which may reference cells of any sheet, and values other
// screens saved (`externals`). `update` is what editable cells write through.
export function buildWorkbook<TState>(
  def: WorkbookDef<TState>,
  state: TState,
  opts: { update?: Update<TState>; externals?: SavedExports } = {},
): Workbook {
  const update: Update<TState> = opts.update ?? (() => {})
  const saved = opts.externals ?? {}
  const cells = new Map<Address, Cell>()
  const members = new Map<Address, Cell[]>() // group address -> its cells
  const declaredGroups = new Map<string, string>() // `sheet/@group` -> label
  const listOps = new Map<string, ListOps>() // `sheet/@list` -> what it allows
  const leafsBySheet = new Map<string, LeafColumnDef[]>()
  const rowLabels = new Map<string, string>() // `sheet/row` -> RowSpec.label
  const sheets: Record<string, Sheet | undefined> = {}
  const formulaCells: Cell[] = []
  const tagFns: { cell: Cell; fn: TagFn }[] = []

  // Makes a cell findable by formulas, lookups and views.
  const register = (
    address: Address,
    ids: { sheetId: string; rowId: string; colId: string },
    type: CellType,
    spec: CellSpec,
    rowTags: string[] = [],
  ): Cell => {
    if (cells.has(address)) throw new Error(`Duplicate cell ${address}`)
    const { source } = spec
    const override = source.kind === 'formula' ? source.override : undefined
    const active = override !== undefined && override.value !== undefined
    const cell: Cell = {
      address,
      ...ids,
      type,
      source,
      // A formula cell gets its value when formulas are evaluated, unless a
      // person's value overrides it.
      value: source.kind === 'value' ? source.value : override?.value,
      write: source.kind === 'value' ? source.write : override?.write,
      override: override && {
        active,
        revert: () => {
          if (active) override.write(undefined)
        },
      },
      span: spec.span,
      rowSpan: spec.rowSpan,
      tags: [],
      rowTags,
      action: spec.action,
    }
    // Tags that depend on evaluated values are chosen after evaluation.
    if (typeof spec.tags === 'function') tagFns.push({ cell, fn: spec.tags })
    else cell.tags = toTags(spec.tags)
    cells.set(address, cell)
    if (cell.source.kind === 'formula') formulaCells.push(cell)
    return cell
  }

  // 1) Build the rows of every sheet and resolve each cell's type.
  for (const sheet of def.sheets) {
    const leafs = leafColumns(sheet.columns)
    leafsBySheet.set(sheet.id, leafs)
    const leafById = new Map(leafs.map((leaf) => [leaf.colId, leaf]))
    const indexOf = new Map(leafs.map((leaf, i) => [leaf.colId, i]))

    const ctx: RowsCtx<TState> = {
      state,
      sheetId: sheet.id,
      columns: leafs,
      update,
      declareGroup: (id, label, list) => {
        declaredGroups.set(`${sheet.id}/@${id}`, label)
        if (list) listOps.set(`${sheet.id}/@${id}`, list)
      },
      list: (id) => listOps.get(`${sheet.id}/@${id}`),
    }
    const specs = sheet.rows.flatMap((node) => node(ctx))

    const seen = new Set<string>()
    const rows = specs.map((spec): Row => {
      // "/" separates the parts of an address, ":" the corners of a range.
      if (/[/:]/.test(spec.id))
        throw new Error(`Row id must not contain "/" or ":": ${spec.id}`)
      if (seen.has(spec.id)) {
        throw new Error(`Duplicate row id "${spec.id}" in sheet "${sheet.id}"`)
      }
      seen.add(spec.id)
      if (spec.fullWidth && Object.keys(spec.cells).length > 0)
        throw new Error(
          `A full width row has no cells: row "${spec.id}" of sheet "${sheet.id}"`,
        )

      if (spec.label) rowLabels.set(`${sheet.id}/${spec.id}`, spec.label)
      const rowTags = toTags(spec.tags)
      const rowCells: Record<string, Cell> = {}
      for (const [colId, cellSpec] of Object.entries(spec.cells)) {
        const leaf = leafById.get(colId)
        if (!leaf)
          throw new Error(
            `Unknown column "${colId}" in sheet "${sheet.id}", row "${spec.id}"`,
          )

        // Only built for an error message (this runs for every cell).
        const where = () =>
          `column "${colId}" of sheet "${sheet.id}", row "${spec.id}"`
        if (cellSpec.rowSpan !== undefined && !leaf.spanRows)
          throw new Error(`rowSpan needs a spanRows column: ${where()}`)
        // AG Grid: a column that merges down can neither be edited nor span.
        // Nor may another cell's span cover it.
        const span = cellSpec.span ?? 1
        if (leaf.spanRows) {
          const { source } = cellSpec
          if (source.kind === 'value' ? source.write : source.override)
            throw new Error(`A spanRows column cannot be editable: ${where()}`)
          if (span > 1)
            throw new Error(`A spanRows column cannot span across: ${where()}`)
        }
        if (span > 1) {
          const from = indexOf.get(colId)! + 1
          if (leafs.slice(from, from + span - 1).some((l) => l.spanRows))
            throw new Error(`A span cannot cover a spanRows column: ${where()}`)
        }

        const cell = register(
          cellAddress(sheet.id, spec.id, colId),
          { sheetId: sheet.id, rowId: spec.id, colId },
          // The type is chosen here: cell > row > column.
          cellSpec.type ?? spec.type ?? leaf.type,
          cellSpec,
          rowTags,
        )
        rowCells[colId] = cell
        if (spec.group) {
          const key = groupAddress(sheet.id, spec.group, colId)
          const list = members.get(key)
          if (list) list.push(cell)
          else members.set(key, [cell])
        }
      }
      return {
        id: spec.id,
        label: spec.label,
        tags: rowTags,
        group: spec.group,
        cells: rowCells,
        fullWidth: spec.fullWidth,
      }
    })

    sheets[sheet.id] = {
      id: sheet.id,
      title: sheet.title,
      columns: sheet.columns,
      rows,
    }
  }

  // 2) Evaluate formulas lazily, with memoisation and cycle detection.
  const results = new Map<
    Address,
    { ok: true; value: Scalar } | { ok: false; error: FormulaError }
  >()
  const visiting = new Set<Address>()

  const readGroup = (address: Address): Scalar[] => {
    const { sheetId, rowId, colId } = splitAddress(address)
    const known =
      declaredGroups.has(`${sheetId}/${rowId}`) &&
      leafsBySheet.get(sheetId)?.some((leaf) => leaf.colId === colId)
    if (!known) throw new FormulaError('#REF!', address)
    return (members.get(address) ?? []).map(valueOfCell)
  }

  // A range's cells, row by row: rows between its corners in the order the
  // sheet shows them (full width rows have no cells and are left out), columns
  // between them in column order. A position with no cell is undefined.
  const rowOrder = new Map<string, Map<string, number>>()
  const rangeCells = (address: Address): (Cell | undefined)[] => {
    const { from, to } = splitRange(address)
    const a = splitAddress(from)
    const b = splitAddress(to)
    const sheet = sheets[a.sheetId]
    const leafs = leafsBySheet.get(a.sheetId)
    if (!sheet || !leafs) throw new FormulaError('#REF!', address)
    let order = rowOrder.get(sheet.id)
    if (!order) {
      order = new Map(sheet.rows.map((row, i) => [row.id, i]))
      rowOrder.set(sheet.id, order)
    }
    const rows = [order.get(a.rowId), order.get(b.rowId)]
    const cols = [a.colId, b.colId].map((id) =>
      leafs.findIndex((leaf) => leaf.colId === id),
    )
    if (rows.some((i) => i === undefined) || cols.some((i) => i < 0))
      throw new FormulaError('#REF!', address)
    const [r1, r2] = (rows as number[]).sort((x, y) => x - y)
    const [c1, c2] = cols.sort((x, y) => x - y)
    const colIds = leafs.slice(c1, c2 + 1).map((leaf) => leaf.colId)
    return sheet.rows
      .slice(r1, r2 + 1)
      .filter((row) => !row.fullWidth)
      .flatMap((row) => colIds.map((colId) => row.cells[colId]))
  }
  // Empty positions are blanks, so lists of one range line up with another's
  // (SUMIF over two ranges of the same rows).
  const readRange = (address: Address): Scalar[] =>
    rangeCells(address).map((cell) => (cell ? valueOfCell(cell) : null))

  // Another screen's exported value, as it saved it.
  const external = (address: Address): ExternalValue | undefined => {
    if (!isExternalAddress(address)) return undefined
    const { screen, name } = splitExternal(address)
    const snapshot = saved[screen]
    const value = snapshot?.values[name]
    if (!snapshot || !value) return undefined
    return {
      ...value,
      screen,
      screenTitle: snapshot.title,
      savedAt: snapshot.savedAt,
    }
  }

  const externalRefs = new Map<Address, ExternalRef>()
  const readExternal = (address: Address): Scalar => {
    const { screen, name } = splitExternal(address)
    const value = external(address)
    externalRefs.set(address, { address, screen, name, value })
    if (!value) throw new FormulaError('#EXT!', `${address} is not saved`)
    if (value.error)
      throw new FormulaError('#EXT!', `${address} is ${value.error}`)
    return value.value
  }

  const readRef = (ref: Parameters<typeof resolveRef>[0], from: Cell): Arg => {
    const address = resolveRef(ref, from)
    if (isExternalAddress(address)) return readExternal(address)
    if (isRangeAddress(address)) return readRange(address)
    if (isGroupAddress(address)) return readGroup(address)
    const target = cells.get(address)
    if (!target) throw new FormulaError('#REF!', address)
    return valueOfCell(target)
  }

  // The value dependants see: dates as serials, and so on. A person's value
  // overriding a formula is what dependants see; its formula is evaluated on
  // its own (below), so it cannot make a cycle.
  function valueOfCell(cell: Cell): Scalar {
    if (cell.source.kind === 'value' || cell.override?.active)
      return cell.type.toEval(cell.value)
    return evaluateFormula(cell)
  }

  // Evaluates a formula cell: into the cell's value (or error), or, while a
  // person's value overrides it, into `override.computed`.
  function evaluateFormula(cell: Cell): Scalar {
    if (cell.source.kind !== 'formula') return cell.type.toEval(cell.value)
    const overridden = cell.override?.active ? cell.override : undefined
    const memo = results.get(cell.address)
    if (memo) {
      if (memo.ok) return memo.value
      throw memo.error
    }
    if (visiting.has(cell.address))
      throw new FormulaError('#CYCLE!', cell.address)

    visiting.add(cell.address)
    try {
      const parsed = parseFormula(cell.source.formula)
      if (parsed instanceof FormulaError) throw parsed
      cell.formula = { text: parsed.text, parts: toParts(parsed, cell) }
      const result = evaluate(parsed.ast, { ref: (ref) => readRef(ref, cell) })
      const value = cell.type.fromEval(result)
      if (overridden) overridden.computed = { value }
      else cell.value = value
      const seen = cell.type.toEval(value)
      results.set(cell.address, { ok: true, value: seen })
      return seen
    } catch (error) {
      if (!(error instanceof FormulaError)) throw error
      const errorDetail =
        error.message === error.code ? undefined : error.message
      if (overridden)
        overridden.computed = {
          value: undefined,
          error: error.code,
          errorDetail,
        }
      else {
        cell.error = error.code
        cell.errorDetail = errorDetail
        cell.value = undefined
      }
      if (!cell.formula)
        cell.formula = {
          text: cell.source.formula,
          parts: [{ text: cell.source.formula }],
        }
      results.set(cell.address, { ok: false, error })
      throw error
    } finally {
      visiting.delete(cell.address)
    }
  }

  for (const cell of formulaCells) {
    try {
      evaluateFormula(cell)
    } catch (error) {
      if (!(error instanceof FormulaError)) throw error
    }
  }

  // 3) Tags that depend on evaluated values.
  const get = (address: Address) => cells.get(address)?.value
  for (const { cell, fn } of tagFns) {
    cell.tags = toTags(fn({ value: cell.value, error: cell.error, get }))
  }

  // --- lookups ---------------------------------------------------------------

  const errors = [...cells.values()]
    .filter((cell) => cell.error)
    .map((cell) => ({
      address: cell.address,
      code: cell.error!,
      detail: cell.errorDetail,
    }))
  const structuralErrors = errors.filter((e) =>
    (STRUCTURAL_ERRORS as readonly string[]).includes(e.code),
  )

  // A row is named by its label, else by its first column past merged section
  // labels (which are the same for every row of a block).
  const rowLabelOf = (sheetId: string, rowId: string) => {
    const label = rowLabels.get(`${sheetId}/${rowId}`)
    if (label) return label
    const first = leafsBySheet.get(sheetId)?.find((leaf) => !leaf.spanRows)
    const cell = first && cells.get(cellAddress(sheetId, rowId, first.colId))
    const text = cell ? cell.type.format(cell.value) : ''
    return text || '(이름 없음)'
  }

  const listAt = (address: Address): WorkbookList | undefined => {
    const ops = listOps.get(address)
    if (!ops) return undefined
    const [sheetId = '', group = ''] = address.split('/@')
    const leafs = leafsBySheet.get(sheetId) ?? []
    const firstCol = ops.editableCols.at(0) ?? leafs.at(0)?.colId ?? ''
    const { insert } = ops
    return {
      address,
      sheetId,
      label: declaredGroups.get(address) ?? group,
      rowIds: (sheets[sheetId]?.rows ?? [])
        .filter((row) => row.group === group)
        .map((row) => row.id),
      canInsert: insert !== undefined,
      canRemove: ops.remove !== undefined,
      insert: (at, column) =>
        insert && {
          sheetId,
          rowId: insert(at),
          colId:
            column !== undefined && ops.editableCols.includes(column)
              ? column
              : firstCol,
        },
      remove: (rowId) => ops.remove?.(rowId),
    }
  }

  const workbook: Workbook = {
    list: listAt,
    listOf: ({ sheetId, rowId }) => {
      const group = sheets[sheetId]?.rows.find((row) => row.id === rowId)?.group
      return group === undefined ? undefined : listAt(`${sheetId}/@${group}`)
    },
    sheets,
    cell: (address) => cells.get(address),
    cells: (address) => {
      if (isRangeAddress(address)) {
        try {
          return rangeCells(address).filter((c): c is Cell => c !== undefined)
        } catch {
          return []
        }
      }
      if (isGroupAddress(address)) return members.get(address) ?? []
      const cell = cells.get(address)
      return cell ? [cell] : []
    },
    value: (address) => cells.get(address)?.value,
    targets: (address) =>
      workbook
        .cells(address)
        .map(({ sheetId, rowId, colId }) => ({ sheetId, rowId, colId })),
    labelOf: (address, from) => {
      if (isExternalAddress(address)) {
        const value = external(address)
        const { screen, name } = splitExternal(address)
        return value
          ? `${value.screenTitle} › ${value.label}`
          : `${screen} › ${name}`
      }
      if (isRangeAddress(address)) {
        // "first ~ last", naming the sheet once.
        const { from: a, to: b } = splitRange(address)
        const sheetId = splitAddress(a).sheetId
        return `${workbook.labelOf(a, from)} ~ ${workbook.labelOf(b, { sheetId, rowId: '' })}`
      }
      const { sheetId, rowId, colId } = splitAddress(address)
      const header =
        leafsBySheet.get(sheetId)?.find((leaf) => leaf.colId === colId)
          ?.headerName || colId
      const sameSheet = from?.sheetId === sheetId
      if (sameSheet && from.rowId === rowId) return header
      const rowLabel = rowId.startsWith('@')
        ? (declaredGroups.get(`${sheetId}/${rowId}`) ?? rowId.slice(1))
        : rowLabelOf(sheetId, rowId)
      const sheetPart = sameSheet ? [] : [sheets[sheetId]?.title ?? sheetId]
      return [...sheetPart, rowLabel, header].join(' › ')
    },
    errors,
    structuralErrors,
    exports: {},
    external,
    externalRefs: [...externalRefs.values()],
  }

  // Exports are evaluated last: their labels come from `labelOf`.
  for (const [name, address] of Object.entries(def.exports)) {
    const cell = cells.get(address)
    if (!cell) {
      const error = { address, code: '#REF!', detail: `export "${name}"` }
      errors.push(error)
      structuralErrors.push(error)
    }
    const exported: ExportedValue = cell
      ? {
          value: cell.error ? null : cell.type.toEval(cell.value),
          text: cell.error ?? cell.type.format(cell.value),
          error: cell.error,
          label: workbook.labelOf(address),
          address,
        }
      : { value: null, text: '#REF!', error: '#REF!', label: name, address }
    workbook.exports[name] = exported
  }
  return workbook
}
