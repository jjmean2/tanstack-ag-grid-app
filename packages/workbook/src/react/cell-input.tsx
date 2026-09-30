import { useEffect, useRef, useState } from 'react'

import { useStore } from './use-store'
import { cellAddress } from '../core/address'
import { INVALID } from '../core/cell-types'
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
  const write = cell.source.kind === 'value' ? cell.source.write : undefined

  return {
    cell,
    ref,
    text: cell.error ?? cell.type.format(cell.value),
    editable: write !== undefined,
    // Parses like a grid editor; false when the input is rejected.
    commit: (input: unknown) => {
      const value = cell.type.parse(input)
      if (!write || value === INVALID) return false
      write(value)
      return true
    },
    onFocus: () =>
      reportFocus(ui, {
        sheetId: cell.sheetId,
        rowId: cell.rowId,
        colId: cell.colId,
      }),
  }
}

// Layout only; colours and states come from the app's theme through the marks
// (`wb-input`, `wb-input-<variant>`, the cell's marks, `wb-invalid`).
// `field`: a standalone form field. `form`: fills a box of a form sheet, whose
// borders the form draws.
const layouts = {
  field: 'w-full border px-3 py-2 font-sans text-base font-normal outline-none',
  form: 'block min-h-8 w-full self-stretch bg-transparent px-2 py-1 font-sans text-sm outline-none',
}

// One cell as a form control. The presentation chooses the editor id, the
// input editor registry (`WorkbookProvider`'s `inputEditors` over the
// defaults) turns it into a component; read-only cells use `text`.
export function CellInput({
  address,
  variant = 'field',
  className = '',
}: {
  address: Address
  variant?: keyof typeof layouts
  className?: string
}) {
  const { present, inputEditors } = useWorkbook()
  const { cell, ref, text, commit, onFocus } = useCell(address)
  const [invalid, setInvalid] = useState(false)
  const { editor, marks: cellMarks } = present(cell)

  const marks = [
    'wb-input',
    `wb-input-${variant}`,
    ...cellMarks,
    invalid && 'wb-invalid',
  ]
    .filter(Boolean)
    .join(' ')
  const Editor =
    (editor === null ? undefined : inputEditors[editor]) ?? inputEditors.text

  return (
    <Editor
      cell={cell}
      text={text}
      readOnly={editor === null}
      commit={commit}
      setInvalid={setInvalid}
      marks={`${marks} ${className}`}
      className={`${layouts[variant]} ${marks} ${className}`}
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
