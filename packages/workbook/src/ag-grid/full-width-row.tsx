import type { CustomCellRendererProps } from 'ag-grid-react'

import type { ResolvedRow } from '../core/types'

// Renders a row's `fullWidth` content across the whole grid (AG Grid's
// `fullWidthCellRenderer`). It is not tied to a column, so it reads `data`.
// With `embedFullWidthRows` AG Grid also creates one per pinned section:
// those render nothing, so the button exists once.
export function FullWidthRow({
  data,
  pinned,
}: CustomCellRendererProps<ResolvedRow>) {
  const content = data?.fullWidth
  if (!content || pinned) return null

  if (content.kind === 'title') {
    return (
      <div className="flex h-full items-center px-4 font-sans text-sm font-bold text-[#17312d]">
        {content.text}
      </div>
    )
  }
  return (
    <div className="flex h-full items-center px-4">
      <button
        type="button"
        className="cursor-pointer rounded border border-[#9aaba0] bg-white px-2 py-0.5 font-sans text-xs text-[#17312d] hover:bg-[#eef3ed]"
        onClick={() => content.run()}
      >
        {content.label}
      </button>
    </div>
  )
}
