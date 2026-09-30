import { createFileRoute } from '@tanstack/react-router'

import { WorkbookClosingPage } from '#/pages/workbook-closing/ui/workbook-closing-page'
import { validateCellSearch } from '#/shared/lib/screen/router'

export const Route = createFileRoute('/workbook-closing')({
  validateSearch: validateCellSearch,
  component: WorkbookClosingPage,
})
