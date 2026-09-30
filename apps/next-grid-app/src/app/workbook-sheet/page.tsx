import { WorkbookSheetPage } from '@/screens/workbook-sheet/ui/workbook-sheet-page'
import { ClientOnly } from '@/shared/ui/client-only'

// The screen renders in the browser only (see ClientOnly).
export default function Page() {
  return (
    <ClientOnly>
      <WorkbookSheetPage />
    </ClientOnly>
  )
}
