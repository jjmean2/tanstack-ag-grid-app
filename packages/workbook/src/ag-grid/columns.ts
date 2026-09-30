import type { ColDef, ColGroupDef } from 'ag-grid-community'

import { INVALID } from '../core/cell-types'
import { defaultPresenter } from '../core/presentation'
import type { Presenter } from '../core/presentation'
import type { ResolvedRow, SheetColumnDef, SheetLeaf } from '../core/types'
import { defaultGridDisplays, defaultGridEditors } from './grid-config'
import type { GridDisplay, GridEditor } from './grid-config'

export type GridColumnsOptions = {
  present?: Presenter
  editors?: Record<string, GridEditor>
  displays?: Record<string, GridDisplay>
}

// Thin adapter: every callback only looks at the resolved `row.cells[colId]`
// and its presentation. Row kinds, types, formulas and the app's presentation
// rules were all settled before, so nothing here branches on them.
function createLeafColDef(
  col: SheetLeaf,
  { present, editors, displays }: Required<GridColumnsOptions>,
): ColDef<ResolvedRow> {
  const cellOf = (data: ResolvedRow | undefined) => data?.cells[col.colId]
  const typeOf = (data: ResolvedRow | undefined) =>
    cellOf(data)?.type ?? col.type
  const presented = (data: ResolvedRow | undefined) => {
    const cell = cellOf(data)
    return cell ? present(cell) : undefined
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
      const source = cell?.source
      const write = source?.kind === 'value' ? source.write : undefined
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
    // Editor and display ids come from the presentation; the registries turn
    // them into AG Grid components.
    cellEditorSelector: ({ data }) => {
      const cell = cellOf(data)
      const id = (cell && present(cell).editor) ?? 'text'
      const editor = editors[id] ?? editors.text
      return {
        component: editor.component,
        params: cell ? editor.params?.(cell) : undefined,
      }
    },
    cellRendererSelector: ({ data }) => {
      const display = presented(data)?.display
      const component = display === undefined ? undefined : displays[display]
      return component ? { component } : undefined
    },
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
          editable: ({ data }) => (presented(data)?.editor ?? null) !== null,
          colSpan: ({ data }) => cellOf(data)?.span ?? 1,
        }),
    // The same marks every view uses.
    cellClass: ({ data }) => presented(data)?.marks,
  }
}

export function createGridColumns(
  defs: SheetColumnDef[],
  options: GridColumnsOptions = {},
): (ColDef<ResolvedRow> | ColGroupDef<ResolvedRow>)[] {
  const resolved: Required<GridColumnsOptions> = {
    present: options.present ?? defaultPresenter,
    editors: { ...defaultGridEditors, ...options.editors },
    displays: { ...defaultGridDisplays, ...options.displays },
  }
  return defs.map((def) => {
    if ('children' in def) {
      const group: ColGroupDef<ResolvedRow> = {
        headerName: def.headerName,
        children: createGridColumns(def.children, resolved),
      }
      return group
    }
    return createLeafColDef(def, resolved)
  })
}
