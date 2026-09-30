import { createFileRoute } from '@tanstack/react-router'

import { AdjustmentSheetPage } from '#/pages/adjustment-sheet/ui/adjustment-sheet-page'
import { validateCellSearch } from '#/shared/lib/screen/router'

export const Route = createFileRoute('/adjustment-sheet')({
  validateSearch: validateCellSearch,
  component: AdjustmentSheetPage,
})
