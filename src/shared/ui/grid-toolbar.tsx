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
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d8ded8] p-4 font-sans sm:px-5">
      <div>
        <strong>{title}</strong>
        <span className="ml-3 text-sm text-[#667b72]">{hint}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          className="h-9 min-w-48 border border-[#b9cfc4] bg-white px-3 text-sm outline-none focus:border-[#1f6f66]"
          aria-label="Quick filter"
          placeholder="Quick filter..."
          onChange={(event) =>
            api?.setGridOption('quickFilterText', event.target.value)
          }
        />
        <button
          className="h-9 border border-[#1f6f66] px-3 text-sm font-bold text-[#1f6f66] hover:bg-[#edf6f1]"
          type="button"
          onClick={() => api?.exportDataAsCsv()}
        >
          Export CSV
        </button>
      </div>
    </div>
  )
}
