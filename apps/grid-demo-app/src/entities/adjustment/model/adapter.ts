import type {
  AdjustmentItem,
  AdjustmentResponse,
  AdjustmentState,
} from './types'

const DISPOSITION_LABEL: Record<string, string> = {
  ETC_OUT: '기타사외유출',
  RESERVE: '유보',
}

const toItem = (i: AdjustmentResponse['items'][number]): AdjustmentItem => ({
  id: i.id,
  account: i.accountName,
  book: i.bookAmt,
  tax: i.taxAmt,
  disposition: DISPOSITION_LABEL[i.dispCd] ?? '',
  note: i.memo,
})

// Server -> client state.
export function toAdjustmentState(res: AdjustmentResponse): AdjustmentState {
  return {
    adds: res.items.filter((i) => i.groupCd === 'ADD').map(toItem),
    subs: res.items.filter((i) => i.groupCd === 'SUB').map(toItem),
    reported: res.reportedAmt,
  }
}
