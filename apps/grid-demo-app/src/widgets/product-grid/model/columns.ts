import type { ColDef } from 'ag-grid-community'

import { currencyFormatter } from '#/shared/lib/formatters'
import type { Product } from '#/entities/product/model/types'

export const productColumnDefs: ColDef<Product>[] = [
  { field: 'product', headerName: 'Product', minWidth: 190, pinned: 'left' },
  {
    field: 'category',
    headerName: 'Category',
    minWidth: 140,
    filter: 'agSetColumnFilter',
  },
  {
    field: 'status',
    headerName: 'Status',
    minWidth: 145,
    cellEditor: 'agLargeTextCellEditor',
    cellEditorPopup: true,
    singleClickEdit: true,
    filter: 'agSetColumnFilter',
    sort: 'asc',
    sortIndex: 0,
    autoHeight: true,
    wrapText: true,
  },
  {
    field: 'units',
    headerName: 'Units available',
    minWidth: 155,
    type: 'numericColumn',
    filter: 'agNumberColumnFilter',
    aggFunc: 'sum',
    sort: 'asc',
    sortIndex: 1,
  },
  {
    field: 'price',
    headerName: 'Unit price',
    minWidth: 135,
    type: 'numericColumn',
    filter: 'agNumberColumnFilter',
    valueFormatter: ({ value }) =>
      typeof value === 'number' ? currencyFormatter.format(value) : '',
  },
  {
    field: 'lastUpdated',
    headerName: 'Last updated',
    minWidth: 150,
    filter: 'agDateColumnFilter',
    sort: 'desc',
  },
]
