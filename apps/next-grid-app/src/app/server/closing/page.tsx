import { ServerClosingPage } from '@/screens/server-closing/ui/server-closing-page'
import { ClientOnly } from '@/shared/ui/client-only'

// State from the server through TanStack Query; the screen renders in the
// browser only (see ClientOnly).
export default function Page() {
  return (
    <ClientOnly>
      <ServerClosingPage />
    </ClientOnly>
  )
}
