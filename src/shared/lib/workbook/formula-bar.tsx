import { useState } from 'react'

import { useStore } from '../store/use-store'
import { cellAddress, isGroupAddress } from './address'
import { navigate } from './navigation'
import type { Address, Cell } from './types'
import { useWorkbook } from './workbook-context'

// Shows the formula of the focused cell (in any grid). References are links:
// clicking one moves focus to the cell (or list) it points at, so a formula can
// be followed step by step.
export function FormulaBar() {
  const { wb, ui } = useWorkbook()
  const focused = useStore(ui, (s) => s.focused)
  const [showRaw, setShowRaw] = useState(false)

  const cell = focused
    ? wb.cell(cellAddress(focused.sheetId, focused.rowId, focused.colId))
    : undefined

  const describe = (address: Address) => {
    if (isGroupAddress(address)) return `${wb.cells(address).length}개 셀`
    const target = wb.cell(address)
    if (!target) return '(없는 셀)'
    return target.error ?? target.type.format(target.value)
  }

  const shown = (c: Cell) => (c.error ?? c.type.format(c.value)) || '(빈 값)'

  return (
    <div
      className="mx-auto mb-4 flex max-w-[1500px] flex-wrap items-center gap-x-4 gap-y-2 border border-[#c5d0c7] bg-[#fffdf8] px-4 py-2 font-sans text-sm"
      data-formula-bar
    >
      <span
        className="w-64 shrink-0 truncate font-bold text-[#536863]"
        data-formula-bar-label
      >
        {cell ? wb.labelOf(cell.address) : '선택한 셀 없음'}
      </span>
      <span className="font-mono text-base font-bold italic text-[#b35131]">
        fx
      </span>

      <div
        className="min-w-0 flex-1 break-words font-mono text-[0.85rem]"
        data-formula-bar-content
      >
        {!cell && (
          <span className="font-sans text-[#536863]">
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
                  className="mx-0.5 cursor-pointer rounded border border-[#1f6f66] bg-[#e4f1ee] px-1.5 py-0.5 font-sans text-xs font-bold text-[#1f6f66] hover:bg-[#cfe7e2]"
                  title={`${wb.labelOf(part.target)} = ${describe(part.target)}`}
                  data-ref-target={part.target}
                  onClick={() => navigate(ui, wb, part.target!)}
                >
                  {showRaw ? part.text : wb.labelOf(part.target, cell)}
                </button>
              ) : (
                <span key={i} className="whitespace-pre-wrap">
                  {part.text}
                </span>
              ),
            )}
          </>
        )}
        {cell && !cell.formula && (
          <span className="font-sans text-[#536863]">
            {cell.source.kind === 'value' && cell.source.write
              ? '입력 값'
              : '고정 값'}
          </span>
        )}
      </div>

      {cell && (
        <span
          className={`shrink-0 font-mono text-[0.85rem] font-bold ${cell.error ? 'text-[#c0392b]' : ''}`}
          data-formula-bar-value
          title={cell.errorDetail}
        >
          = {shown(cell)}
        </span>
      )}

      <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-[#536863]">
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
