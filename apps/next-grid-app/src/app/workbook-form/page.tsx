import { WorkbookFormPage } from '@/screens/workbook-form/ui/workbook-form-page'
import { ClientOnly } from '@/shared/ui/client-only'

// The screen renders in the browser only (see ClientOnly).
export default function Page() {
  return (
    <ClientOnly>
      <WorkbookFormPage />
    </ClientOnly>
  )
}
