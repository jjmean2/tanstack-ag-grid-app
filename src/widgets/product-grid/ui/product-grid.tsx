import type { ColDef, GridReadyEvent } from 'ag-grid-community'
import { AgGridReact } from 'ag-grid-react'

import { playgroundGridTheme } from '#/shared/config/ag-grid'
import type { Product } from '#/entities/product/model/types'
import { productColumnDefs } from '../model/columns'

type ProductGridProps = {
  rowData: Product[]
  onGridReady: (event: GridReadyEvent<Product>) => void
  onSelectionChanged: (selectedCount: number) => void
}

const defaultColDef: ColDef<Product> = {
  editable: true,
  flex: 1,
  filter: true,
  resizable: true,
  sortable: true,
  headerClass: '[&_.ag-header-cell-label]:justify-center',
}

export function ProductGrid({
  rowData,
  onGridReady,
  onSelectionChanged,
}: ProductGridProps) {
  return (
    <div className="h-[620px]">
      <AgGridReact<Product>
        theme={playgroundGridTheme}
        // columnMenu="legacy"
        rowData={rowData}
        columnDefs={productColumnDefs}
        defaultColDef={defaultColDef}
        pagination
        paginationPageSize={8}
        paginationPageSizeSelector={[8, 12, 24]}
        rowSelection={{ mode: 'multiRow' }}
        sideBar="columns"
        statusBar={{
          statusPanels: [
            { statusPanel: 'agTotalAndFilteredRowCountComponent' },
            { statusPanel: 'agSelectedRowCountComponent' },
            { statusPanel: 'agAggregationComponent' },
          ],
        }}
        onGridReady={onGridReady}
        onSelectionChanged={(event) =>
          onSelectionChanged(event.api.getSelectedRows().length)
        }
      />
    </div>
  )
}
