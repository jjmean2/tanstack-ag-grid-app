import {
  selectComputedTax,
  selectCreditTotal,
  selectDecidedTax,
  selectLocalTax,
  selectTaxBase,
  selectTotalBurden,
} from '#/entities/tax-session/model/selectors'
import type { TaxSession } from '#/entities/tax-session/model/types'
import { fields, row, title } from '#/shared/lib/sheet-grid/layout'
import type { LayoutNode, SheetColumnDef } from '#/shared/lib/sheet-grid/types'

const columns: SheetColumnDef[] = [
  { colId: 'label', headerName: '항목', format: 'text', flex: 2 },
  { colId: 'value', headerName: '값', format: 'money' },
]

// Grid 1: editable rates and credits (fixed objects unrolled into rows).
export const taxInputColumns = columns
export const taxInputKeys = ['rates', 'credits'] as const
export const taxInputLayout: LayoutNode<TaxSession>[] = [
  title('t-rates', '세율'),
  fields('rates', {
    standard: { label: '법인세율', format: 'percent' },
    local: { label: '지방소득세율', format: 'percent' },
  }),
  title('t-credits', '세액공제'),
  fields('credits', {
    research: '연구·인력개발비 공제',
    employment: '고용증대 공제',
  }),
  row('credit-total', 'sheet-subtotal', (ctx) => ({
    label: { value: '공제 합계' },
    value: { value: selectCreditTotal(ctx.state) },
  })),
]

// Grid 2: the calculation. Every cell is derived, and the base amount comes
// from the adjustment tab's lists, so this grid depends on data edited elsewhere.
export const taxResultColumns = columns
export const taxResultKeys = ['adds', 'subs', 'rates', 'credits'] as const
export const taxResultLayout: LayoutNode<TaxSession>[] = [
  row('base', undefined, (ctx) => ({
    label: { value: '과세표준 (조정 후 세법상 합계)' },
    value: { value: selectTaxBase(ctx.state) },
  })),
  row('computed', undefined, (ctx) => ({
    label: { value: '산출세액' },
    value: { value: selectComputedTax(ctx.state) },
  })),
  row('credit', undefined, (ctx) => ({
    label: { value: '세액공제 합계' },
    value: { value: selectCreditTotal(ctx.state) },
  })),
  row('decided', 'sheet-subtotal', (ctx) => ({
    label: { value: '결정세액' },
    value: { value: selectDecidedTax(ctx.state) },
  })),
  row('local', undefined, (ctx) => ({
    label: { value: '지방소득세' },
    value: { value: selectLocalTax(ctx.state) },
  })),
  row('burden', 'sheet-total', (ctx) => ({
    label: { value: '총부담세액' },
    value: { value: selectTotalBurden(ctx.state) },
  })),
]
