import { useMemo, useRef } from 'react'

import type { Cell, Row } from '../core/types'

// Every build makes new row objects, even for rows that did not change. AG
// Grid compares row data by identity (with `getRowId`) and updates every row
// node whose object changed: for thousands of rows that costs far more than
// the build. So the grid gets the previous object of each row whose content
// is the same, and AG Grid touches only the rows that changed.
//
// A reused row keeps the previous build's cells, whose `write`, `revert` and
// actions were made from the previous state. That is safe because they change
// the state through `update((s) => …)`, from the state at the time they run.

const sameList = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((x, i) => x === b[i])

// Everything a grid cell shows or does, as far as it can differ between builds.
function sameCell(a: Cell, b: Cell): boolean {
  return (
    Object.is(a.value, b.value) &&
    a.type === b.type &&
    a.error === b.error &&
    a.errorDetail === b.errorDetail &&
    a.source.kind === b.source.kind &&
    a.formula?.text === b.formula?.text &&
    (a.write === undefined) === (b.write === undefined) &&
    a.override?.active === b.override?.active &&
    Object.is(a.override?.computed?.value, b.override?.computed?.value) &&
    a.override?.computed?.error === b.override?.computed?.error &&
    a.action?.label === b.action?.label &&
    a.span === b.span &&
    a.rowSpan === b.rowSpan &&
    sameList(a.tags, b.tags) &&
    sameList(a.rowTags, b.rowTags)
  )
}

export function sameRow(a: Row, b: Row): boolean {
  if (
    a.id !== b.id ||
    a.label !== b.label ||
    a.group !== b.group ||
    !sameList(a.tags, b.tags) ||
    a.fullWidth?.kind !== b.fullWidth?.kind
  )
    return false
  if (a.fullWidth && b.fullWidth) {
    const text = (f: NonNullable<Row['fullWidth']>) =>
      f.kind === 'title' ? f.text : f.label
    if (text(a.fullWidth) !== text(b.fullWidth)) return false
  }
  const cols = Object.keys(b.cells)
  if (cols.length !== Object.keys(a.cells).length) return false
  return cols.every(
    (col) => col in a.cells && sameCell(a.cells[col], b.cells[col]),
  )
}

// `rows` with the previous object of every row that did not change.
export function stableRows(
  rows: readonly Row[],
  previous: ReadonlyMap<string, Row>,
): Row[] {
  return rows.map((row) => {
    const old = previous.get(row.id)
    return old && sameRow(old, row) ? old : row
  })
}

export function useStableRows(rows: Row[] | undefined): Row[] | undefined {
  const previous = useRef<ReadonlyMap<string, Row>>(new Map())
  return useMemo(() => {
    if (!rows) return rows
    const next = stableRows(rows, previous.current)
    previous.current = new Map(next.map((row) => [row.id, row]))
    return next
  }, [rows])
}
