import type { GridApi } from 'ag-grid-community'

type GridToolbarProps<TData> = {
  api: GridApi<TData> | null
  title: string
  hint: string
}

export function GridToolbar<TData>({
  api,
  title,
  hint,
}: GridToolbarProps<TData>) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-app-line p-4 font-sans sm:px-5">
      <div>
        <strong>{title}</strong>
        <span className="ml-3 text-sm text-app-muted">{hint}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          className="h-9 min-w-48 border border-app-line-strong bg-app-surface px-3 text-sm outline-none focus:border-app-accent"
          aria-label="Quick filter"
          placeholder="Quick filter..."
          onChange={(event) =>
            api?.setGridOption('quickFilterText', event.target.value)
          }
        />
        <button
          className="h-9 border border-app-accent px-3 text-sm font-bold text-app-accent hover:bg-app-hover"
          type="button"
          onClick={() => api?.exportDataAsCsv()}
        >
          Export CSV
        </button>
      </div>
    </div>
  )
}
