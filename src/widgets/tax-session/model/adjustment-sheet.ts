import { newAdjustmentItem } from '#/entities/tax-session/model/adapter'
import { diffOf, selectGap } from '#/entities/tax-session/model/selectors'
import type {
  AdjustmentItem,
  TaxSession,
} from '#/entities/tax-session/model/types'
import {
  addRow,
  items,
  row,
  subtotal,
  title,
} from '#/shared/lib/sheet-grid/layout'
import type { LayoutNode, SheetColumnDef } from '#/shared/lib/sheet-grid/types'

export const adjustmentColumns: SheetColumnDef<AdjustmentItem>[] = [
  {
    colId: 'account',
    headerName: '계정과목',
    format: 'text',
    flex: 2,
    editable: true,
  },
  {
    headerName: '금액',
    children: [
      {
        colId: 'book',
        headerName: '결산서상',
        format: 'money',
        editable: true,
      },
      { colId: 'tax', headerName: '세법상', format: 'money', editable: true },
      { colId: 'diff', headerName: '조정', format: 'money', derive: diffOf },
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
  { colId: 'actions', headerName: '', format: 'text', width: 90 },
]

// Session keys this sheet reads (its dependencies).
export const adjustmentKeys = ['adds', 'subs', 'reported'] as const

const amountCols = ['book', 'tax', 'diff']

// The layout of the sheet, top to bottom.
export const adjustmentLayout: LayoutNode<TaxSession>[] = [
  title('t-add', 'Ⅰ. 익금산입'),
  items('adds', { removeCol: 'actions' }),
  addRow('a-add', 'adds', newAdjustmentItem, '+ 항목 추가'),
  subtotal('s-add', '소 계', 'adds', amountCols),

  title('t-sub', 'Ⅱ. 손금산입'),
  items('subs', { removeCol: 'actions' }),
  addRow('a-sub', 'subs', newAdjustmentItem, '+ 항목 추가'),
  subtotal('s-sub', '소 계', 'subs', amountCols),

  subtotal('total', '합 계', ['adds', 'subs'], amountCols, 'sheet-total'),

  row('reported', undefined, (ctx) => ({
    account: { value: '신고서상 금액' },
    tax: {
      value: ctx.state.reported,
      className: 'sheet-input',
      edit: (value) => ctx.update((s) => ({ ...s, reported: Number(value) })),
    },
  })),
  row('gap', 'sheet-total', (ctx) => {
    const gap = selectGap(ctx.state)
    const status = gap === 0 ? 'sheet-ok' : 'sheet-error'
    return {
      account: { value: '차 이' },
      tax: { value: gap, className: status },
      disposition: {
        value: gap === 0 ? '일치' : '불일치 - 검토 필요',
        format: 'text',
        span: 2,
        className: status,
      },
    }
  }),
]
