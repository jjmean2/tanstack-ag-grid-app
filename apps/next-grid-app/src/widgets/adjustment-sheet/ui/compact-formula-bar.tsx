import { useFormulaBar } from '@lab/workbook/react'
import type { FormulaBarRef } from '@lab/workbook/react'

// The theme's colour for a reference (the cells it covers share it).
const colorOf = (ref: FormulaBarRef) =>
  ref.highlight === undefined ? undefined : `var(--wb-hl-${ref.highlight})`

const SOURCE = {
  formula: '수식',
  override: '수동',
  input: '입력',
  fixed: '고정',
}

const refValue = (ref: FormulaBarRef) =>
  ref.kind === 'group' || ref.kind === 'range'
    ? `${ref.count ?? 0}개`
    : ref.missing
      ? '없음'
      : (ref.value ?? '')

// A formula bar drawn by the app from `useFormulaBar`, instead of the
// library's: the formula as written (references highlighted), and below it
// every reference with its value, as chips that follow it.
export function CompactFormulaBar() {
  const bar = useFormulaBar()
  const refs = bar.cell ? bar.parts.flatMap((p) => (p.ref ? [p.ref] : [])) : []

  return (
    <div
      className="mx-auto mb-4 grid max-w-375 gap-2 border-l-4 border-app-accent bg-app-surface px-4 py-3 font-sans text-sm"
      data-compact-formula-bar
    >
      {!bar.cell ? (
        <span className="text-app-muted">셀을 선택하세요.</span>
      ) : (
        <>
          <div className="flex items-baseline gap-3">
            <span className="rounded bg-app-accent-soft px-1.5 text-xs font-bold text-app-accent">
              {SOURCE[bar.source]}
            </span>
            <span className="font-bold">{bar.label}</span>
            <span
              className={`ml-auto font-mono font-bold ${bar.error ? 'text-app-error' : ''}`}
              title={bar.errorDetail}
            >
              {bar.value || '—'}
            </span>
          </div>
          {bar.formula && (
            <code className="font-mono text-[0.85rem]">
              {bar.parts.map(({ text, ref }, i) =>
                ref ? (
                  <mark
                    key={i}
                    className="bg-transparent font-bold text-app-accent"
                    style={{ color: colorOf(ref) }}
                    title={`${ref.fullLabel} = ${refValue(ref)}`}
                  >
                    {text}
                  </mark>
                ) : (
                  <span key={i}>{text}</span>
                ),
              )}
            </code>
          )}
          {refs.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {refs.map((ref, i) => (
                <li key={i}>
                  <button
                    type="button"
                    className="cursor-pointer border border-app-line bg-app-surface px-2 py-0.5 text-xs hover:border-app-accent"
                    onClick={ref.follow}
                    data-ref-target={ref.address}
                    style={{ borderColor: colorOf(ref), color: colorOf(ref) }}
                  >
                    {ref.label}
                    <b className="ml-2 font-mono">{refValue(ref)}</b>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
