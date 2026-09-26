import type { AdjustmentItem, TaxSession, TaxSessionResponse } from './types'

const DISPOSITION_LABEL: Record<string, string> = {
  ETC_OUT: '기타사외유출',
  RESERVE: '유보',
}
const DISPOSITION_CODE = Object.fromEntries(
  Object.entries(DISPOSITION_LABEL).map(([code, label]) => [label, code]),
)

type ServerItem = TaxSessionResponse['adjustments'][number]

const toItem = (i: ServerItem): AdjustmentItem => ({
  id: i.id,
  account: i.accountName,
  book: i.bookAmt,
  tax: i.taxAmt,
  disposition: DISPOSITION_LABEL[i.dispCd] ?? '',
  note: i.memo,
})

const toServerItem =
  (groupCd: ServerItem['groupCd']) =>
  (i: AdjustmentItem): ServerItem => ({
    id: i.id,
    groupCd,
    accountName: i.account,
    bookAmt: i.book,
    taxAmt: i.tax,
    // Free text that is not a known label is passed through unchanged.
    dispCd: DISPOSITION_CODE[i.disposition] ?? i.disposition,
    memo: i.note,
  })

// Server -> client state. Here the server's flat list is split into the two
// lists the sheet edits, and the server's field names are replaced by ours.
export function toSession(res: TaxSessionResponse): TaxSession {
  return {
    company: { ...res.company },
    adds: res.adjustments.filter((i) => i.groupCd === 'ADD').map(toItem),
    subs: res.adjustments.filter((i) => i.groupCd === 'SUB').map(toItem),
    reported: res.reportedAmt,
    rates: { standard: res.rates.standardPct, local: res.rates.localPct },
    credits: {
      research: res.credits.researchAmt,
      employment: res.credits.employmentAmt,
    },
  }
}

// Client state -> server request payload.
export function toRequest(s: TaxSession): TaxSessionResponse {
  return {
    company: { ...s.company },
    adjustments: [
      ...s.adds.map(toServerItem('ADD')),
      ...s.subs.map(toServerItem('SUB')),
    ],
    reportedAmt: s.reported,
    rates: { standardPct: s.rates.standard, localPct: s.rates.local },
    credits: {
      researchAmt: s.credits.research,
      employmentAmt: s.credits.employment,
    },
  }
}

export const newAdjustmentItem = (): AdjustmentItem => ({
  id: crypto.randomUUID(),
  account: '',
  book: 0,
  tax: 0,
  disposition: '',
  note: '',
})
