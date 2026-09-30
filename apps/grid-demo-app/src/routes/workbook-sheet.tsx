import { createFileRoute } from '@tanstack/react-router'

import { WorkbookSheetPage } from '#/pages/workbook-sheet/ui/workbook-sheet-page'
import { validateCellSearch } from '#/shared/lib/screen/router'

export const Route = createFileRoute('/workbook-sheet')({
  validateSearch: validateCellSearch,
  component: WorkbookSheetPage,
})
