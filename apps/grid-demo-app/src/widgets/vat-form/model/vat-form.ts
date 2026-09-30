import {
  addRow,
  boundCell,
  cellBox,
  defineWorkbook,
  formulaCell,
  items,
  subtotal,
  T,
  textBox,
} from '@lab/workbook'
import type {
  CellSpec,
  FormCtx,
  FormItem,
  Look,
  Place,
  SheetColumnDef,
} from '@lab/workbook'

// A made-up return whose layout borrows from a paper VAT return: numbered
// lines, labels merged down and across, shaded boxes. Not a real legal form.

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

const money = { type: T.money }
const sum = (refs: string[]) => `=SUM(${refs.map((r) => `[${r}]`).join(',')})`
const tax = (id: string, rate: number) =>
  formulaCell(`=ROUND([${id}/amount]*${rate}/100,0)`, money)

// One numbered line: label | (n) | amount | rate | tax. `null` boxes are
// shaded (not used on this line).
function line(
  row: number,
  labelAt: Place,
  id: string,
  label: string,
  num: string,
  boxes: { amount: CellSpec | null; rate: string | null; tax: CellSpec | null },
  look?: Look,
): FormItem[] {
  const name = `${num} ${label}`
  return [
    textBox(labelAt, label, look ?? 'label'),
    textBox([row, 4], num, 'num'),
    boxes.amount
      ? cellBox([row, 5], `${id}/amount`, boxes.amount, { name, look })
      : textBox([row, 5], '', 'shade'),
    boxes.rate === null
      ? textBox([row, 6], '', 'shade')
      : textBox([row, 6], boxes.rate, 'num'),
    boxes.tax
      ? cellBox([row, 7], `${id}/tax`, boxes.tax, { name, look })
      : textBox([row, 7], '', 'shade'),
  ]
}

// --- 사업자 정보 --------------------------------------------------------------

const info = ({ state, update }: FormCtx<VatState>): FormItem[] => {
  const ctx = { state, update }
  const biz = (prop: keyof VatState['biz']) => boundCell(ctx, 'biz', prop)
  return [
    textBox([1, 1], '상 호', 'head'),
    cellBox([1, 2], 'biz/name', biz('name'), { name: '사업자' }),
    textBox([1, 3], '성 명', 'head'),
    cellBox([1, 4], 'biz/ceo', biz('ceo')),
    textBox([1, 5], '사업자등록번호', 'head'),
    cellBox([1, 6], 'biz/no', biz('no')),

    textBox([2, 1], '사업장 주소', 'head'),
    cellBox([2, 2, 1, 3], 'biz/address', biz('address')),
    textBox([2, 5], '전화번호', 'head'),
    cellBox([2, 6], 'biz/phone', biz('phone')),

    textBox([3, 1], '신고기간', 'head'),
    cellBox(
      [3, 2],
      'period/start',
      boundCell(ctx, 'period', 'start', { type: T.date }),
      { name: '신고기간' },
    ),
    textBox([3, 3], '~', 'head'),
    cellBox(
      [3, 4],
      'period/end',
      boundCell(ctx, 'period', 'end', { type: T.date }),
    ),
    textBox([3, 5], '과세유형', 'head'),
    cellBox(
      [3, 6],
      'biz/kind',
      boundCell(ctx, 'biz', 'kind', { type: T.select(['일반', '간이']) }),
    ),
  ]
}

// --- 신고 내용 ----------------------------------------------------------------

const header = (): FormItem[] => [
  textBox([1, 1, 1, 7], '① 신고 내용', 'title'),
  textBox([2, 1, 1, 4], '구 분', 'head'),
  textBox([2, 5], '금 액', 'head'),
  textBox([2, 6], '세율', 'head'),
  textBox([2, 7], '세 액', 'head'),
]

