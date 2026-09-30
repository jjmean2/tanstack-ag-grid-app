import type { CustomCellRendererProps } from 'ag-grid-react'

import type { Row } from '../core/types'

// Renders a row's `fullWidth` content across the whole grid (AG Grid's
// `fullWidthCellRenderer`). It is not tied to a column, so it reads `data`.
// With `embedFullWidthRows` AG Grid also creates one per pinned section:
// those render nothing, so the button exists once.
export function FullWidthRow({ data, pinned }: CustomCellRendererProps<Row>) {
  const content = data?.fullWidth
  if (!content || pinned) return null

  if (content.kind === 'title') {
    return <div className="wb-full-width">{content.text}</div>
  }
  return (
    <div className="wb-full-width">
      <button type="button" className="wb-button" onClick={() => content.run()}>
        {content.label}
      </button>
    </div>
  )
}
