import { useEffect, useRef, useState } from 'react'

import { useStore } from './use-store'
import { cellAddress } from '../core/address'
import { commitInput } from '../core/edit'
import { claimPending, reportFocus } from '../core/navigation'
import type { Address } from '../core/types'
import { useWorkbook } from './workbook-context'

// One cell of the workbook as a form control: the same cell a grid would show,
// so it can be referenced by formulas, followed from the formula bar, and it
// parses, formats and reports errors the way grid cells do.
export function useCell(address: Address) {
  const { wb, ui } = useWorkbook()
  const cell = wb.cell(address)
  const ref = useRef<HTMLElement>(null)
  const pending = useStore(ui, (s) => s.pending)

  // Consume a navigation request aimed at this cell. Runs on mount too, so a
  // request that switched to this tab is handled once the control exists.
  useEffect(() => {
    const first = pending?.targets[0]
    if (!pending || !first) return
    if (cellAddress(first.sheetId, first.rowId, first.colId) !== address) return
    if (!claimPending(ui, pending.nonce)) return
    ref.current?.focus()
  }, [pending, address, ui])

  if (!cell) throw new Error(`Unknown cell: ${address}`)

  return {
    cell,
    ref,
    text: cell.error ?? cell.type.format(cell.value),
    editable: cell.write !== undefined,
    // Parses like a grid editor; false when the input is rejected. Blank goes
    // back to the formula on an overridable formula cell.
    commit: (input: unknown) => commitInput(cell, input),
    onFocus: () =>
      reportFocus(ui, {
        sheetId: cell.sheetId,
        rowId: cell.rowId,
        colId: cell.colId,
      }),
  }
}

// One cell as a form control. The presentation chooses the editor id; the
// views' input components (`CellViews.input`) turn it into a component;
// read-only cells use `text`. Its marks (`wb-input`, `wb-input-<variant>`,
// the cell's marks, `wb-invalid`) carry layout (styles.css) and looks (theme).
export function CellInput({
  address,
  variant = 'field',
  className = '',
}: {
  address: Address
  // `field`: a standalone form field. `form`: fills a box of a form sheet.
  variant?: 'field' | 'form'
  className?: string
}) {
  const { views } = useWorkbook()
  const { cell, ref, text, commit, onFocus } = useCell(address)
  const [invalid, setInvalid] = useState(false)
  const { editor, marks: cellMarks } = views.present(cell)

  const marks = [
    'wb-input',
    `wb-input-${variant}`,
    ...cellMarks,
    invalid && 'wb-invalid',
  ]
    .filter(Boolean)
    .join(' ')
  const Editor =
    (editor === null ? undefined : views.input[editor]) ?? views.input.text

  return (
    <Editor
      cell={cell}
      text={text}
      readOnly={editor === null}
      commit={commit}
      setInvalid={setInvalid}
      className={`${marks} ${className}`}
      control={{
        ref,
        onFocus,
        'data-cell': address,
        'aria-invalid': invalid || cell.error !== undefined,
        title: cell.errorDetail,
      }}
    />
  )
}