// Lines (1)-(9), rows 3-11.
const sales = ({ state, update }: FormCtx<VatState>): FormItem[] => {
  const input = (prop: keyof VatState['sales']) =>
    boundCell({ state, update }, 'sales', prop, money)
  const s = (n: number) => `s${n}`
  return [
    textBox([3, 1, 9, 1], '과세표준 및 매출세액', 'head'),
    textBox([3, 2, 4, 1], '과세', 'head'),
    ...line(3, [3, 3], s(1), '세금계산서 발급분', '(1)', {
      amount: input('invoice'),
      rate: '10/100',
      tax: tax(s(1), 10),
    }),
    ...line(4, [4, 3], s(2), '매입자발행 세금계산서', '(2)', {
      amount: input('buyerIssued'),
      rate: '10/100',
      tax: tax(s(2), 10),
    }),
    ...line(5, [5, 3], s(3), '신용카드·현금영수증 발행분', '(3)', {
      amount: input('card'),
      rate: '10/100',
      tax: tax(s(3), 10),
    }),
    ...line(6, [6, 3], s(4), '기타(정규영수증 외 매출분)', '(4)', {
      amount: input('other'),
      rate: '10/100',
      tax: tax(s(4), 10),
    }),
    textBox([7, 2, 2, 1], '영세율', 'head'),
    ...line(7, [7, 3], s(5), '세금계산서 발급분', '(5)', {
      amount: input('zeroInvoice'),
      rate: '0/100',
      tax: tax(s(5), 0),
    }),
    ...line(8, [8, 3], s(6), '기타', '(6)', {
      amount: input('zeroOther'),
      rate: '0/100',
      tax: tax(s(6), 0),
    }),
    ...line(9, [9, 2, 1, 2], s(7), '예정신고 누락분', '(7)', {
      amount: input('missedAmount'),
      rate: '',
      tax: input('missedTax'),
    }),
    ...line(10, [10, 2, 1, 2], s(8), '대손세액 가감', '(8)', {
      amount: null,
      rate: null,
      tax: input('badDebtTax'),
    }),
    ...line(
      11,
      [11, 2, 1, 2],
      s(9),
      '합 계',
      '(9)',
      {
        amount: formulaCell(
          sum([1, 2, 3, 4, 5, 6, 7].map((n) => `${s(n)}/amount`)),
          money,
        ),
        rate: '㉮',
        tax: formulaCell(
          sum([1, 2, 3, 4, 5, 6, 7, 8].map((n) => `${s(n)}/tax`)),
          money,
        ),
      },
      'strong',
    ),
  ]
}

// Lines (10)-(16), rows 12-18. (10) and (11) add up the purchase list sheet.
const purchases = ({ state, update }: FormCtx<VatState>): FormItem[] => {
  const input = (prop: keyof VatState['purchaseExtra']) =>
    boundCell({ state, update }, 'purchaseExtra', prop, money)
  const byKind = (kind: string) =>
    formulaCell(
      `=SUMIF([purchases/@purchases/kind],"${kind}",[purchases/@purchases/amount])`,
      money,
    )
  return [
    textBox([12, 1, 7, 1], '매입세액', 'head'),
    textBox([12, 2, 2, 1], '세금계산서 수취분', 'head'),
    ...line(12, [12, 3], 'p10', '일반 매입', '(10)', {
      amount: byKind('일반'),
      rate: '',
      tax: tax('p10', 10),
    }),
    ...line(13, [13, 3], 'p11', '고정자산 매입', '(11)', {
      amount: byKind('고정자산'),
      rate: '',
      tax: tax('p11', 10),
    }),
    ...line(14, [14, 2, 1, 2], 'p12', '예정신고 누락분', '(12)', {
      amount: input('missedAmount'),
      rate: '',
      tax: input('missedTax'),
    }),
    ...line(15, [15, 2, 1, 2], 'p13', '그 밖의 공제매입세액', '(13)', {
      amount: input('otherAmount'),
      rate: '',
      tax: tax('p13', 10),
    }),
    ...line(
      16,
      [16, 2, 1, 2],
      'p14',
      '합계 (10)+(11)+(12)+(13)',
      '(14)',
      {
        amount: formulaCell(
          sum(['p10', 'p11', 'p12', 'p13'].map((p) => `${p}/amount`)),
          money,
        ),
        rate: '',
        tax: formulaCell(
          sum(['p10', 'p11', 'p12', 'p13'].map((p) => `${p}/tax`)),
          money,
        ),
      },
      'strong',
    ),
    ...line(17, [17, 2, 1, 2], 'p15', '공제받지 못할 매입세액', '(15)', {
      amount: input('nonDeductible'),
      rate: '',
      tax: tax('p15', 10),
    }),
    ...line(
      18,
      [18, 2, 1, 2],
      'p16',
      '차감 계 (14)−(15)',
      '(16)',
      {
        amount: formulaCell('=[p14/amount]-[p15/amount]', money),
        rate: '㉯',
        tax: formulaCell('=[p14/tax]-[p15/tax]', money),
      },
      'strong',
    ),
  ]
}

