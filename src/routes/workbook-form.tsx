import { createFileRoute } from '@tanstack/react-router'

import { WorkbookFormPage } from '#/pages/workbook-form/ui/workbook-form-page'
import { validateCellSearch } from '#/shared/lib/workbook/use-open-screen'

export const Route = createFileRoute('/workbook-form')({
  validateSearch: validateCellSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { cell } = Route.useSearch()
  return <WorkbookFormPage focusCell={cell} />
}
