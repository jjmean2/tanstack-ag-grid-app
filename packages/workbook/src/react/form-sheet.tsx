import type { CSSProperties } from 'react'

import { CellInput } from './cell-input'
import type { FormView, Look } from '../core/types'
import { useWorkbook } from './workbook-context'

// Box styles by look. Borders: each box draws its right and bottom edge, the
// form its top and left, so shared edges are drawn once.
const looks: Record<Look | 'text', string> = {
  text: 'px-2 text-sm',
  title: 'bg-[#dfe9e2] px-3 text-sm font-bold',
  head: 'justify-center bg-[#eef3ed] px-2 text-center text-sm font-bold',
  label: 'px-2 text-sm',
  num: 'justify-center px-1 font-mono text-xs text-[#536863]',
  shade:
    'bg-[repeating-linear-gradient(135deg,#eceee9_0,#eceee9_4px,#e2e5df_4px,#e2e5df_8px)]',
  strong: 'bg-[#f1f5f1] px-2 text-sm font-bold',
}

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
export function FormSheet({ sheetId }: { sheetId: string }) {
  const { wb } = useWorkbook()
  const form = wb.sheets[sheetId]?.form
  if (!form) throw new Error(`Not a form sheet: ${sheetId}`)

  return (
    <div
      className="grid border-t border-l border-[#9aaba0] bg-white font-sans text-[#17312d]"
      style={{ gridTemplateColumns: form.tracks.join(' ') }}
      data-form-sheet={sheetId}
    >
      {form.items.map((item, i) => {
        const [, , rowSpan = 1] = item.at
        const look = looks[item.look ?? 'text']
        // A label down several rows (a section name) reads best centred.
        const centre = rowSpan > 1 ? 'justify-center text-center' : ''
        return (
          <div
            key={item.address ?? `text-${i}`}
            className={`flex min-h-8 items-center border-r border-b break-keep border-[#9aaba0] ${item.address ? `p-0 ${item.look === 'strong' ? 'bg-[#f1f5f1] font-bold' : ''}` : `${look} ${centre}`}`}
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
