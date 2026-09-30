import type { CSSProperties } from 'react'

import { CellInput } from './cell-input'
import { tagClass } from '../core/marks'
import type { FormView } from '../core/types'
import { useWorkbook } from './workbook-context'

const placeOf = ([
  row,
  col,
  rowSpan = 1,
  colSpan = 1,
]: FormView['items'][0]['at']) =>
  ({
    gridRow: `${row} / span ${rowSpan}`,
    gridColumn: `${col} / span ${colSpan}`,
  }) satisfies CSSProperties

// Draws a form sheet: boxes on a CSS grid, as on a paper form. Text boxes are
// fixed labels; cell boxes are workbook cells (editable, formula or fixed), so
// they work with the formula bar and reference navigation like grid cells.
//
// Only the structure is styled here (placement, edges: each box draws its right
// and bottom edge, the form its top and left). Everything else comes from the
// app's theme through the marks: `wb-form`, `wb-box`, `wb-box-text` or
// `wb-box-cell`, `wb-box-tall`, the box's tags (`wb-tag-head`, ...), and the
// cell's own marks on the input inside a cell box.
export function FormSheet({ sheetId }: { sheetId: string }) {
  const { wb } = useWorkbook()
  const form = wb.sheets[sheetId]?.form
  if (!form) throw new Error(`Not a form sheet: ${sheetId}`)

  return (
    <div
      className="wb-form grid border-t border-l"
      style={{ gridTemplateColumns: form.tracks.join(' ') }}
      data-form-sheet={sheetId}
    >
      {form.items.map((item, i) => {
        const [, , rowSpan = 1] = item.at
        const marks = [
          'wb-box',
          item.address ? 'wb-box-cell' : 'wb-box-text',
          // A label down several rows (a section name) reads best centred.
          rowSpan > 1 && 'wb-box-tall',
          ...item.tags.map(tagClass),
        ]
          .filter(Boolean)
          .join(' ')
        return (
          <div
            key={item.address ?? `text-${i}`}
            className={`flex min-h-8 items-center border-r border-b break-keep ${marks}`}
            style={placeOf(item.at)}
          >
            {item.address ? (
              <CellInput address={item.address} variant="form" />
            ) : (
              item.text
            )}
          </div>
        )
      })}
    </div>
  )
}
