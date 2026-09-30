import type { CustomCellRendererProps } from 'ag-grid-react'

import { insertListRow } from '../core/navigation'
import type { Row } from '../core/types'
import { useWorkbook } from '../react/workbook-context'

// Renders a row's `fullWidth` content across the whole grid (AG Grid's
// `fullWidthCellRenderer`). It is not tied to a column, so it reads `data`.
// With `embedFullWidthRows` AG Grid also creates one per pinned section:
// those render nothing, so the button exists once.
export function FullWidthRow({ data, pinned }: CustomCellRendererProps<Row>) {
  const { wb, ui } = useWorkbook()
  const content = data?.fullWidth
  if (!content || pinned) return null

  if (content.kind === 'title') {
    return <div className="wb-full-width">{content.text}</div>
  }
  return (
    <div className="wb-full-width">
      <button
        type="button"
        className="wb-button"
        onClick={() => {
          // Adding to a list: through the list, so focus moves to the new row.
          const list =
            content.list === undefined ? undefined : wb.list(content.list)
          if (list) insertListRow(ui, list)
          else content.run()
        }}
      >
        {content.label}
      </button>
    </div>
  )
}
