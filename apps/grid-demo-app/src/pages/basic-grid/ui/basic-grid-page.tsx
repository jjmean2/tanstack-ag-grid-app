import type { GridApi, GridReadyEvent } from 'ag-grid-community'
import { useState } from 'react'

import { products } from '#/entities/product/model/data'
import { GridToolbar } from '#/shared/ui/grid-toolbar'
import { PageHeader } from '#/shared/ui/page-header'
import { ProductGrid } from '#/widgets/product-grid/ui/product-grid'

export function BasicGridPage() {
  const [gridApi, setGridApi] = useState<GridApi | null>(null)
  const [selectedCount, setSelectedCount] = useState(0)

  function handleGridReady(event: GridReadyEvent) {
    setGridApi(event.api)
  }

  return (
    <main className="min-h-screen bg-app-bg p-6 text-app-ink sm:p-10 lg:p-16">
      <PageHeader
        eyebrow="AG Grid playground"
        title="Basic grid"
        description="Edit cells, sort columns, filter values, select rows, and explore the built-in grid panels."
        meta={
          <div className="font-mono text-xs font-bold uppercase tracking-[0.05em] text-app-muted">
            {selectedCount} selected / {products.length} rows
          </div>
        }
      />

      <section className="mx-auto max-w-[1500px] overflow-hidden border border-app-line bg-app-surface shadow-[0_1rem_3rem_var(--app-shadow)]">
        <GridToolbar
          api={gridApi}
          title="Product inventory"
          hint="Double-click a cell to edit"
        />
        <ProductGrid
          rowData={products}
          onGridReady={handleGridReady}
          onSelectionChanged={setSelectedCount}
        />
      </section>
    </main>
  )
}
