import {
  defineWorkbook,
  fields,
  formulaCell,
  labelCell,
  row,
  T,
  title,
} from '@lab/workbook'
import type { ColumnDef } from '@lab/workbook'

// The closing screen: an income statement whose net income the tax screen
// reads as `[ext:closing/netIncome]`.

export type ClosingState = {
  pl: {
    revenue: number
    cogs: number
    sga: number
    otherIncome: number
    otherExpense: number
  }
}

export const initialClosing: ClosingState = {
  pl: {
    revenue: 1_250_000_000,
    cogs: 780_000_000,
    sga: 310_000_000,
    otherIncome: 12_000_000,
    otherExpense: 27_000_000,
  },
}

const columns: ColumnDef[] = [
  { colId: 'label', headerName: '과목', type: T.text, flex: 2 },
  { colId: 'value', headerName: '금액', type: T.money },
]

export const closingWorkbook = defineWorkbook<ClosingState>(
  [
    {
      id: 'is',
      title: '손익계산서',
      columns,
      rows: [
        title('t-op', 'Ⅰ. 영업손익'),
        fields('pl', {
          revenue: '매출액',
          cogs: '매출원가',
          sga: '판매비와관리비',
        }),
        row('gross', { tags: 'subtotal' }, () => ({
          label: labelCell('매출총이익'),
          value: formulaCell('=[pl.revenue/value]-[pl.cogs/value]'),
        })),
        row('operating', { tags: 'subtotal' }, () => ({
          label: labelCell('영업이익'),
          value: formulaCell('=[gross/value]-[pl.sga/value]'),
        })),
        title('t-other', 'Ⅱ. 영업외손익'),
        fields('pl', {
          otherIncome: '영업외수익',
          otherExpense: '영업외비용',
        }),
        row('net', { tags: 'total' }, () => ({
          label: labelCell('당기순이익'),
          value: formulaCell(
            '=[operating/value]+[pl.otherIncome/value]-[pl.otherExpense/value]',
          ),
        })),
      ],
    },
  ],
  { exports: { netIncome: 'is/net/value', revenue: 'is/pl.revenue/value' } },
)
