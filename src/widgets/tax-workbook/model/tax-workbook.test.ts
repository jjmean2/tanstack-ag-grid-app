import { toSession } from '#/entities/tax-session/model/adapter'
import { taxSessionResponse } from '#/entities/tax-session/model/data'
import type { TaxSession } from '#/entities/tax-session/model/types'
import {
  buildWorkbook,
  checkWorkbook,
  externalsFrom,
  screenExports,
} from '@labs/workbook'
import {
  closingWorkbook,
  initialClosing,
} from '#/widgets/closing-workbook/model/closing-workbook'
import { taxWorkbook } from './tax-workbook'

const initial = toSession(taxSessionResponse)
const item = (id: string) => ({
  id,
  account: id,
  book: 1,
  tax: 2,
  disposition: '',
  note: '',
})

// Data that makes the layout produce different rows.
const samples: Record<string, TaxSession> = {
  initial,
  'empty lists': { ...initial, adds: [], subs: [] },
  'many items': {
    ...initial,
    adds: Array.from({ length: 30 }, (_, i) => item(`a${i}`)),
    subs: [item('s0')],
  },
  'blank values': {
    ...initial,
    company: { name: '', ceo: '', bizYear: 0 },
    period: { start: '', end: '' },
  },
}

const closingSaved = externalsFrom({
  closing: screenExports(
    buildWorkbook(closingWorkbook, initialClosing, () => {}),
    'closing',
    '결산',
  ),
})

describe('tax workbook definition', () => {
  it('builds without definition errors', () => {
    expect(checkWorkbook(taxWorkbook, samples, closingSaved)).toEqual([])
  })

  it('reads the closing screen only through its export', () => {
    // Not saved yet: a data error, not a definition error.
    expect(checkWorkbook(taxWorkbook, { initial })).toEqual([])
  })
})
