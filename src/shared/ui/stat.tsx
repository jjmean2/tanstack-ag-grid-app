// A labelled number for a screen's status bar.
export function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: unknown
  tone?: 'ok' | 'error'
}) {
  return (
    <div className="grid gap-1">
      <span className="font-sans text-xs font-bold text-[#536863]">
        {label}
      </span>
      <strong
        className={`font-mono text-lg ${tone === 'error' ? 'text-[#c0392b]' : tone === 'ok' ? 'text-[#1a7f4b]' : ''}`}
      >
        {typeof value === 'number' ? value.toLocaleString('ko-KR') : '-'}
      </strong>
    </div>
  )
}
