import { useEffect, useRef, useState } from 'react'
import type { Ref } from 'react'

import { useStore } from './use-store'
import { cellAddress } from '../core/address'
import { INVALID } from '../core/cell-types'
import { cellMarks } from '../core/marks'
import { claimPending, reportFocus } from '../core/navigation'
import type { Address } from '../core/types'
import { useWorkbook } from './workbook-context'

type Focusable = HTMLInputElement | HTMLSelectElement

// One cell of the workbook as a form control: the same cell a grid would show,
// so it can be referenced by formulas, followed from the formula bar, and it
// parses, formats and reports errors the way grid cells do.
export function useCell(address: Address) {
  const { wb, ui } = useWorkbook()
  const cell = wb.cell(address)
  const ref = useRef<Focusable>(null)
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

export function CellInput({
  address,
  variant = 'field',
  className = '',
}: {
  address: Address
  variant?: keyof typeof layouts
  className?: string
}) {
  const { cell, ref, text, editable, commit, onFocus } = useCell(address)
  const { type } = cell
  // While focused the control shows the editable text; what is typed is a
  // draft, committed on Enter or blur and dropped on Escape.
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<string | null>(null)
  const [invalid, setInvalid] = useState(false)

  // Select all once the editable text has replaced the formatted one (doing
  // it in onFocus would be undone by that change of value).
  useEffect(() => {
    if (editing && ref.current instanceof HTMLInputElement) ref.current.select()
  }, [editing, ref])

  // The same marks a grid puts on this cell, plus the input's own state.
  const marks = [
    'wb-input',
    `wb-input-${variant}`,
    ...cellMarks(cell),
    invalid && 'wb-invalid',
  ]
    .filter(Boolean)
    .join(' ')
  const classes = `${layouts[variant]} ${marks} ${className}`
  const common = {
    'aria-invalid': invalid || cell.error !== undefined,
    title: cell.errorDetail,
    'data-cell': address,
    onFocus,
  }

  if (editable && type.editor === 'checkbox') {
    return (
      <input
        {...common}
        ref={ref as Ref<HTMLInputElement>}
        type="checkbox"
        className={`size-5 ${marks} ${className}`}
        checked={Boolean(cell.value)}
        onChange={(e) => commit(e.target.checked)}
      />
    )
  }

  if (editable && type.editor === 'select') {
    return (
      <select
        {...common}
        ref={ref as Ref<HTMLSelectElement>}
        className={classes}
        value={text}
        onChange={(e) => commit(e.target.value)}
      >
        {(type.options ?? []).map((option) => (
          <option key={option} value={option}>
            {option || '(선택 안 함)'}
          </option>
        ))}
      </select>
    )
  }

  // Numbers are edited without grouping separators, as in the grid editor.
  const editText =
    type.editor === 'number' && typeof cell.value === 'number'
      ? String(cell.value)
      : text

  // Returns false (and flags the control) when the draft is rejected.
  const finish = () => {
    if (draft === null) return true
    const ok = commit(draft)
    setInvalid(!ok)
    if (ok) setDraft(null)
    return ok
  }
  const reset = () => {
    setDraft(null)
    setInvalid(false)
  }

  return (
    <input
      {...common}
      ref={ref as Ref<HTMLInputElement>}
      className={classes}
      inputMode={type.editor === 'number' ? 'decimal' : undefined}
      readOnly={!editable}
      value={editing && editable ? (draft ?? editText) : text}
      onFocus={() => {
        onFocus()
        setEditing(true)
      }}
      onChange={(e) => setDraft(e.target.value)}
      // Leaving the control commits; a rejected draft is dropped.
      onBlur={() => {
        finish()
        reset()
        setEditing(false)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') finish()
        if (e.key === 'Escape') reset()
      }}
    />
  )
}
