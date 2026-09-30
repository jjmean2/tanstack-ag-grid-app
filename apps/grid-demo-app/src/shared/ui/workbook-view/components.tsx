import { useState } from 'react'
import type { Ref } from 'react'
import type { CustomCellRendererProps } from 'ag-grid-react'

import type { ResolvedRow } from '@lab/workbook'
import type { GridDisplay, GridEditor } from '@lab/workbook/ag-grid'
import type { InputEditor } from '@lab/workbook/react'

// The components behind this app's editor and display ids — the ones
// presentation.ts uses beyond the library's (text, number, select, checkbox,
// date; display: button). An id needs a component in every view that can show
// the cell: a grid entry and an input entry (view.test.ts checks it).

const YEARS = { min: 1900, max: 2100 }

// --- editor 'year' --------------------------------------------------------

// Grid: AG Grid's number editor, whole numbers in range (AG Grid 36:
// agNumberCellEditor with min / max / precision).
const gridYear: GridEditor = {
  component: 'agNumberCellEditor',
  params: () => ({ ...YEARS, precision: 0, step: 1 }),
}

// Input: a number field that rejects years out of range.
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

// --- display 'status' -----------------------------------------------------

// Grid: a check's result as a badge. Its colour comes from the cell's tags
// (wb-tag-pass / wb-tag-fail) in theme.css.
function StatusCell({
  valueFormatted,
  value,
}: CustomCellRendererProps<ResolvedRow>) {
  return (
    <span className="wb-status">{valueFormatted ?? String(value ?? '')}</span>
  )
}

// --- registries -------------------------------------------------------------

export const gridEditors: Record<string, GridEditor> = { year: gridYear }
export const gridDisplays: Record<string, GridDisplay> = { status: StatusCell }
export const inputEditors: Record<string, InputEditor> = { year: YearInput }
