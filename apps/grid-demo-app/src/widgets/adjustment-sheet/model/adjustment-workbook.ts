import {
  defineWorkbook,
  formulaCell,
  inputCell,
  items,
  labelCell,
  row,
  subtotal,
  T,
  title,
} from '@lab/workbook'
import type { SheetColumnDef } from '@lab/workbook'
import type { AdjustmentState } from '#/entities/adjustment/model/types'

// The smallest workbook: one sheet. Column groups, section titles, lists with
// subtotals, one input cell, and a check that compares two cells.

const columns: SheetColumnDef[] = [
  { colId: 'account', headerName: '계정과목', type: T.text, flex: 2 },
  {
    headerName: '금액',
    children: [
      { colId: 'book', headerName: '결산서상', type: T.money, editable: true },
      { colId: 'tax', headerName: '세법상', type: T.money, editable: true },
      {
        colId: 'diff',
        headerName: '조정',
        type: T.money,
        formula: '=[.tax]-[.book]', // every data row: tax - book
      },
    ],
  },
  {
    headerName: '처분',
    children: [
      {
        colId: 'disposition',
        headerName: '소득처분',
        type: T.text,
        editable: true,
      },
      { colId: 'note', headerName: '비고', type: T.text, editable: true },
    ],
  },
]

const amounts = ['book', 'tax', 'diff']

export const adjustmentWorkbook = defineWorkbook<AdjustmentState>([
  {
    id: 'adj',
    title: '소득금액조정',
    tab: 'adj',
    columns,
    layout: [
      title('t-add', 'Ⅰ. 익금산입'),
      items('adds', { label: '익금산입 항목' }),
      subtotal('s-add', '소 계', 'adds', amounts),

      title('t-sub', 'Ⅱ. 손금산입'),
      items('subs', { label: '손금산입 항목' }),
      subtotal('s-sub', '소 계', 'subs', amounts),

      subtotal('total', '합 계', ['adds', 'subs'], amounts, 'sheet-total'),

      row('reported', {}, (ctx) => ({
        account: labelCell('신고서상 금액'),
        tax: inputCell(
          ctx.state.reported,
          (value) => ctx.update((s) => ({ ...s, reported: Number(value) })),
          { className: 'sheet-input' },
        ),
      })),
      row('gap', { className: 'sheet-total' }, () => ({
        account: labelCell('차 이'),
        tax: formulaCell('=[total/tax]-[reported/tax]', {
          className: ({ value }) => (value === 0 ? 'sheet-ok' : 'sheet-error'),
        }),
        disposition: formulaCell(
          '=IF([gap/tax]=0,"일치","불일치 - 검토 필요")',
          {
            span: 2,
            className: ({ get }) =>
              get('adj/gap/tax') === 0 ? 'sheet-ok' : 'sheet-error',
          },
        ),
      })),
    ],
  },
])
