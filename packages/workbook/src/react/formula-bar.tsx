import { useState } from 'react'

import { useStore } from './use-store'
import {
  cellAddress,
  isExternalAddress,
  isGroupAddress,
  splitExternal,
} from '../core/address'
import { navigate } from '../core/navigation'
import type { Address, Cell } from '../core/types'
import { useWorkbook } from './workbook-context'

export const savedAtText = (iso: string) =>
  new Date(iso).toLocaleString('ko-KR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })

// Shows the formula of the focused cell (in any grid). References are links:
// clicking one moves focus to the cell (or list) it points at, so a formula can
// be followed step by step. A reference to another screen opens that screen.
export function FormulaBar() {
  const { wb, ui, openScreen } = useWorkbook()
  const focused = useStore(ui, (s) => s.focused)
  const [showRaw, setShowRaw] = useState(false)

  const cell = focused
    ? wb.cell(cellAddress(focused.sheetId, focused.rowId, focused.colId))
    : undefined

  const follow = (address: Address) => {
    if (!isExternalAddress(address)) return navigate(ui, wb, address)
    const ext = wb.external(address)
    openScreen?.(splitExternal(address).screen, ext?.address)
  }

  const describe = (address: Address) => {
    if (isExternalAddress(address)) {
      const ext = wb.external(address)
      return ext
        ? `${ext.text} (${savedAtText(ext.savedAt)} 저장)`
        : '저장된 값 없음'
    }
    if (isGroupAddress(address)) return `${wb.cells(address).length}개 셀`
    const target = wb.cell(address)
    if (!target) return '(없는 셀)'
    return target.error ?? target.type.format(target.value)
  }

  const shown = (c: Cell) => (c.error ?? c.type.format(c.value)) || '(빈 값)'

  return (
    <div className="wb-formula-bar" data-formula-bar>
      <span className="wb-formula-bar-label" data-formula-bar-label>
        {cell ? wb.labelOf(cell.address) : '선택한 셀 없음'}
      </span>
      <span className="wb-formula-bar-fx">fx</span>

      <div className="wb-formula-bar-content" data-formula-bar-content>
        {!cell && (
          <span className="wb-formula-bar-note">
            셀을 선택하면 값의 출처와 수식이 표시됩니다.
          </span>
        )}
        {cell?.formula && (
          <>
            {cell.formula.parts.map((part, i) =>
              part.target ? (
                <button
                  key={i}
                  type="button"
                  className={`wb-ref ${isExternalAddress(part.target) ? 'wb-ref-external' : ''}`}
                  title={`${wb.labelOf(part.target)} = ${describe(part.target)}`}
                  data-ref-target={part.target}
                  onClick={() => follow(part.target!)}
                >
                  {showRaw ? part.text : wb.labelOf(part.target, cell)}
                  {isExternalAddress(part.target) && (
                    <span aria-hidden="true"> ↗</span>
                  )}
                </button>
              ) : (
                <span key={i} className="wb-formula-bar-text">
                  {part.text}
                </span>
              ),
            )}
          </>
        )}
        {cell && !cell.formula && (
          <span className="wb-formula-bar-note">
            {cell.source.kind === 'value' && cell.source.write
              ? '입력 값'
              : '고정 값'}
          </span>
        )}
      </div>

      {cell && (
        <span
          className={`wb-formula-bar-value ${cell.error ? 'wb-error' : ''}`}
          data-formula-bar-value
          title={cell.errorDetail}
        >
          = {shown(cell)}
        </span>
      )}

      <label className="wb-formula-bar-toggle">
        <input
          type="checkbox"
          checked={showRaw}
          onChange={(e) => setShowRaw(e.target.checked)}
        />
        원문
      </label>
    </div>
  )
}
