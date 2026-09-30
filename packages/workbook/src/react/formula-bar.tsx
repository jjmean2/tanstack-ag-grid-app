import { useState } from 'react'

import { useFormulaBar } from './use-formula-bar'
import type { FormulaBarRef } from './use-formula-bar'

export const savedAtText = (iso: string) =>
  new Date(iso).toLocaleString('ko-KR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })

// The words the formula bar shows; pass some to change them.
export const formulaBarTexts = {
  noCell: '선택한 셀 없음',
  hint: '셀을 선택하면 값의 출처와 수식이 표시됩니다.',
  input: '입력 값',
  fixed: '고정 값',
  override: (computed: string) => `수동 입력 · 수식 결과 ${computed}`,
  revert: '수식으로 되돌리기',
  blank: '(빈 값)',
  raw: '원문',
  missingCell: '(없는 셀)',
  notSaved: '저장된 값 없음',
  cells: (count: number) => `${count}개 셀`,
  saved: (value: string, at: string) => `${value} (${savedAtText(at)} 저장)`,
}

// Shows the formula of the focused cell (in any view). References are links:
// clicking one moves focus to the cell (or list) it points at, so a formula can
// be followed step by step. A reference to another screen opens that screen.
//
// One rendering of `useFormulaBar`; for another layout, draw your own from it.
export function FormulaBar({
  texts: custom,
}: {
  texts?: Partial<typeof formulaBarTexts>
}) {
  const texts = { ...formulaBarTexts, ...custom }
  const bar = useFormulaBar()
  const [showRaw, setShowRaw] = useState(false)

  const describe = (ref: FormulaBarRef) => {
    if (ref.kind === 'group') return texts.cells(ref.count ?? 0)
    if (ref.kind === 'external')
      return ref.value !== undefined && ref.savedAt
        ? texts.saved(ref.value, ref.savedAt)
        : texts.notSaved
    return ref.value ?? texts.missingCell
  }

  return (
    <div className="wb-formula-bar" data-formula-bar>
      <span className="wb-formula-bar-label" data-formula-bar-label>
        {bar.cell ? bar.label : texts.noCell}
      </span>
      <span className="wb-formula-bar-fx">fx</span>

      <div className="wb-formula-bar-content" data-formula-bar-content>
        {!bar.cell && <span className="wb-formula-bar-note">{texts.hint}</span>}
        {bar.cell &&
          bar.parts.map(({ text, ref }, i) =>
            ref ? (
              <button
                key={i}
                type="button"
                className={`wb-ref ${ref.kind === 'external' ? 'wb-ref-external' : ''}`}
                title={`${ref.fullLabel} = ${describe(ref)}`}
                data-ref-target={ref.address}
                onClick={ref.follow}
              >
                {showRaw ? text : ref.label}
                {ref.kind === 'external' && <span aria-hidden="true"> ↗</span>}
              </button>
            ) : (
              <span key={i} className="wb-formula-bar-text">
                {text}
              </span>
            ),
          )}
        {bar.cell && (bar.source === 'input' || bar.source === 'fixed') && (
          <span className="wb-formula-bar-note">{texts[bar.source]}</span>
        )}
        {bar.cell && bar.source === 'override' && (
          <span className="wb-formula-bar-override">
            <span className="wb-formula-bar-note">
              {texts.override(bar.computed || texts.blank)}
            </span>
            <button type="button" className="wb-button" onClick={bar.revert}>
              {texts.revert}
            </button>
          </span>
        )}
      </div>

      {bar.cell && (
        <span
          className={`wb-formula-bar-value ${bar.error ? 'wb-error' : ''}`}
          data-formula-bar-value
          title={bar.errorDetail}
        >
          = {bar.value || texts.blank}
        </span>
      )}

      <label className="wb-formula-bar-toggle">
        <input
          type="checkbox"
          checked={showRaw}
          onChange={(e) => setShowRaw(e.target.checked)}
        />
        {texts.raw}
      </label>
    </div>
  )
}
