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
import type { ColumnDef } from '@lab/workbook'
import type { AdjustmentState } from '#/entities/adjustment/model/types'

// The smallest workbook: one sheet. Column groups, section titles, lists with
// subtotals, one input cell, and a check that compares two cells.

const columns: ColumnDef[] = [
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
    columns,
    rows: [
      title('t-add', 'Ⅰ. 익금산입'),
      items('adds', { label: '익금산입 항목' }),
      subtotal('s-add', '소 계', 'adds', amounts),

      title('t-sub', 'Ⅱ. 손금산입'),
      items('subs', { label: '손금산입 항목' }),
      subtotal('s-sub', '소 계', 'subs', amounts),

      subtotal('total', '합 계', ['adds', 'subs'], amounts, 'total'),

      row('reported', {}, (ctx) => ({
        account: labelCell('신고서상 금액'),
        tax: inputCell(
          ctx.state.reported,
          (value) => ctx.update((s) => ({ ...s, reported: Number(value) })),
          { tags: 'input' },
        ),
      })),
      row('gap', { tags: 'total' }, () => ({
        account: labelCell('차 이'),
        tax: formulaCell('=[total/tax]-[reported/tax]', {
          tags: ({ value }) => (value === 0 ? 'pass' : 'fail'),
        }),
        disposition: formulaCell(
          '=IF([gap/tax]=0,"일치","불일치 - 검토 필요")',
          {
            span: 2,
            tags: ({ get }) => (get('adj/gap/tax') === 0 ? 'pass' : 'fail'),
          },
        ),
      })),
    ],
  },
])
