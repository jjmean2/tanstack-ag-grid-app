import { newAdjustmentItem } from '#/entities/tax-session/model/adapter'
import type { TabId, TaxSession } from '#/entities/tax-session/model/types'
import {
  addRow,
  defineWorkbook,
  fields,
  formulaCell,
  inputCell,
  items,
  labelCell,
  row,
  spanned,
  subtotal,
  T,
  title,
} from '@lab/workbook'
import type { CellType, ColumnDef, Workbook } from '@lab/workbook'

// A workbook is a set of sheets (one per grid). Each sheet has columns (which
// give a default cell type) and rows (top to bottom). Formulas
// reference cells by address: `[sheet/row/col]`, `[row/col]` in the same sheet,
// `[.col]` in the same row, and `[@list/col]` for every row of a list.

// --- 기본정보 ---------------------------------------------------------------

// A form can define its own cell types: a year is an integer shown without
// grouping separators.
const year: CellType<number> = {
  ...T.integer,
  id: 'year',
  format: (v) => (typeof v === 'number' ? String(v) : ''),
}

const companyColumns: ColumnDef[] = [
  { colId: 'label', headerName: '항목', type: T.text },
  { colId: 'value', headerName: '값', type: T.text, flex: 2 },
]

// --- 소득금액조정 -----------------------------------------------------------

const adjustmentColumns: ColumnDef[] = [
  // Merged down per block (see `spanned` below).
  {
    colId: 'section',
    headerName: '구분',
    type: T.text,
    width: 110,
    spanRows: true,
  },
  {
    colId: 'account',
    headerName: '계정과목',
    type: T.text,
    flex: 2,
    editable: true,
  },
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
        type: T.select(['', '유보', '기타사외유출', '배당', '상여']),
        editable: true,
      },
      { colId: 'note', headerName: '비고', type: T.text, editable: true },
    ],
  },
  { colId: 'actions', headerName: '', type: T.text, width: 90 },
]

const amountCols = ['book', 'tax', 'diff']

// --- 세율·공제 입력 / 세액 계산 -----------------------------------------------

const valueColumns: ColumnDef[] = [
  { colId: 'label', headerName: '항목', type: T.text, flex: 2 },
  { colId: 'value', headerName: '값', type: T.money },
]

