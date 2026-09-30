import { WorkbookClosingPage } from '@/screens/workbook-closing/ui/workbook-closing-page'
import { ClientOnly } from '@/shared/ui/client-only'

// The screen renders in the browser only (see ClientOnly).
export default function Page() {
  return (
    <ClientOnly>
      <WorkbookClosingPage />
    </ClientOnly>
  )
}
