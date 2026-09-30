import { createFileRoute } from '@tanstack/react-router'

import { BasicGridPage } from '#/pages/basic-grid/ui/basic-grid-page'

export const Route = createFileRoute('/basic-grid')({
  component: BasicGridPage,
})
