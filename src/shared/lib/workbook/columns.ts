import type { ColDef, ColGroupDef } from 'ag-grid-community'

import { ActionCell } from './action-cell'
import { INVALID } from './cell-types'
import type { CellType } from './cell-types'
import type { ResolvedRow, SheetColumnDef, SheetLeaf } from './types'

// Maps the semantic editor kind of a cell type to an AG Grid editor.
const editorFor = (type: CellType) => {
  switch (type.editor) {
    case 'number':
      return { component: 'agNumberCellEditor' }
    case 'select':
      return {
        component: 'agSelectCellEditor',
        params: { values: [...(type.options ?? [])] },
      }
    case 'checkbox':
      return { component: 'agCheckboxCellEditor' }
    default:
      return { component: 'agTextCellEditor' }
  }
}

// Thin adapter: every callback only looks at the resolved `row.cells[colId]`.
// Row kinds, type overrides and formulas were all settled when the workbook
// was built, so nothing here branches on them.
function createLeafColDef(col: SheetLeaf): ColDef<ResolvedRow> {
  const cellOf = (data: ResolvedRow | undefined) => data?.cells[col.colId]
  const typeOf = (data: ResolvedRow | undefined) =>
    cellOf(data)?.type ?? col.type
  const writerOf = (data: ResolvedRow | undefined) => {
    const source = cellOf(data)?.source
    return source?.kind === 'value' ? source.write : undefined
  }

  return {
    colId: col.colId,
    headerName: col.headerName,
    flex: col.width ? undefined : (col.flex ?? 1),
    width: col.width,
    valueGetter: ({ data }) => cellOf(data)?.value,
    valueParser: ({ newValue, data }) => typeOf(data).parse(newValue),
    valueSetter: ({ data, newValue }) => {
      const cell = cellOf(data)
      const write = writerOf(data)
      if (!cell || !write || newValue === INVALID) return false
      // Apply to the grid row immediately (rows are throwaway views), then
      // record it in the store, which rebuilds the workbook. Without the
      // immediate step the cell shows the old value until that has rendered.
      cell.value = newValue
      write(newValue)
      return true
    },
    valueFormatter: ({ value, data }) =>
      cellOf(data)?.error ?? typeOf(data).format(value),
    cellEditorSelector: ({ data }) => editorFor(typeOf(data)),
    cellRendererSelector: ({ data }) =>
      cellOf(data)?.action ? { component: ActionCell } : undefined,
    // AG Grid: a column that merges down can neither span across nor be
    // editable (the workbook rejects editable merged cells for that reason).
    ...(col.spanRows
      ? {
          spanRows: ({ nodeA, nodeB }) => {
            const key = cellOf(nodeA?.data)?.rowSpan
            return key !== undefined && key === cellOf(nodeB?.data)?.rowSpan
          },
        }
      : {
          editable: ({ data }) => writerOf(data) !== undefined,
          colSpan: ({ data }) => cellOf(data)?.span ?? 1,
        }),
    cellClass: ({ data }) => {
      const cell = cellOf(data)
      return [
        typeOf(data).align === 'right' && 'text-right',
        cell?.className,
        cell?.source.kind === 'formula' && 'sheet-formula',
        cell?.error && 'sheet-cell-error',
      ].filter((c): c is string => typeof c === 'string' && c !== '')
    },
  }
}

export function createGridColumns(
  defs: SheetColumnDef[],
): (ColDef<ResolvedRow> | ColGroupDef<ResolvedRow>)[] {
  return defs.map((def) => {
    if ('children' in def) {
      const group: ColGroupDef<ResolvedRow> = {
        headerName: def.headerName,
        children: createGridColumns(def.children),
      }
      return group
    }
    return createLeafColDef(def)
  })
}