// Rows 19-23: tax due, credits (17)-(19), and what is finally paid.
const settlement = ({ state, update }: FormCtx<VatState>): FormItem[] => [
  textBox(
    [19, 1, 1, 4],
    '납부(환급)세액 (매출세액 ㉮ − 매입세액 ㉯)',
    'strong',
  ),
  textBox([19, 5, 1, 2], '', 'shade'),
  cellBox([19, 7], 'pay/tax', formulaCell('=[s9/tax]-[p16/tax]', money), {
    name: '납부(환급)세액',
    look: 'strong',
  }),

  textBox([20, 1, 3, 2], '경감·공제세액', 'head'),
  ...line(20, [20, 3], 'c17', '그 밖의 경감·공제세액', '(17)', {
    amount: null,
    rate: null,
    tax: boundCell({ state, update }, 'credits', 'other', money),
  }),
  ...line(21, [21, 3], 'c18', '신용카드매출전표등 발행공제', '(18)', {
    amount: formulaCell('=[s3/amount]', money),
    rate: '1.3/100',
    tax: formulaCell('=MIN(ROUND([c18/amount]*1.3/100,0),10000000)', money),
  }),
  ...line(
    22,
    [22, 3],
    'c19',
    '합 계',
    '(19)',
    {
      amount: null,
      rate: null,
      tax: formulaCell('=[c17/tax]+[c18/tax]', money),
    },
    'strong',
  ),

  textBox([23, 1, 1, 4], '차가감하여 납부할 세액 (환급받을 세액)', 'strong'),
  textBox([23, 5, 1, 2], '', 'shade'),
  cellBox([23, 7], 'final/tax', formulaCell('=[pay/tax]-[c19/tax]', money), {
    name: '차가감 납부할 세액',
    look: 'strong',
  }),
]

// --- 매입 명세 (목록) -------------------------------------------------------------

const purchaseColumns: SheetColumnDef[] = [
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
  {
    kind: 'form',
    id: 'info',
    title: '사업자 정보',
    tab: 'return',
    tracks: ['7rem', '1fr', '6rem', '1fr', '8rem', '1fr'],
    colNames: {
      name: '상호',
      ceo: '성명',
      no: '사업자등록번호',
      address: '사업장 주소',
      phone: '전화번호',
      kind: '과세유형',
      start: '개시일',
      end: '종료일',
    },
    layout: [info],
  },
  {
    kind: 'form',
    id: 'ret',
    title: '신고 내용',
    tab: 'return',
    tracks: [
      '4.5rem',
      '4rem',
      'minmax(13rem,1fr)',
      '3rem',
      '10rem',
      '4.5rem',
      '10rem',
    ],
    colNames: { amount: '금액', tax: '세액' },
    layout: [header, sales, purchases, settlement],
  },
  {
    id: 'purchases',
    title: '매입 명세',
    tab: 'purchases',
    columns: purchaseColumns,
    layout: [
      addRow('add', 'purchases', newPurchase, '+ 매입 추가'),
      items('purchases', { removeCol: 'actions', label: '매입 명세' }),
      subtotal('total', '합 계', 'purchases', ['amount', 'tax'], 'sheet-total'),
    ],
  },
])
