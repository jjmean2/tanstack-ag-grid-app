// Shape of the (mock) server response.
export type AdjustmentResponse = {
  items: {
    id: string
    groupCd: 'ADD' | 'SUB'
    accountName: string
    bookAmt: number
    taxAmt: number
    dispCd: string
    memo: string
  }[]
  reportedAmt: number
}

// Shape of the client state the sheet edits: the server's flat list split
// into the two lists the sheet shows, with our field names.
export type AdjustmentItem = {
  id: string
  account: string
  book: number
  tax: number
  disposition: string
  note: string
}

export type AdjustmentState = {
  adds: AdjustmentItem[] // 익금산입
  subs: AdjustmentItem[] // 손금산입
  reported: number // 신고서상 금액
}
