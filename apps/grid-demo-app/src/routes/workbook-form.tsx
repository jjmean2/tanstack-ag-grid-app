import { createFileRoute } from '@tanstack/react-router'

import { WorkbookFormPage } from '#/pages/workbook-form/ui/workbook-form-page'
import { validateCellSearch } from '#/shared/lib/screen/router'

export const Route = createFileRoute('/workbook-form')({
  validateSearch: validateCellSearch,
  component: WorkbookFormPage,
})
