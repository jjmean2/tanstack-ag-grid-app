import { createFileRoute } from '@tanstack/react-router'

import { WorkbookSheetPage } from '#/pages/workbook-sheet/ui/workbook-sheet-page'

export const Route = createFileRoute('/workbook-sheet')({
  component: WorkbookSheetPage,
})
