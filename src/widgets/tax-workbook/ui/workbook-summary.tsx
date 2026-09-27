import { useWorkbook } from '#/shared/lib/workbook/workbook-context'

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
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
        {value}
      </strong>
    </div>
  )
}

const won = (value: unknown) =>
  typeof value === 'number' ? value.toLocaleString('ko-KR') : '-'

// Always visible: it reads cells of the workbook by address, so the numbers
// are the same ones the sheets show, defined once as formulas.
export function WorkbookSummary({
  dirty,
  onReset,
}: {
  dirty: boolean
  onReset: () => void
}) {
  const { wb } = useWorkbook()
  const gap = wb.value('adj/gap/tax')

  return (
    <div className="mx-auto mb-4 flex max-w-[1500px] flex-wrap items-end gap-x-10 gap-y-4 border border-[#c5d0c7] bg-[#fffdf8] px-6 py-4">
      <Stat label="과세표준" value={won(wb.value('adj/total/tax'))} />
      <Stat
        label="신고서상 금액과의 차이"
        value={won(gap)}
        tone={gap === 0 ? 'ok' : 'error'}
      />
      <Stat label="결정세액" value={won(wb.value('calc/decided/value'))} />
      <Stat label="총부담세액" value={won(wb.value('calc/burden/value'))} />
      <div className="ml-auto flex items-center gap-4 font-sans text-sm">
        {wb.errors.length > 0 && (
          <span className="bg-[#f6d8d4] px-2 py-1 text-xs font-bold text-[#c0392b]">
            수식 오류 {wb.errors.length}
          </span>
        )}
        <span
          className={`px-2 py-1 text-xs font-bold ${dirty ? 'bg-[#f6e2d8] text-[#b35131]' : 'bg-[#e6eee8] text-[#536863]'}`}
        >
          {dirty ? '변경됨' : '변경 없음'}
        </span>
        <button
          type="button"
          className="cursor-pointer border border-[#9aaba0] bg-white px-3 py-1.5 font-bold hover:bg-[#eef3ed]"
          onClick={onReset}
        >
          서버 값으로 초기화
        </button>
      </div>
    </div>
  )
}
