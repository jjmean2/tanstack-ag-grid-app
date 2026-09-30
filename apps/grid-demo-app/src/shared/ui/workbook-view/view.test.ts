import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { buildWorkbook } from '@lab/workbook'
import type { Cell, Workbook } from '@lab/workbook'
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
import { defaultGridDisplays, defaultGridEditors } from '@lab/workbook/ag-grid'
import { defaultInputEditors } from '@lab/workbook/react'
import { gridDisplays, gridEditors, inputEditors } from './components'
import { presentation } from './presentation'

// Read as text: the test runner does not process CSS. Tests run from the app's
// workspace root.
const theme = readFileSync(
  join(process.cwd(), 'src/shared/ui/workbook-view/theme.css'),
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
const VALUE_DEPENDENT_TAGS = ['pass', 'fail']
const VALUE_DEPENDENT_MARKS = ['wb-negative']

function cellsOf(wb: Workbook): Cell[] {
  return Object.values(wb.sheets).flatMap((sheet) => [
    ...(sheet?.rows ?? []).flatMap((row) => Object.values(row.cells)),
    ...(sheet?.form?.items ?? []).flatMap((item) =>
      item.address ? [wb.cell(item.address)!] : [],
    ),
  ])
}

function tagsOf(wb: Workbook): Set<string> {
  const tags = new Set<string>()
  for (const sheet of Object.values(wb.sheets)) {
    for (const row of sheet?.rows ?? []) row.tags.forEach((t) => tags.add(t))
    for (const item of sheet?.form?.items ?? [])
      item.tags.forEach((t) => tags.add(t))
  }
  for (const cell of cellsOf(wb)) cell.tags.forEach((t) => tags.add(t))
  return tags
}

// Marks the library puts on every cell (styled or not, as the theme likes).
const BUILT_IN = /^wb-(cell|type-|source-|editable|error|action|align-|tag-)/

// Marks this app's presentation rules add.
function ruleMarksOf(wb: Workbook): Set<string> {
  return new Set(
    cellsOf(wb)
      .flatMap((cell) => presentation(cell).marks)
      .filter((mark) => !BUILT_IN.test(mark)),
  )
}

describe('workbook view: theme', () => {
  const tags = new Set([
    ...workbooks.flatMap((wb) => [...tagsOf(wb)]),
    ...VALUE_DEPENDENT_TAGS,
  ])
  const marks = new Set([
    ...workbooks.flatMap((wb) => [...ruleMarksOf(wb)]),
    ...VALUE_DEPENDENT_MARKS,
  ])

  it.each([...tags].sort())('styles the tag "%s"', (tag) => {
    expect(theme).toContain(`.wb-tag-${tag}`)
  })

  it.each([...marks].sort())('styles the rule mark "%s"', (mark) => {
    expect(theme).toContain(`.${mark}`)
  })
})

// The ids presentation rules choose must have a component in each view: a
// missing one would silently fall back to the text editor or plain text.
describe('workbook view: components', () => {
  const presented = workbooks.flatMap((wb) => cellsOf(wb).map(presentation))
  const editors = new Set(
    presented.flatMap((p) => (p.editor === null ? [] : [p.editor])),
  )
  const displays = new Set(
    presented.map((p) => p.display).filter((d) => d !== 'text'),
  )
  const grid = { ...defaultGridEditors, ...gridEditors }
  const input = { ...defaultInputEditors, ...inputEditors }
  const gridShows = { ...defaultGridDisplays, ...gridDisplays }

  it.each([...editors].sort())('edits "%s" in a grid and in an input', (id) => {
    expect(Object.keys(grid)).toContain(id)
    expect(Object.keys(input)).toContain(id)
  })

  it.each([...displays].sort())('shows "%s" in a grid', (id) => {
    expect(Object.keys(gridShows)).toContain(id)
  })
})
