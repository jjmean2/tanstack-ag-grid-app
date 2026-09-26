import type { AdjustmentItem } from '#/entities/adjustment/model/types'
import { items, row, subtotal, title } from '#/shared/lib/sheet/layout'
import type { LayoutNode, SheetColumnDef } from '#/shared/lib/sheet/types'

export const columns: SheetColumnDef<AdjustmentItem>[] = [
  { colId: 'account', headerName: '계정과목', format: 'text', flex: 2 },
  {
    headerName: '금액',
    children: [
      {
        colId: 'bookAmount',
        headerName: '결산서상',
        format: 'money',
        editable: true,
      },
      {
        colId: 'taxAmount',
        headerName: '세법상',
        format: 'money',
        editable: true,
      },
      {
        colId: 'diff',
        headerName: '조정',
        format: 'money',
        derive: (r) => r.taxAmount - r.bookAmount,
      },
    ],
  },
  {
    headerName: '처분',
    children: [
      {
        colId: 'disposition',
        headerName: '소득처분',
        format: 'text',
        editable: true,
      },
      { colId: 'note', headerName: '비고', format: 'text', editable: true },
    ],
  },
]

const amountCols = ['bookAmount', 'taxAmount', 'diff']

export const layout: LayoutNode<AdjustmentItem>[] = [
  title('t-add', 'Ⅰ. 익금산입'),
  items((i) => i.group === 'add'),
  subtotal('s-add', '소 계', (i) => i.group === 'add', amountCols),

  title('t-sub', 'Ⅱ. 손금산입'),
  items((i) => i.group === 'sub'),
  subtotal('s-sub', '소 계', (i) => i.group === 'sub', amountCols),

  subtotal('total', '합 계', () => true, amountCols, 'sheet-total'),

  row('reported', undefined, (ctx) => ({
    account: { value: '신고서상 금액' },
    taxAmount: {
      value: ctx.inputs['reported.taxAmount'] ?? 0,
      edit: { scope: 'input', key: 'reported.taxAmount' },
      className: 'sheet-input',
    },
  })),
  row('gap', 'sheet-total', (ctx) => {
    const gap =
      Number(ctx.get('total', 'taxAmount')) -
      Number(ctx.get('reported', 'taxAmount'))
    return {
      account: { value: '차 이' },
      taxAmount: {
        value: gap,
        className: gap === 0 ? 'sheet-ok' : 'sheet-error',
      },
      disposition: {
        value: gap === 0 ? '일치' : '불일치 - 검토 필요',
        format: 'text',
        span: 2,
        className: gap === 0 ? 'sheet-ok' : 'sheet-error',
      },
    }
  }),
]
