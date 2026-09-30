import {
  addRow,
  boundCell,
  defineWorkbook,
  formulaCell,
  items,
  row,
  subtotal,
  T,
} from '@lab/workbook'
import type {
  CellSpec,
  ColumnDef,
  RowsCtx,
  RowsNode,
  Tags,
} from '@lab/workbook'

// A made-up return whose layout borrows from a paper VAT return: numbered
// lines, labels merged down and across, shaded boxes. Not a real legal form.
//
// This file holds the cells only: two sheets of ordinary rows (a row per line,
// columns 금액 and 세액). Where the boxes go on the page is the view's, in
// ui/return-layout.ts.

export type Purchase = {
  id: string
  vendor: string
  kind: string // 일반 | 고정자산
  amount: number
}

export type VatState = {
  biz: {
    name: string
    ceo: string
    no: string
    address: string
    phone: string
    kind: string
  }
  period: { start: string; end: string }
  sales: {
    invoice: number
    buyerIssued: number
    card: number
    other: number
    zeroInvoice: number
    zeroOther: number
    missedAmount: number
    missedTax: number
    badDebtTax: number
  }
  purchases: Purchase[]
  purchaseExtra: {
    missedAmount: number
    missedTax: number
    otherAmount: number
    nonDeductible: number
  }
  credits: { other: number }
}

export const initialVat: VatState = {
  biz: {
    name: '(주)예시상사',
    ceo: '김예시',
    no: '123-45-67890',
    address: '서울특별시 예시구 예시로 1',
    phone: '02-000-0000',
    kind: '일반',
  },
  period: { start: '2026-01-01', end: '2026-06-30' },
  sales: {
    invoice: 120_000_000,
    buyerIssued: 0,
    card: 35_000_000,
    other: 2_000_000,
    zeroInvoice: 10_000_000,
    zeroOther: 0,
    missedAmount: 0,
    missedTax: 0,
    badDebtTax: 0,
  },
  purchases: [
    { id: 'p1', vendor: '(주)가나상사', kind: '일반', amount: 64_000_000 },
    { id: 'p2', vendor: '다라물산', kind: '일반', amount: 18_500_000 },
    { id: 'p3', vendor: '마바설비', kind: '고정자산', amount: 12_000_000 },
  ],
  purchaseExtra: {
    missedAmount: 0,
    missedTax: 0,
    otherAmount: 0,
    nonDeductible: 0,
  },
  credits: { other: 0 },
}

export const newPurchase = (): Purchase => ({
  id: crypto.randomUUID(),
  vendor: '',
  kind: '일반',
  amount: 0,
})

// The numbered lines of the return: row id → number and name. The rows below
// are labelled with them, and the layout prints them.
export const LINES = {
  s1: ['(1)', '세금계산서 발급분'],
  s2: ['(2)', '매입자발행 세금계산서'],
  s3: ['(3)', '신용카드·현금영수증 발행분'],
  s4: ['(4)', '기타(정규영수증 외 매출분)'],
  s5: ['(5)', '세금계산서 발급분'],
  s6: ['(6)', '기타'],
  s7: ['(7)', '예정신고 누락분'],
  s8: ['(8)', '대손세액 가감'],
  s9: ['(9)', '합 계'],
  p10: ['(10)', '일반 매입'],
  p11: ['(11)', '고정자산 매입'],
  p12: ['(12)', '예정신고 누락분'],
  p13: ['(13)', '그 밖의 공제매입세액'],
  p14: ['(14)', '합계 (10)+(11)+(12)+(13)'],
  p15: ['(15)', '공제받지 못할 매입세액'],
  p16: ['(16)', '차감 계 (14)−(15)'],
  c17: ['(17)', '그 밖의 경감·공제세액'],
  c18: ['(18)', '신용카드매출전표등 발행공제'],
  c19: ['(19)', '합 계'],
} as const
export type LineId = keyof typeof LINES

type Cells = { amount?: CellSpec; tax?: CellSpec }

// One numbered line of the return. A line without an amount or tax leaves
// that cell out (the layout shades the box).
const line = (
  id: LineId,
  cells: (ctx: RowsCtx<VatState>) => Cells,
  tags?: Tags,
): RowsNode<VatState> =>
  row(id, { label: LINES[id].join(' '), tags }, (ctx) => ({ ...cells(ctx) }))

const sum = (refs: string[]) => `=SUM(${refs.map((r) => `[${r}]`).join(',')})`
// Tax at `rate`% of the line's amount.
const tax = (rate: number) => formulaCell(`=ROUND([.amount]*${rate}/100,0)`)

// --- 사업자 정보 --------------------------------------------------------------

const infoColumns: ColumnDef[] = [
  { colId: 'name', headerName: '상호', type: T.text },
  { colId: 'ceo', headerName: '성명', type: T.text },
  { colId: 'no', headerName: '사업자등록번호', type: T.text },
  { colId: 'address', headerName: '사업장 주소', type: T.text },
  { colId: 'phone', headerName: '전화번호', type: T.text },
  { colId: 'kind', headerName: '과세유형', type: T.select(['일반', '간이']) },
  { colId: 'start', headerName: '개시일', type: T.date },
  { colId: 'end', headerName: '종료일', type: T.date },
]

