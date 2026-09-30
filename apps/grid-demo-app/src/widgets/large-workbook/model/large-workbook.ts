import {
  defineWorkbook,
  formulaCell,
  items,
  labelCell,
  row,
  subtotal,
  T,
  title,
} from '@lab/workbook'
import type { ColumnDef, RowsNode, SheetDef } from '@lab/workbook'

// A workbook for checking performance: three ledgers of thousands of rows
// each (a formula per row, a total per ledger), and a summary sheet that
// reads them all (totals and SUMIF over whole lists).

export type Entry = {
  id: string
  account: string
  kind: string // 과세 | 면세 | 영세
  amount: number
  rate: number // % of amount taken as tax
}

export const LEDGERS = [
  { id: 'sales', title: '매출 원장' },
  { id: 'purchases', title: '매입 원장' },
  { id: 'expenses', title: '경비 원장' },
] as const
export type LedgerId = (typeof LEDGERS)[number]['id']

export type LargeState = Record<LedgerId, Entry[]>

const KINDS = ['과세', '면세', '영세']

// Deterministic sample data: `rows` entries per ledger.
export function largeState(rows: number): LargeState {
  const ledger = (id: LedgerId, seed: number): Entry[] =>
    Array.from({ length: rows }, (_, i) => ({
      id: `${id}-${i}`,
      account: `${id} 계정 ${i + 1}`,
      kind: KINDS[(i * 7 + seed) % 3],
      amount: ((i * 7919 + seed * 104729) % 9_000_000) + 10_000,
      rate: [10, 0, 5][(i + seed) % 3],
    }))
  return {
    sales: ledger('sales', 1),
    purchases: ledger('purchases', 2),
    expenses: ledger('expenses', 3),
  }
}

const ledgerColumns: ColumnDef[] = [
  {
    colId: 'account',
    headerName: '계정',
    type: T.text,
    flex: 2,
    editable: true,
  },
  { colId: 'kind', headerName: '구분', type: T.select(KINDS), editable: true },
  { colId: 'amount', headerName: '금액', type: T.money, editable: true },
  { colId: 'rate', headerName: '세율(%)', type: T.integer, editable: true },
  {
    colId: 'tax',
    headerName: '세액',
    type: T.money,
    formula: '=ROUND([.amount]*[.rate]/100,0)',
  },
]

const ledgerSheet = (id: LedgerId, name: string): SheetDef<LargeState> => ({
  id,
  title: name,
  columns: ledgerColumns,
  rows: [
    items(id, { label: name }),
    subtotal('total', '합 계', id, ['amount', 'tax'], 'total'),
  ],
})

const summaryColumns: ColumnDef[] = [
  { colId: 'label', headerName: '항목', type: T.text, flex: 2 },
  { colId: 'amount', headerName: '금액', type: T.money },
  { colId: 'tax', headerName: '세액', type: T.money },
]

// Per ledger: its total, and its amounts by kind (SUMIF over the whole list).
const summaryOf = (id: LedgerId, name: string): RowsNode<LargeState>[] => [
  title<LargeState>(`${id}-t`, name),
  row<LargeState>(`${id}-total`, { tags: 'subtotal' }, () => ({
    label: labelCell('합계'),
    amount: formulaCell(`=[${id}/total/amount]`),
    tax: formulaCell(`=[${id}/total/tax]`),
  })),
  ...KINDS.map((kind) =>
    row<LargeState>(`${id}-${kind}`, {}, () => ({
      label: labelCell(kind),
      amount: formulaCell(
        `=SUMIF([${id}/@${id}/kind],"${kind}",[${id}/@${id}/amount])`,
      ),
      tax: formulaCell(
        `=SUMIF([${id}/@${id}/kind],"${kind}",[${id}/@${id}/tax])`,
      ),
    })),
  ),
]

export const largeWorkbook = defineWorkbook<LargeState>([
  {
    id: 'summary',
    title: '요약',
    columns: summaryColumns,
    rows: [
      ...LEDGERS.flatMap((l) => summaryOf(l.id, l.title)),
      row('net', { tags: 'total' }, () => ({
        label: labelCell('매출 − 매입 − 경비'),
        amount: formulaCell(
          '=[sales/total/amount]-[purchases/total/amount]-[expenses/total/amount]',
        ),
        tax: formulaCell(
          '=[sales/total/tax]-[purchases/total/tax]-[expenses/total/tax]',
        ),
      })),
    ],
  },
  ...LEDGERS.map((l) => ledgerSheet(l.id, l.title)),
])