export const taxWorkbook = defineWorkbook<TaxSession>([
  {
    id: 'company',
    title: '기본정보',
    columns: companyColumns,
    rows: [
      fields('company', {
        name: '회사명',
        ceo: '대표자',
        bizYear: { label: '사업연도', type: year },
      }),
    ],
  },

  {
    id: 'adj',
    title: '소득금액조정',
    columns: adjustmentColumns,
    rows: [
      // Add buttons are full width rows: kept outside the merged blocks, which
      // they would otherwise cut in two.
      addRow('a-add', 'adds', newAdjustmentItem, '+ 익금산입 항목 추가'),
      spanned('adds', 'section', 'Ⅰ. 익금산입', [
        items('adds', { removeCol: 'actions', label: '익금산입 항목' }),
        subtotal('s-add', '소 계', 'adds', amountCols),
      ]),

      addRow('a-sub', 'subs', newAdjustmentItem, '+ 손금산입 항목 추가'),
      spanned('subs', 'section', 'Ⅱ. 손금산입', [
        items('subs', { removeCol: 'actions', label: '손금산입 항목' }),
        subtotal('s-sub', '소 계', 'subs', amountCols),
      ]),

      spanned('check', 'section', 'Ⅲ. 검증', [
        subtotal('total', '합 계', ['adds', 'subs'], amountCols, 'total'),
        row('reported', {}, (ctx) => ({
          account: labelCell('신고서상 금액'),
          tax: inputCell(ctx.state.reported, (value) =>
            ctx.update((s) => ({ ...s, reported: Number(value) })),
          ),
        })),
        row('gap', { tags: 'total' }, () => ({
          account: labelCell('차 이'),
          tax: formulaCell('=[total/tax]-[reported/tax]', {
            tags: ({ value }) => (value === 0 ? 'pass' : 'fail'),
          }),
          // A text result in a column whose type is `select`: a cell-level override.
          disposition: formulaCell(
            '=IF([gap/tax]=0,"일치","불일치 - 검토 필요")',
            {
              type: T.text,
              span: 2,
              tags: ({ get }) => (get('adj/gap/tax') === 0 ? 'pass' : 'fail'),
            },
          ),
        })),
      ]),
    ],
  },

  {
    id: 'inputs',
    title: '세율·공제 입력',
    columns: valueColumns,
    rows: [
      title('t-rates', '세율'),
      fields('rates', {
        standard: { label: '법인세율', type: T.percent },
        local: { label: '지방소득세율', type: T.percent },
        sme: { label: '중소기업 감면율', type: T.percent },
      }),

      // Values in the same column with different types: the column says money,
      // each field overrides it.
      title('t-period', '사업연도'),
      fields('period', {
        start: { label: '개시일 (YYYY-MM-DD)', type: T.date },
        end: { label: '종료일 (YYYY-MM-DD)', type: T.date },
      }),

      title('t-options', '신고 옵션'),
      fields('options', {
        method: { label: '신고방식', type: T.select(['일반', '간편']) },
        sme: { label: '중소기업 여부', type: T.boolean },
      }),

      title('t-credits', '세액공제'),
      fields('credits', {
        research: '연구·인력개발비 공제',
        employment: '고용증대 공제',
      }),
      row('credit-total', { tags: 'subtotal' }, () => ({
        label: labelCell('공제 합계'),
        value: formulaCell('=SUM([@credits/value])'),
      })),
    ],
  },

  {
    id: 'calc',
    title: '세액 계산',
    columns: valueColumns,
    rows: [
      // Read from the closing screen: only its saved export, not its sheets.
      row('net-income', {}, () => ({
        label: labelCell('결산서상 당기순이익 (결산 화면)'),
        value: formulaCell('=[ext:closing/netIncome]'),
      })),
      row('base', { tags: 'subtotal' }, () => ({
        label: labelCell('과세표준 (당기순이익 + 익금산입 − 손금산입)'),
        value: formulaCell(
          '=[net-income/value]+[adj/s-add/tax]-[adj/s-sub/tax]',
        ),
      })),
      // Row-level type: every value cell of these rows is an integer.
      row('days', { type: T.integer }, () => ({
        label: labelCell('사업연도 일수'),
        value: formulaCell(
          '=DAYS([inputs/period.end/value],[inputs/period.start/value])+1',
        ),
      })),
      row('months', { type: T.integer }, () => ({
        label: labelCell('사업연도 월수'),
        value: formulaCell(
          '=DATEDIF([inputs/period.start/value],[inputs/period.end/value]+1,"M")',
        ),
      })),
      row('computed', {}, () => ({
        label: labelCell('산출세액'),
        value: formulaCell(
          '=ROUND([base/value]*[inputs/rates.standard/value]/100,0)',
        ),
      })),
      row('credit', {}, () => ({
        label: labelCell('세액공제 합계'),
        value: formulaCell('=[inputs/credit-total/value]'),
      })),
      row('reduction', {}, () => ({
        label: labelCell('중소기업 감면세액'),
        value: formulaCell(
          '=IF([inputs/options.sme/value],ROUND(MAX([computed/value]-[credit/value],0)*[inputs/rates.sme/value]/100,0),0)',
        ),
      })),
      row('decided', { tags: 'subtotal' }, () => ({
        label: labelCell('결정세액'),
        value: formulaCell(
          '=MAX([computed/value]-[credit/value]-[reduction/value],0)',
        ),
      })),
      row('local', {}, () => ({
        label: labelCell('지방소득세'),
        value: formulaCell(
          '=ROUND([decided/value]*[inputs/rates.local/value]/100,0)',
        ),
      })),
      row('burden', { tags: 'total' }, () => ({
        label: labelCell('총부담세액'),
        value: formulaCell('=[decided/value]+[local/value]'),
      })),
      row('summary', { type: T.text }, () => ({
        label: labelCell('신고 요약'),
        value: formulaCell(
          '=CONCAT([company/company.name/value]," ",[company/company.bizYear/value],"년 / ",[inputs/options.method/value]," 신고 / ",IF([inputs/options.sme/value],"중소기업","일반기업")," / ",[days/value],"일")',
        ),
      })),
    ],
  },
])

// Open issues per tab, beyond formula errors (the screen counts those): shown
// as badges on the tab bar.
export function issueCounts(
  wb: Workbook,
  state: TaxSession,
): Record<TabId, number> {
  const emptyAccounts = [...state.adds, ...state.subs].filter(
    (i) => i.account.trim() === '',
  ).length
  return {
    company: state.company.name.trim() === '' ? 1 : 0,
    adjustment: (wb.value('adj/gap/tax') === 0 ? 0 : 1) + emptyAccounts,
    tax: state.rates.standard > 0 ? 0 : 1,
  }
}
