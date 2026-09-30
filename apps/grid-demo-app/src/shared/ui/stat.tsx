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
      <span className="font-sans text-xs font-bold text-app-muted">
        {label}
      </span>
      <strong
        className={`font-mono text-lg ${tone === 'error' ? 'text-app-error' : tone === 'ok' ? 'text-app-ok' : ''}`}
      >
        {typeof value === 'number' ? value.toLocaleString('ko-KR') : '-'}
      </strong>
    </div>
  )
}
