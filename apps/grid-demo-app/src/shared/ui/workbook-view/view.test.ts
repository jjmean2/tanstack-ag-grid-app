import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { buildWorkbook } from '@lab/workbook'
import type { Cell, Workbook } from '@lab/workbook'
import type { Box } from '@lab/workbook/react'
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
import { infoLayout, returnLayout } from '#/widgets/vat-form/ui/return-layout'
import { cellViews } from './cell-views'

// Every tag and rule mark in use needs a look in theme.css. (That every editor
// and display id has its components, the types of `defineCellViews` check.)

// Read as text: the test runner does not process CSS. Tests run from the app's
// workspace root.
const theme = readFileSync(
  join(process.cwd(), 'src/shared/ui/workbook-view/theme.css'),
  'utf8',
)

// Every workbook of the app, built from a sample state, and every form layout.
// A `pass`/`fail` tag depends on values, so both outcomes are listed by hand.
const workbooks: Workbook[] = [
  buildWorkbook(taxWorkbook, toSession(taxSessionResponse)),
  buildWorkbook(closingWorkbook, initialClosing),
  buildWorkbook(vatWorkbook, initialVat),
  buildWorkbook(adjustmentWorkbook, toAdjustmentState(adjustmentResponse)),
]
const boxes: Box[] = [...infoLayout.boxes, ...returnLayout.boxes]
const VALUE_DEPENDENT_TAGS = ['pass', 'fail']
const VALUE_DEPENDENT_MARKS = ['wb-negative']

const cellsOf = (wb: Workbook): Cell[] =>
  Object.values(wb.sheets).flatMap((sheet) =>
    (sheet?.rows ?? []).flatMap((row) => Object.values(row.cells)),
  )

function tagsOf(wb: Workbook): string[] {
  const rows = Object.values(wb.sheets).flatMap((sheet) => sheet?.rows ?? [])
  return [
    ...rows.flatMap((row) => row.tags),
    ...cellsOf(wb).flatMap((cell) => cell.tags),
  ]
}

const boxTags = (box: Box): string[] =>
  box.tags === undefined
    ? []
    : typeof box.tags === 'string'
      ? [box.tags]
      : [...box.tags]

// Marks the library puts on every cell (styled or not, as the theme likes).
const BUILT_IN = /^wb-(cell|type-|source-|editable|error|action|align-|tag-)/

// Marks this app's presentation rules add.
const ruleMarksOf = (wb: Workbook): string[] =>
  cellsOf(wb)
    .flatMap((cell) => cellViews.present(cell).marks)
    .filter((mark) => !BUILT_IN.test(mark))

describe('workbook view: theme', () => {
  const tags = new Set([
    ...workbooks.flatMap(tagsOf),
    ...boxes.flatMap(boxTags),
    ...VALUE_DEPENDENT_TAGS,
  ])
  const marks = new Set([
    ...workbooks.flatMap(ruleMarksOf),
    ...VALUE_DEPENDENT_MARKS,
  ])

  it.each([...tags].sort())('styles the tag "%s"', (tag) => {
    expect(theme).toContain(`.wb-tag-${tag}`)
  })

  it.each([...marks].sort())('styles the rule mark "%s"', (mark) => {
    expect(theme).toContain(`.${mark}`)
  })
})
