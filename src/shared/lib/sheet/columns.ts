import type { ColDef, ColGroupDef } from 'ag-grid-community'

import { formats } from './formats'
import type { EditTarget, SheetColumnDef, SheetLeaf, SheetRow } from './types'

export function flattenLeafs<T>(defs: SheetColumnDef<T>[]): SheetLeaf<T>[] {
  return defs.flatMap((d) => ('children' in d ? flattenLeafs(d.children) : [d]))
}

// Thin adapter: every callback only looks up `row.cells[colId]`. Row-kind
// specific behaviour is decided when the rows are built (see layout.ts).
function createLeafColDef<T>(
  col: SheetLeaf<T>,
  onEdit: (target: EditTarget, value: unknown) => void,
): ColDef<SheetRow> {
  const cellOf = (data: SheetRow | undefined) => data?.cells[col.colId]
  const fmtOf = (data: SheetRow | undefined) =>
    formats[cellOf(data)?.format ?? col.format]

  return {
    colId: col.colId,
    headerName: col.headerName,
    flex: col.flex ?? 1,
    valueGetter: ({ data }) => cellOf(data)?.value,
    valueSetter: ({ data, newValue }) => {
      const edit = cellOf(data)?.edit
      if (edit) onEdit(edit, newValue)
      return false // state is owned by React; the grid gets new rowData
    },
    valueFormatter: ({ value, data }) => fmtOf(data).format(value),
    valueParser: ({ newValue, data }) => fmtOf(data).parse(newValue),
    editable: ({ data }) => !!cellOf(data)?.edit,
    cellEditorSelector: ({ data }) => ({ component: fmtOf(data).editor }),
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
  onEdit: (target: EditTarget, value: unknown) => void,
): (ColDef<SheetRow> | ColGroupDef<SheetRow>)[] {
  return defs.map((def) => {
    if ('children' in def) {
      const group: ColGroupDef<SheetRow> = {
        headerName: def.headerName,
        children: createGridColumns(def.children, onEdit),
      }
      return group
    }
    return createLeafColDef(def, onEdit)
  })
}
