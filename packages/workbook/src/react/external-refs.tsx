import { savedAtText } from './formula-bar'
import { useWorkbook } from './workbook-context'

// Lists the values this screen reads from other screens, with when they were
// saved there, and links to open the cell they come from.
export function ExternalRefs() {
  const { wb, openScreen } = useWorkbook()
  if (wb.externalRefs.length === 0) return null

  return (
    <div className="wb-external-refs" data-external-refs>
      <span className="wb-external-refs-title">다른 화면에서 가져온 값</span>
      <ul className="wb-external-refs-list">
        {wb.externalRefs.map((ref) => (
          <li key={ref.address} className="wb-external-ref">
            <button
              type="button"
              className="wb-external-ref-link"
              onClick={() => openScreen?.(ref.screen, ref.value?.address)}
            >
              {wb.labelOf(ref.address)} ↗
            </button>
            {ref.value ? (
              <>
                <span
                  className={`wb-external-ref-value ${ref.value.error ? 'wb-error' : ''}`}
                >
                  {ref.value.text}
                </span>
                <span className="wb-external-ref-meta">
                  {savedAtText(ref.value.savedAt)} 저장
                </span>
              </>
            ) : (
              <span className="wb-external-ref-missing">
                저장된 값이 없습니다. 해당 화면을 열어 저장하세요.
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
