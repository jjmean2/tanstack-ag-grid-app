import { createFileRoute, redirect } from '@tanstack/react-router'

// The session sheet demo (tabs over one editing session) grew into the tax
// workbook screen; the old address leads there.
export const Route = createFileRoute('/session-sheet')({
  beforeLoad: () => {
    throw redirect({ to: '/workbook-sheet', replace: true })
  },
})
