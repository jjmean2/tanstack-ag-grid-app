import { useEffect, useState } from 'react'
import type { ComponentType, Ref, RefObject } from 'react'

import type { Cell } from '../core/types'

// What `CellInput` hands the component registered for an editor id. The
// component draws one control; `CellInput` has already chosen it (from the
// presentation), wired the cell, and computed the classes.
export type InputEditorProps = {
  cell: Cell
  text: string // the value as the cell shows it (formatted, or its error)
  readOnly: boolean // no editor: the cell is shown, focusable, not editable
  // Parses like a grid editor and writes the cell; false when rejected.
  commit: (input: unknown) => boolean
  setInvalid: (invalid: boolean) => void // shows `wb-invalid`
  marks: string // the cell's marks and the input's state, as classes
  className: string // layout + marks: put it on the control
  // Spread on the focusable element: focus reporting (formula bar), reference
  // navigation (`ref`), and accessibility.
  control: {
    ref: RefObject<HTMLElement | null>
    onFocus: () => void
    'data-cell': string
    'aria-invalid': boolean
    title?: string
  }
}

export type InputEditor = ComponentType<InputEditorProps>

// Typed text: the control shows the editable text while focused; what is typed
// is a draft, committed on Enter or blur and dropped on Escape.
function typedInput(numeric: boolean): InputEditor {
  return function TypedInput({
    cell,
    text,
    readOnly,
    commit,
    setInvalid,
    className,
    control,
  }: InputEditorProps) {
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState<string | null>(null)
    const { ref, onFocus, ...attrs } = control

    // Select all once the editable text has replaced the formatted one (doing
    // it in onFocus would be undone by that change of value).
    useEffect(() => {
      if (editing && ref.current instanceof HTMLInputElement)
        ref.current.select()
    }, [editing, ref])

    // Numbers are edited without grouping separators, as in the grid editor.
    const editText =
      numeric && typeof cell.value === 'number' ? String(cell.value) : text

    const finish = () => {
      if (draft === null) return
      const ok = commit(draft)
      setInvalid(!ok)
      if (ok) setDraft(null)
    }
    const reset = () => {
      setDraft(null)
      setInvalid(false)
    }

    return (
      <input
        {...attrs}
        ref={ref as Ref<HTMLInputElement>}
        className={className}
        inputMode={numeric ? 'decimal' : undefined}
        readOnly={readOnly}
        value={editing && !readOnly ? (draft ?? editText) : text}
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
}

function SelectInput({
  cell,
  text,
  commit,
  className,
  control,
}: InputEditorProps) {
  const { ref, ...attrs } = control
  return (
    <select
      {...attrs}
      ref={ref as Ref<HTMLSelectElement>}
      className={className}
      value={text}
      onChange={(e) => commit(e.target.value)}
    >
      {(cell.type.options ?? []).map((option) => (
        <option key={option} value={option}>
          {option || '(선택 안 함)'}
        </option>
      ))}
    </select>
  )
}

function CheckboxInput({ cell, commit, marks, control }: InputEditorProps) {
  const { ref, ...attrs } = control
  return (
    <input
      {...attrs}
      ref={ref as Ref<HTMLInputElement>}
      type="checkbox"
      className={`size-5 ${marks}`}
      checked={Boolean(cell.value)}
      onChange={(e) => commit(e.target.checked)}
    />
  )
}

// The browser's date picker; it hands over 'YYYY-MM-DD', which the type
// parses like typed text.
function DateInput({
  cell,
  commit,
  setInvalid,
  className,
  control,
}: InputEditorProps) {
  const { ref, ...attrs } = control
  return (
    <input
      {...attrs}
      ref={ref as Ref<HTMLInputElement>}
      type="date"
      className={className}
      value={typeof cell.value === 'string' ? cell.value : ''}
      onChange={(e) => setInvalid(!commit(e.target.value))}
    />
  )
}

// The built-in ids. `text` also shows read-only cells and any id without a
// component.
export const defaultInputEditors: Record<string, InputEditor> = {
  text: typedInput(false),
  number: typedInput(true),
  select: SelectInput,
  checkbox: CheckboxInput,
  date: DateInput,
}
