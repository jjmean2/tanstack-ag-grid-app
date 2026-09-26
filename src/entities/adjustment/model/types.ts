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

// Shape the sheet works with.
export type AdjustmentItem = {
  id: string
  group: 'add' | 'sub'
  account: string
  bookAmount: number
  taxAmount: number
  disposition: string
  note: string
}
