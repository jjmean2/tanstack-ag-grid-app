import { buildWorkbook } from '@lab/workbook'
import { checkBoxes } from '@lab/workbook/react'
import { initialVat, vatWorkbook } from '../model/vat-form'
import { infoLayout, returnLayout } from './return-layout'

const wb = buildWorkbook(vatWorkbook, initialVat)

describe.each([
  ['info', infoLayout],
  ['ret', returnLayout],
])('layout of %s', (sheet, layout) => {
  it('has no overlapping boxes', () => {
    expect(checkBoxes(layout.tracks.length, layout.boxes)).toEqual([])
  })

  it('places only cells the sheet has', () => {
    const missing = layout.boxes
      .flatMap((b) => ('cell' in b ? [`${sheet}/${b.cell}`] : []))
      .filter((address) => !wb.cell(address))
    expect(missing).toEqual([])
  })
})
