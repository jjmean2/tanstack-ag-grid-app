import { useState } from 'react'
import type { Ref } from 'react'
import type { CustomCellRendererProps } from 'ag-grid-react'

import type { Row } from '@lab/workbook'
import { defineCellViews } from '@lab/workbook/ag-grid'
import type { InputEditor } from '@lab/workbook/react'
import { playgroundGridTheme } from '#/shared/config/ag-grid'

// How this app shows workbook cells — one value for every screen:
//   rules     which editor, display, alignment and marks each cell gets
//   editors   the components behind this app's editor ids, per view
//   displays  the components behind this app's display ids
// Looks (colours, fonts) are theme.css, which styles the marks.
//
// A rule sees a cell's facts (type id, writable, formula, error, tags, value).
// Rules apply in order, later ones win, marks add up. The library's defaults
// come first: the type's editor when the cell can be written (date → date
// picker, select → dropdown, ...), a button for actions, the type's alignment.
// A rule can make a cell read-only, never writable. An id a rule uses must be
// built in or registered below, and an editor needs both a grid and an input
// component: the types check both.

const YEARS = { min: 1900, max: 2100 }

// Input for editor 'year': a number field that rejects years out of range.
const YearInput: InputEditor = ({
  cell,
  readOnly,
  commit,
  setInvalid,
  className,
  control,
}) => {
  const { ref, ...attrs } = control
  const [draft, setDraft] = useState<string | null>(null)
  const finish = () => {
    if (draft === null) return
    const year = Number(draft)
    const ok = year >= YEARS.min && year <= YEARS.max && commit(draft)
    setInvalid(!ok)
    if (ok) setDraft(null)
  }
  return (
    <input
      {...attrs}
      ref={ref as Ref<HTMLInputElement>}
      type="number"
      step={1}
      min={YEARS.min}
      max={YEARS.max}
      readOnly={readOnly}
      className={className}
      value={draft ?? (typeof cell.value === 'number' ? cell.value : '')}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        finish()
        setDraft(null)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') finish()
        if (e.key === 'Escape') {
          setDraft(null)
          setInvalid(false)
        }
      }}
    />
  )
}

// Grid display 'status': a check's verdict as a badge. Its colour follows the
// cell's tags (wb-tag-pass / wb-tag-fail) in theme.css.
function StatusCell({ valueFormatted, value }: CustomCellRendererProps<Row>) {
  return (
    <span className="wb-status">{valueFormatted ?? String(value ?? '')}</span>
  )
}

export const cellViews = defineCellViews({
  gridTheme: playgroundGridTheme,
  editors: {
    // Grid: AG Grid's number editor, whole numbers in range (AG Grid 36:
    // agNumberCellEditor with min / max / precision).
    year: {
      grid: {
        component: 'agNumberCellEditor',
        params: () => ({ ...YEARS, precision: 0, step: 1 }),
      },
      input: YearInput,
    },
  },
  displays: {
    status: { grid: StatusCell },
  },
  rules: [
    // Negative amounts get a mark (red in the theme): a condition on the
    // value, which CSS cannot express. The money type shows them in
    // parentheses.
    {
      when: (f) =>
        f.type === 'money' && typeof f.value === 'number' && f.value < 0,
      then: { marks: ['wb-negative'] },
    },
    // Years: centred, edited as a whole number in range.
    {
      when: (f) => f.type === 'year',
      then: { align: 'center', editor: 'year' },
    },
    // A check's verdict in words shows as a badge.
    {
      when: (f) =>
        f.type === 'text' &&
        (f.tags.includes('pass') || f.tags.includes('fail')),
      then: { display: 'status' },
    },
  ],
})
