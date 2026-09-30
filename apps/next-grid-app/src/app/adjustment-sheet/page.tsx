import { AdjustmentSheetPage } from '@/screens/adjustment-sheet/ui/adjustment-sheet-page'
import { ClientOnly } from '@/shared/ui/client-only'

// The screen renders in the browser only (see ClientOnly).
export default function Page() {
  return (
    <ClientOnly>
      <AdjustmentSheetPage />
    </ClientOnly>
  )
}
