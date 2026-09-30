import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { buildWorkbook } from '@lab/workbook'
import type { Workbook } from '@lab/workbook'
import { toAdjustmentState } from '#/entities/adjustment/model/adapter'
import { adjustmentResponse } from '#/entities/adjustment/model/data'
import { toSession } from '#/entities/tax-session/model/adapter'
import { taxSessionResponse } from '#/entities/tax-session/model/data'
import { adjustmentWorkbook } from '#/widgets/adjustment-sheet/model/adjustment-workbook'
import {
  closingWorkbook,
  initialClosing,
} from '#/widgets/closing-workbook/model/closing-workbook'
import { taxWorkbook } from '#/widgets/tax-workbook/model/tax-workbook'
import { initialVat, vatWorkbook } from '#/widgets/vat-form/model/vat-form'

// Read as text: the test runner does not process CSS. Tests run from the app's
// workspace root.
const theme = readFileSync(
  join(process.cwd(), 'src/shared/config/workbook-theme.css'),
  'utf8',
)

const noop = () => {}

// Every workbook of the app, built from a sample state. A `pass`/`fail` style
// tag depends on values, so both outcomes are listed by hand below.
const workbooks: Workbook[] = [
  buildWorkbook(taxWorkbook, toSession(taxSessionResponse), noop),
  buildWorkbook(closingWorkbook, initialClosing, noop),
  buildWorkbook(vatWorkbook, initialVat, noop),
  buildWorkbook(
    adjustmentWorkbook,
    toAdjustmentState(adjustmentResponse),
    noop,
  ),
]
const VALUE_DEPENDENT = ['pass', 'fail']

function tagsOf(wb: Workbook): Set<string> {
  const tags = new Set<string>()
  for (const sheet of Object.values(wb.sheets)) {
    for (const row of sheet?.rows ?? []) {
      row.tags.forEach((t) => tags.add(t))
      for (const cell of Object.values(row.cells))
        cell.tags.forEach((t) => tags.add(t))
    }
    for (const item of sheet?.form?.items ?? []) {
      item.tags.forEach((t) => tags.add(t))
      if (item.address) wb.cell(item.address)?.tags.forEach((t) => tags.add(t))
    }
  }
  return tags
}

describe('workbook theme', () => {
  const used = new Set([
    ...workbooks.flatMap((wb) => [...tagsOf(wb)]),
    ...VALUE_DEPENDENT,
  ])

  it.each([...used].sort())('styles the tag "%s"', (tag) => {
    expect(theme).toContain(`.wb-tag-${tag}`)
  })
})
