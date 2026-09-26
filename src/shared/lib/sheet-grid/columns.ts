import type { ColDef, ColGroupDef } from 'ag-grid-community'

import { formats } from '../sheet/formats'
import type { FormatId } from '../sheet/formats'
import { ActionCell } from './action-cell'
import type { SheetColumnDef, SheetLeaf, SheetRow } from './types'

const NUMERIC_FORMATS: readonly FormatId[] = ['money', 'percent']

// Normalises a parsed editor value before it is stored (e.g. a cleared number cell -> 0).
const coerce = (format: FormatId, value: unknown) => {
  if (NUMERIC_FORMATS.includes(format)) {
    return value == null || value === '' ? 0 : Number(value)
  }
  return value == null ? '' : String(value)
}

export function flattenLeafs<T>(defs: SheetColumnDef<T>[]): SheetLeaf<T>[] {
  return defs.flatMap((d) => ('children' in d ? flattenLeafs(d.children) : [d]))
}

// Thin adapter: every callback only looks up `row.cells[colId]`. Row-kind
// specific behaviour is decided when the rows are built (see layout.ts).
function createLeafColDef<T>(col: SheetLeaf<T>): ColDef<SheetRow> {
  const cellOf = (data: SheetRow | undefined) => data?.cells[col.colId]
  const formatIdOf = (data: SheetRow | undefined) =>
    cellOf(data)?.format ?? col.format
  const fmtOf = (data: SheetRow | undefined) => formats[formatIdOf(data)]

  return {
    colId: col.colId,
    headerName: col.headerName,
    flex: col.width ? undefined : (col.flex ?? 1),
    width: col.width,
    valueGetter: ({ data }) => cellOf(data)?.value,
    valueSetter: ({ data, newValue }) => {
      const cell = cellOf(data)
      if (!cell?.edit) return false
      const value = coerce(formatIdOf(data), newValue)
      // Apply to the grid row immediately (rows are throwaway views), then record
      // it in the store, which rebuilds the rows. Without the immediate step the
      // cell would show the old value until the store round trip has rendered.
      cell.value = value
      cell.edit(value)
      return true
    },
    valueFormatter: ({ value, data }) => fmtOf(data).format(value),
    valueParser: ({ newValue, data }) => fmtOf(data).parse(newValue),
    editable: ({ data }) => !!cellOf(data)?.edit,
    cellEditorSelector: ({ data }) => ({ component: fmtOf(data).editor }),
    cellRendererSelector: ({ data }) =>
      cellOf(data)?.action ? { component: ActionCell } : undefined,
    colSpan: ({ data }) => cellOf(data)?.span ?? 1,
    cellClass: ({ data }) =>
      [
        fmtOf(data).align === 'right' && 'text-right',
        cellOf(data)?.className,
      ].filter((c): c is string => typeof c === 'string'),
  }
}

export function createGridColumns<T>(
  defs: SheetColumnDef<T>[],
): (ColDef<SheetRow> | ColGroupDef<SheetRow>)[] {
  return defs.map((def) => {
    if ('children' in def) {
      const group: ColGroupDef<SheetRow> = {
        headerName: def.headerName,
        children: createGridColumns(def.children),
      }
      return group
    }
    return createLeafColDef(def)
  })
}
