import type { AdjustmentItem, AdjustmentResponse } from './types'

const DISPOSITION_LABEL: Record<string, string> = {
  ETC_OUT: '기타사외유출',
  RESERVE: '유보',
}

export function toItems(res: AdjustmentResponse): AdjustmentItem[] {
  return res.items.map((i) => ({
    id: i.id,
    group: i.groupCd === 'ADD' ? 'add' : 'sub',
    account: i.accountName,
    bookAmount: i.bookAmt,
    taxAmount: i.taxAmt,
    disposition: DISPOSITION_LABEL[i.dispCd] ?? '',
    note: i.memo,
  }))
}

// Single values from the server that feed user-input cells. Key = `${rowId}.${colId}`.
export function toInitialInputs(res: AdjustmentResponse) {
  return { 'reported.taxAmount': res.reportedAmt }
}
