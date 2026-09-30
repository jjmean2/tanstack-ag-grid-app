import type { CustomCellRendererProps } from 'ag-grid-react'

import type { Row } from '../core/types'

export function ActionCell({ data, column }: CustomCellRendererProps<Row>) {
  const action = data?.cells[column?.getColId() ?? '']?.action
  if (!action) return null

  return (
    <button type="button" className="wb-button" onClick={() => action.run()}>
      {action.label}
    </button>
  )
}
