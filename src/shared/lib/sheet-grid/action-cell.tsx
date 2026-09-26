import type { CustomCellRendererProps } from 'ag-grid-react'

import type { SheetRow } from './types'

export function ActionCell({
  data,
  column,
}: CustomCellRendererProps<SheetRow>) {
  const action = data?.cells[column?.getColId() ?? '']?.action
  if (!action) return null

  return (
    <button
      type="button"
      className="cursor-pointer rounded border border-[#9aaba0] bg-white px-2 py-0.5 font-sans text-xs text-[#17312d] hover:bg-[#eef3ed]"
      onClick={() => action.run()}
    >
      {action.label}
    </button>
  )
}
