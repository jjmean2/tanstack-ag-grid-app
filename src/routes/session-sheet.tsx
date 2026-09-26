import { createFileRoute } from '@tanstack/react-router'

import { SessionSheetPage } from '#/pages/session-sheet/ui/session-sheet-page'

export const Route = createFileRoute('/session-sheet')({
  component: SessionSheetPage,
})
