import type { TaxSession } from '#/entities/tax-session/model/types'
import { fields } from '#/shared/lib/sheet-grid/layout'
import type { LayoutNode, SheetColumnDef } from '#/shared/lib/sheet-grid/types'

export const companyColumns: SheetColumnDef[] = [
  { colId: 'label', headerName: '항목', format: 'text' },
  { colId: 'value', headerName: '값', format: 'text', flex: 2 },
]

export const companyKeys = ['company'] as const

// A fixed object unrolled into rows: one row per listed property.
export const companyLayout: LayoutNode<TaxSession>[] = [
  fields('company', { name: '회사명', ceo: '대표자' }),
]
