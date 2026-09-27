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
  rates: { standardPct: number; localPct: number; smePct: number }
  credits: { researchAmt: number; employmentAmt: number }
  period: { startDate: string; endDate: string } // ISO dates
  options: { method: string; smeYn: boolean }
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
  rates: { standard: number; local: number; sme: number } // percent
  credits: { research: number; employment: number }
  period: { start: string; end: string } // ISO dates
  options: { method: string; sme: boolean }
}

export type TabId = 'company' | 'adjustment' | 'tax'
