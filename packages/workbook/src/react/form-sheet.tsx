import { useMemo } from 'react'
import type { CSSProperties } from 'react'

import { CellInput } from './cell-input'
import { checkBoxes } from './form-layout'
import type { Box } from './form-layout'
import { tagClass, toTags } from '../core/marks'
import { useWorkbook } from './workbook-context'

// Draws a sheet as a form: `boxes` placed on a grid of `tracks` (CSS grid
// column sizes). Text boxes are fixed labels; cell boxes show cells of the
// sheet (`row/col`) with `CellInput`, so they work with the formula bar and
// reference navigation like grid cells.
//
// Marks (styled by the app's theme; structure in styles.css): `wb-form`,
// `wb-box`, `wb-box-text` | `wb-box-cell`, `wb-box-tall` (spans rows), the
// box's tags, and the cell's own marks on the input inside a cell box.
export function FormSheet({
  sheet,
  tracks,
  boxes,
}: {
  sheet: string
  tracks: readonly string[]
  boxes: readonly Box[]
}) {
  const { wb } = useWorkbook()
  if (!wb.sheets[sheet]) throw new Error(`Unknown sheet: ${sheet}`)
  const problems = useMemo(
    () => (import.meta.env.DEV ? checkBoxes(tracks.length, boxes) : []),
    [tracks.length, boxes],
  )
  if (problems.length > 0)
    throw new Error(`Form layout of "${sheet}": ${problems[0]}`)

  return (
    <div
      className="wb-form"
      style={{ gridTemplateColumns: tracks.join(' ') }}
      data-form-sheet={sheet}
    >
      {boxes.map((box, i) => {
        const [row, col, rowSpan = 1, colSpan = 1] = box.at
        const marks = [
          'wb-box',
          'cell' in box ? 'wb-box-cell' : 'wb-box-text',
          rowSpan > 1 && 'wb-box-tall',
          ...toTags(box.tags).map(tagClass),
        ]
          .filter(Boolean)
          .join(' ')
        const place: CSSProperties = {
          gridRow: `${row} / span ${rowSpan}`,
          gridColumn: `${col} / span ${colSpan}`,
        }
        return (
          <div
            key={'cell' in box ? box.cell : `text-${i}`}
            className={marks}
            style={place}
          >
            {'cell' in box ? (
              <CellInput address={`${sheet}/${box.cell}`} variant="form" />
            ) : (
              box.text
            )}
          </div>
        )
      })}
    </div>
  )
}
