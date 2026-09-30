import { LargeWorkbookPage } from '@/screens/large-workbook/ui/large-workbook-page'
import { ClientOnly } from '@/shared/ui/client-only'

// The screen renders in the browser only (see ClientOnly).
export default function Page() {
  return (
    <ClientOnly>
      <LargeWorkbookPage />
    </ClientOnly>
  )
}