const info: RowsNode<VatState>[] = [
  row('biz', { label: '사업자' }, (ctx) => ({
    name: boundCell(ctx, 'biz', 'name'),
    ceo: boundCell(ctx, 'biz', 'ceo'),
    no: boundCell(ctx, 'biz', 'no'),
    address: boundCell(ctx, 'biz', 'address'),
    phone: boundCell(ctx, 'biz', 'phone'),
    kind: boundCell(ctx, 'biz', 'kind'),
  })),
  row('period', { label: '신고기간' }, (ctx) => ({
    start: boundCell(ctx, 'period', 'start'),
    end: boundCell(ctx, 'period', 'end'),
  })),
]

// --- 신고 내용 ----------------------------------------------------------------

const returnColumns: ColumnDef[] = [
  { colId: 'amount', headerName: '금액', type: T.money },
  { colId: 'tax', headerName: '세액', type: T.money },
]

const sales = (prop: keyof VatState['sales']) => (ctx: RowsCtx<VatState>) =>
  boundCell(ctx, 'sales', prop)
const extra =
  (prop: keyof VatState['purchaseExtra']) => (ctx: RowsCtx<VatState>) =>
    boundCell(ctx, 'purchaseExtra', prop)
// (10) and (11) add up the purchase list sheet by kind.
const byKind = (kind: string) =>
  formulaCell(
    `=SUMIF([purchases/@purchases/kind],"${kind}",[purchases/@purchases/amount])`,
  )

const ret: RowsNode<VatState>[] = [
  // 과세표준 및 매출세액
  line('s1', (c) => ({ amount: sales('invoice')(c), tax: tax(10) })),
  line('s2', (c) => ({ amount: sales('buyerIssued')(c), tax: tax(10) })),
  line('s3', (c) => ({ amount: sales('card')(c), tax: tax(10) })),
  line('s4', (c) => ({ amount: sales('other')(c), tax: tax(10) })),
  line('s5', (c) => ({ amount: sales('zeroInvoice')(c), tax: tax(0) })),
  line('s6', (c) => ({ amount: sales('zeroOther')(c), tax: tax(0) })),
  line('s7', (c) => ({
    amount: sales('missedAmount')(c),
    tax: sales('missedTax')(c),
  })),
  line('s8', (c) => ({ tax: sales('badDebtTax')(c) })),
  line(
    's9',
    () => ({
      amount: formulaCell(
        sum(
          ['s1', 's2', 's3', 's4', 's5', 's6', 's7'].map((l) => `${l}/amount`),
        ),
      ),
      tax: formulaCell(
        sum(
          ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'].map(
            (l) => `${l}/tax`,
          ),
        ),
      ),
    }),
    'strong',
  ),

  // 매입세액
  line('p10', () => ({ amount: byKind('일반'), tax: tax(10) })),
  line('p11', () => ({ amount: byKind('고정자산'), tax: tax(10) })),
  line('p12', (c) => ({
    amount: extra('missedAmount')(c),
    tax: extra('missedTax')(c),
  })),
  line('p13', (c) => ({ amount: extra('otherAmount')(c), tax: tax(10) })),
  line(
    'p14',
    () => ({
      amount: formulaCell(
        sum(['p10', 'p11', 'p12', 'p13'].map((l) => `${l}/amount`)),
      ),
      tax: formulaCell(
        sum(['p10', 'p11', 'p12', 'p13'].map((l) => `${l}/tax`)),
      ),
    }),
    'strong',
  ),
  line('p15', (c) => ({ amount: extra('nonDeductible')(c), tax: tax(10) })),
  line(
    'p16',
    () => ({
      amount: formulaCell('=[p14/amount]-[p15/amount]'),
      tax: formulaCell('=[p14/tax]-[p15/tax]'),
    }),
    'strong',
  ),

  // 납부세액, 경감·공제세액, 납부할 세액
  row('pay', { label: '납부(환급)세액', tags: 'strong' }, () => ({
    tax: formulaCell('=[s9/tax]-[p16/tax]'),
  })),
  line('c17', (c) => ({ tax: boundCell(c, 'credits', 'other') })),
  line('c18', () => ({
    amount: formulaCell('=[s3/amount]'),
    tax: formulaCell('=MIN(ROUND([.amount]*1.3/100,0),10000000)'),
  })),
  line('c19', () => ({ tax: formulaCell('=[c17/tax]+[c18/tax]') }), 'strong'),
  row('final', { label: '차가감 납부할 세액', tags: 'strong' }, () => ({
    tax: formulaCell('=[pay/tax]-[c19/tax]'),
  })),
]

// --- 매입 명세 (목록) -------------------------------------------------------------

const purchaseColumns: ColumnDef[] = [
  {
    colId: 'vendor',
    headerName: '거래처',
    type: T.text,
    flex: 2,
    editable: true,
  },
  {
    colId: 'kind',
    headerName: '구분',
    type: T.select(['일반', '고정자산']),
    editable: true,
  },
  { colId: 'amount', headerName: '공급가액', type: T.money, editable: true },
  {
    colId: 'tax',
    headerName: '세액',
    type: T.money,
    formula: '=ROUND([.amount]*10/100,0)',
  },
  { colId: 'actions', headerName: '', type: T.text, width: 90 },
]

export const vatWorkbook = defineWorkbook<VatState>([
  { id: 'info', title: '사업자 정보', columns: infoColumns, rows: info },
  { id: 'ret', title: '신고 내용', columns: returnColumns, rows: ret },
  {
    id: 'purchases',
    title: '매입 명세',
    columns: purchaseColumns,
    rows: [
      addRow('add', 'purchases', newPurchase, '+ 매입 추가'),
      items('purchases', { removeCol: 'actions', label: '매입 명세' }),
      subtotal('total', '합 계', 'purchases', ['amount', 'tax'], 'total'),
    ],
  },
])
