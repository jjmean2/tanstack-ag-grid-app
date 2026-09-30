import { cellBox, textBox } from '@lab/workbook/react'
import type { Box, Place } from '@lab/workbook/react'
import type { Tags } from '@lab/workbook'
import { LINES } from '../model/vat-form'
import type { LineId } from '../model/vat-form'

// Where the return's cells go on the page, like a paper form: boxes placed on
// a grid of tracks, merged down and across. The cells themselves (values,
// formulas, labels) are the model's; a cell box names one as "row/col".

// --- 사업자 정보 --------------------------------------------------------------

export const infoLayout = {
  tracks: ['7rem', '1fr', '6rem', '1fr', '8rem', '1fr'],
  boxes: [
    textBox([1, 1], '상 호', 'head'),
    cellBox([1, 2], 'biz/name'),
    textBox([1, 3], '성 명', 'head'),
    cellBox([1, 4], 'biz/ceo'),
    textBox([1, 5], '사업자등록번호', 'head'),
    cellBox([1, 6], 'biz/no'),

    textBox([2, 1], '사업장 주소', 'head'),
    cellBox([2, 2, 1, 3], 'biz/address'),
    textBox([2, 5], '전화번호', 'head'),
    cellBox([2, 6], 'biz/phone'),

    textBox([3, 1], '신고기간', 'head'),
    cellBox([3, 2], 'period/start'),
    textBox([3, 3], '~', 'head'),
    cellBox([3, 4], 'period/end'),
    textBox([3, 5], '과세유형', 'head'),
    cellBox([3, 6], 'biz/kind'),
  ] satisfies Box[],
}

// --- 신고 내용 ----------------------------------------------------------------

// One numbered line on grid row `row`: label | (n) | 금액 | 세율 | 세액.
// `rate: null` is a line without an amount: 금액 and 세율 are shaded.
function line(
  row: number,
  labelAt: Place,
  id: LineId,
  rate: string | null,
  tags?: Tags,
): Box[] {
  const [num, label] = LINES[id]
  return [
    textBox(labelAt, label, tags ?? 'label'),
    textBox([row, 4], num, 'num'),
    rate === null
      ? textBox([row, 5], '', 'shade')
      : cellBox([row, 5], `${id}/amount`),
    rate === null
      ? textBox([row, 6], '', 'shade')
      : textBox([row, 6], rate, 'num'),
    cellBox([row, 7], `${id}/tax`),
  ]
}

export const returnLayout = {
  tracks: [
    '4.5rem',
    '4rem',
    'minmax(13rem,1fr)',
    '3rem',
    '10rem',
    '4.5rem',
    '10rem',
  ],
  boxes: [
    textBox([1, 1, 1, 7], '① 신고 내용', 'title'),
    textBox([2, 1, 1, 4], '구 분', 'head'),
    textBox([2, 5], '금 액', 'head'),
    textBox([2, 6], '세율', 'head'),
    textBox([2, 7], '세 액', 'head'),

    // (1)-(9), rows 3-11
    textBox([3, 1, 9, 1], '과세표준 및 매출세액', 'head'),
    textBox([3, 2, 4, 1], '과세', 'head'),
    ...line(3, [3, 3], 's1', '10/100'),
    ...line(4, [4, 3], 's2', '10/100'),
    ...line(5, [5, 3], 's3', '10/100'),
    ...line(6, [6, 3], 's4', '10/100'),
    textBox([7, 2, 2, 1], '영세율', 'head'),
    ...line(7, [7, 3], 's5', '0/100'),
    ...line(8, [8, 3], 's6', '0/100'),
    ...line(9, [9, 2, 1, 2], 's7', ''),
    ...line(10, [10, 2, 1, 2], 's8', null),
    ...line(11, [11, 2, 1, 2], 's9', '㉮', 'strong'),

    // (10)-(16), rows 12-18
    textBox([12, 1, 7, 1], '매입세액', 'head'),
    textBox([12, 2, 2, 1], '세금계산서 수취분', 'head'),
    ...line(12, [12, 3], 'p10', ''),
    ...line(13, [13, 3], 'p11', ''),
    ...line(14, [14, 2, 1, 2], 'p12', ''),
    ...line(15, [15, 2, 1, 2], 'p13', ''),
    ...line(16, [16, 2, 1, 2], 'p14', '', 'strong'),
    ...line(17, [17, 2, 1, 2], 'p15', ''),
    ...line(18, [18, 2, 1, 2], 'p16', '㉯', 'strong'),

    // rows 19-23: tax due, credits (17)-(19), what is finally paid
    textBox(
      [19, 1, 1, 4],
      '납부(환급)세액 (매출세액 ㉮ − 매입세액 ㉯)',
      'strong',
    ),
    textBox([19, 5, 1, 2], '', 'shade'),
    cellBox([19, 7], 'pay/tax'),
    textBox([20, 1, 3, 2], '경감·공제세액', 'head'),
    ...line(20, [20, 3], 'c17', null),
    ...line(21, [21, 3], 'c18', '1.3/100'),
    ...line(22, [22, 3], 'c19', null, 'strong'),
    textBox([23, 1, 1, 4], '차가감하여 납부할 세액 (환급받을 세액)', 'strong'),
    textBox([23, 5, 1, 2], '', 'shade'),
    cellBox([23, 7], 'final/tax'),
  ] satisfies Box[],
}
