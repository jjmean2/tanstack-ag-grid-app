import {
  cellAddress,
  groupAddress,
  isExternalAddress,
  isGroupAddress,
  resolveRef,
  splitAddress,
  splitExternal,
} from './address'
import { FormulaError, STRUCTURAL_ERRORS } from './formula/errors'
import { evaluate } from './formula/evaluate'
import type { Arg, Scalar } from './formula/functions'
import { parseFormula } from './formula/parser'
import type { Parsed } from './formula/parser'
import type {
  Address,
  BuildCtx,
  Cell,
  ClassFn,
  ExportedValue,
  ExternalRef,
  Externals,
  FormulaPart,
  ResolvedRow,
  SheetColumnDef,
  SheetDef,
  SheetLeaf,
  SheetView,
  Update,
  Workbook,
  WorkbookDef,
} from './types'

export function flattenLeafs(defs: SheetColumnDef[]): SheetLeaf[] {
  return defs.flatMap((d) => ('children' in d ? flattenLeafs(d.children) : [d]))
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

// Builds every sheet from the session state (no grid involved), then evaluates
// all formulas, which may reference cells of any sheet, and values other
// screens exported (`externals`).
export function buildWorkbook<TState>(
  def: WorkbookDef<TState>,
  state: TState,
  update: Update<TState>,
  externals: Externals = () => undefined,
): Workbook {
  const cells = new Map<Address, Cell>()
  const members = new Map<Address, Cell[]>() // group address -> its cells
  const declaredGroups = new Map<string, string>() // `sheet/@group` -> label
  const leafsBySheet = new Map<string, SheetLeaf[]>()
  const sheets: Record<string, SheetView | undefined> = {}
  const formulaCells: Cell[] = []
  const classFns: { cell: Cell; fn: ClassFn }[] = []

  // 1) Build the rows of every sheet and resolve each cell's type.
  for (const sheet of def.sheets) {
    const leafs = flattenLeafs(sheet.columns)
    leafsBySheet.set(sheet.id, leafs)
    const leafById = new Map(leafs.map((leaf) => [leaf.colId, leaf]))

    const ctx: BuildCtx<TState> = {
      state,
      sheetId: sheet.id,
      columns: leafs,
      update,
      declareGroup: (id, label) => {
        declaredGroups.set(`${sheet.id}/@${id}`, label)
      },
    }
    const specs = sheet.layout.flatMap((node) => node(ctx))

    const seen = new Set<string>()
    const rows = specs.map((spec): ResolvedRow => {
      if (spec.id.includes('/'))
        throw new Error(`Row id must not contain "/": ${spec.id}`)
      if (seen.has(spec.id)) {
        throw new Error(`Duplicate row id "${spec.id}" in sheet "${sheet.id}"`)
      }
      seen.add(spec.id)

      const rowCells: Record<string, Cell> = {}
      for (const [colId, cellSpec] of Object.entries(spec.cells)) {
        const leaf = leafById.get(colId)
        if (!leaf)
          throw new Error(
            `Unknown column "${colId}" in sheet "${sheet.id}", row "${spec.id}"`,
          )

        const address = cellAddress(sheet.id, spec.id, colId)
        const cell: Cell = {
          address,
          sheetId: sheet.id,
          rowId: spec.id,
          colId,
          // The type is chosen here: cell > row > column.
          type: cellSpec.type ?? spec.type ?? leaf.type,
          source: cellSpec.source,
          value:
            cellSpec.source.kind === 'value'
              ? cellSpec.source.value
              : undefined,
          span: cellSpec.span,
          action: cellSpec.action,
        }
        if (typeof cellSpec.className === 'function') {
          classFns.push({ cell, fn: cellSpec.className })
        } else {
          cell.className = cellSpec.className
        }
        cells.set(address, cell)
        rowCells[colId] = cell
        if (cell.source.kind === 'formula') formulaCells.push(cell)
        if (spec.group) {
          const key = groupAddress(sheet.id, spec.group, colId)
          members.set(key, [...(members.get(key) ?? []), cell])
        }
      }
      return {
        id: spec.id,
        kind: spec.kind,
        className: spec.className,
        group: spec.group,
        cells: rowCells,
      }
    })

    sheets[sheet.id] = {
      id: sheet.id,
      title: sheet.title,
      tab: sheet.tab,
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

  const externalRefs = new Map<Address, ExternalRef>()
  const readExternal = (address: Address): Scalar => {
    const { screen, name } = splitExternal(address)
    const value = externals(screen, name)
    externalRefs.set(address, { address, screen, name, value })
    if (!value) throw new FormulaError('#EXT!', `${address} is not saved`)
    if (value.error)
      throw new FormulaError('#EXT!', `${address} is ${value.error}`)
    return value.value
  }

  const readRef = (ref: Parameters<typeof resolveRef>[0], from: Cell): Arg => {
    const address = resolveRef(ref, from)
    if (isExternalAddress(address)) return readExternal(address)
    if (isGroupAddress(address)) return readGroup(address)
    const target = cells.get(address)
    if (!target) throw new FormulaError('#REF!', address)
    return valueOfCell(target)
  }

  // The value dependants see: dates as serials, and so on.
  function valueOfCell(cell: Cell): Scalar {
    if (cell.source.kind === 'value') return cell.type.toEval(cell.value)

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
      cell.value = cell.type.fromEval(result)
      const seen = cell.type.toEval(cell.value)
      results.set(cell.address, { ok: true, value: seen })
      return seen
    } catch (error) {
      if (!(error instanceof FormulaError)) throw error
      cell.error = error.code
      cell.errorDetail =
        error.message === error.code ? undefined : error.message
      cell.value = undefined
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
      valueOfCell(cell)
    } catch (error) {
      if (!(error instanceof FormulaError)) throw error
    }
  }

  // 3) Classes that depend on evaluated values.
  const get = (address: Address) => cells.get(address)?.value
  for (const { cell, fn } of classFns) {
    cell.className = fn({ value: cell.value, error: cell.error, get })
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

  const rowLabelOf = (sheetId: string, rowId: string) => {
    const first = leafsBySheet.get(sheetId)?.[0]
    const cell = first && cells.get(cellAddress(sheetId, rowId, first.colId))
    const text = cell ? cell.type.format(cell.value) : ''
    return text || '(이름 없음)'
  }

  const external = (address: Address) => {
    if (!isExternalAddress(address)) return undefined
    const { screen, name } = splitExternal(address)
    return externals(screen, name)
  }

  const workbook: Workbook = {
    sheets,
    cell: (address) => cells.get(address),
    cells: (address) => {
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
    tabOf: (sheetId) => sheets[sheetId]?.tab,
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
