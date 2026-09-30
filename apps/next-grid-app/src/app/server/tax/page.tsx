import { ServerTaxPage } from '@/screens/server-tax/ui/server-tax-page'
import { ClientOnly } from '@/shared/ui/client-only'

// State from the server through TanStack Query; the screen renders in the
// browser only (see ClientOnly).
export default function Page() {
  return (
    <ClientOnly>
      <ServerTaxPage />
    </ClientOnly>
  )
}
