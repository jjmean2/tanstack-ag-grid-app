import type { ColDef } from 'ag-grid-community'
import { AgGridReact } from 'ag-grid-react'
import { useMemo } from 'react'

import { toInitialInputs, toItems } from '#/entities/adjustment/model/adapter'
import type { AdjustmentResponse } from '#/entities/adjustment/model/types'
import { playgroundGridTheme } from '#/shared/config/ag-grid'
import { createGridColumns } from '#/shared/lib/sheet/columns'
import type { SheetRow } from '#/shared/lib/sheet/types'
import { useSheet } from '#/shared/lib/sheet/use-sheet'
import { columns, layout } from '../model/sheet'

// A worksheet's layout is positional, so sorting/filtering/moving columns
// would break it.
const defaultColDef: ColDef<SheetRow> = {
  sortable: false,
  filter: false,
  suppressMovable: true,
  resizable: true,
  headerClass: '[&_.ag-header-cell-label]:justify-center',
}

export function AdjustmentSheet({ res }: { res: AdjustmentResponse }) {
  const initial = useMemo(
    () => ({ items: toItems(res), inputs: toInitialInputs(res) }),
    [res],
  )
  const { rows, onEdit } = useSheet(
    initial.items,
    columns,
    layout,
    initial.inputs,
  )
  const columnDefs = useMemo(() => createGridColumns(columns, onEdit), [onEdit])

  return (
    <AgGridReact<SheetRow>
      theme={playgroundGridTheme}
      domLayout="autoHeight"
      rowData={rows}
      columnDefs={columnDefs}
      defaultColDef={defaultColDef}
      getRowId={(p) => p.data.id}
      getRowClass={(p) => p.data?.className}
    />
  )
}
