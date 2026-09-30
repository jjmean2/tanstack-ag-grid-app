import type { AdjustmentResponse } from './types'

export const adjustmentResponse: AdjustmentResponse = {
  items: [
    {
      id: 'a1',
      groupCd: 'ADD',
      accountName: '접대비',
      bookAmt: 12_000_000,
      taxAmt: 8_000_000,
      dispCd: 'ETC_OUT',
      memo: '',
    },
    {
      id: 'a2',
      groupCd: 'ADD',
      accountName: '기부금',
      bookAmt: 5_000_000,
      taxAmt: 5_000_000,
      dispCd: '',
      memo: '',
    },
    {
      id: 'a3',
      groupCd: 'ADD',
      accountName: '감가상각비',
      bookAmt: 3_000_000,
      taxAmt: 2_500_000,
      dispCd: 'RESERVE',
      memo: '',
    },
    {
      id: 's1',
      groupCd: 'SUB',
      accountName: '대손충당금',
      bookAmt: 1_500_000,
      taxAmt: 2_000_000,
      dispCd: 'RESERVE',
      memo: '전기 유보 추인',
    },
    {
      id: 's2',
      groupCd: 'SUB',
      accountName: '미수이자',
      bookAmt: 800_000,
      taxAmt: 0,
      dispCd: 'RESERVE',
      memo: '',
    },
  ],
  reportedAmt: 17_000_000,
}
