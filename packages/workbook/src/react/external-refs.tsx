import { savedAtText } from './formula-bar'
import { useWorkbook } from './workbook-context'

// Lists the values this screen reads from other screens, with when they were
// saved there, and links to open the cell they come from.
export function ExternalRefs() {
  const { wb, openScreen } = useWorkbook()
  if (wb.externalRefs.length === 0) return null

  return (
    <div
      className="mx-auto mb-4 grid max-w-375 gap-2 border border-[#e2b9a4] bg-[#fbf1ea] px-4 py-3 font-sans text-sm"
      data-external-refs
    >
      <span className="text-xs font-bold uppercase tracking-[0.05em] text-[#b35131]">
        다른 화면에서 가져온 값
      </span>
      <ul className="grid gap-1.5">
        {wb.externalRefs.map((ref) => (
          <li key={ref.address} className="flex flex-wrap items-center gap-x-3">
            <button
              type="button"
              className="cursor-pointer font-bold text-[#b35131] underline decoration-dotted underline-offset-4 hover:decoration-solid"
              onClick={() => openScreen?.(ref.screen, ref.value?.address)}
            >
              {wb.labelOf(ref.address)} ↗
            </button>
            {ref.value ? (
              <>
                <span
                  className={`font-mono font-bold ${ref.value.error ? 'text-[#c0392b]' : ''}`}
                >
                  {ref.value.text}
                </span>
                <span className="text-xs text-[#536863]">
                  {savedAtText(ref.value.savedAt)} 저장
                </span>
              </>
            ) : (
              <span className="text-xs font-bold text-[#c0392b]">
                저장된 값이 없습니다. 해당 화면을 열어 저장하세요.
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
