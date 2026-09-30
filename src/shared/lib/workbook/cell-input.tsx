import { useEffect, useRef, useState } from 'react'
import type { Ref } from 'react'

import { useStore } from '../store/use-store'
import { cellAddress } from './address'
import { INVALID } from './cell-types'
import { claimPending, reportFocus } from './navigation'
import type { Address } from './types'
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

// `field`: a standalone form field. `form`: fills a box of a form sheet, whose
// borders the form draws.
const looks = {
  field: {
    base: 'w-full border bg-white px-3 py-2 font-sans text-base font-normal text-[#17312d] outline-none focus:border-[#1f6f66] focus:ring-2 focus:ring-[#1f6f66]/20',
    ok: 'border-[#c5d0c7]',
    error: 'border-[#c0392b] text-[#c0392b]',
    invalid: 'border-[#c0392b] bg-[#fbeeec]',
    readOnly: 'cursor-default bg-[#f4f1e9] italic text-[#536863]',
  },
  form: {
    base: 'block min-h-8 w-full self-stretch bg-transparent px-2 py-1 font-sans text-sm text-[#17312d] outline-none focus:bg-[#eef6f3] focus:ring-2 focus:ring-inset focus:ring-[#1f6f66]',
    ok: '',
    error: 'font-bold text-[#c0392b]',
    invalid: 'bg-[#fbeeec]',
    readOnly: 'cursor-default bg-[#f3f6f2]',
  },
}

export function CellInput({
  address,
  variant = 'field',
  className = '',
}: {
  address: Address
  variant?: keyof typeof looks
  className?: string
}) {
  const look = looks[variant]
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

  const state = cell.error ? look.error : invalid ? look.invalid : look.ok
  const readOnly = editable ? '' : look.readOnly
  const classes = `${look.base} ${state} ${readOnly} ${type.align === 'right' ? 'text-right' : ''} ${className}`
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
        className="size-5 accent-[#1f6f66]"
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
