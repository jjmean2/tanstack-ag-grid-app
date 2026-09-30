import { createFileRoute } from '@tanstack/react-router'

import {
  LargeWorkbookPage,
  ROW_COUNTS,
} from '#/pages/large-workbook/ui/large-workbook-page'
import { validateCellSearch } from '#/shared/lib/screen/router'

export const Route = createFileRoute('/large-workbook')({
  validateSearch: (search: Record<string, unknown>) => {
    const rows = Number(search.rows)
    return {
      ...validateCellSearch(search),
      rows: (ROW_COUNTS as readonly number[]).includes(rows) ? rows : undefined,
    }
  },
  component: LargeWorkbookPage,
})
