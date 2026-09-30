import { createFileRoute } from '@tanstack/react-router'

import { WorkbookClosingPage } from '#/pages/workbook-closing/ui/workbook-closing-page'
import { validateCellSearch } from '#/shared/lib/workbook/use-open-screen'

export const Route = createFileRoute('/workbook-closing')({
  validateSearch: validateCellSearch,
  component: RouteComponent,
})

function RouteComponent() {
  const { cell } = Route.useSearch()
  return <WorkbookClosingPage focusCell={cell} />
}
