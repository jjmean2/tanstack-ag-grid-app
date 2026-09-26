// Shape of the (mock) server response.
export type TaxSessionResponse = {
  company: { name: string; ceo: string; bizYear: number }
  adjustments: {
    id: string
    groupCd: 'ADD' | 'SUB'
    accountName: string
    bookAmt: number
    taxAmt: number
    dispCd: string
    memo: string
  }[]
  reportedAmt: number
  rates: { standardPct: number; localPct: number }
  credits: { researchAmt: number; employmentAmt: number }
}

// Shape of the client session state. Designed for editing, not for the server:
// one object for the whole editing session, split by domain rather than by tab.
export type AdjustmentItem = {
  id: string
  account: string
  book: number
  tax: number
  disposition: string
  note: string
}

export type TaxSession = {
  company: { name: string; ceo: string; bizYear: number }
  adds: AdjustmentItem[]
  subs: AdjustmentItem[]
  reported: number
  rates: { standard: number; local: number } // percent
  credits: { research: number; employment: number }
}

export type TabId = 'company' | 'adjustment' | 'tax'
