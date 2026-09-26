import { createFileRoute } from '@tanstack/react-router'

import { AdjustmentSheetPage } from '#/pages/adjustment-sheet/ui/adjustment-sheet-page'

export const Route = createFileRoute('/adjustment-sheet')({
  component: AdjustmentSheetPage,
})
