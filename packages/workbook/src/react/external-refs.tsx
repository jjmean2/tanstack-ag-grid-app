import { savedAtText } from './formula-bar'
import { useExternalRefs } from './use-formula-bar'

// The words the panel shows; pass some to change them.
export const externalRefsTexts = {
  title: '다른 화면에서 가져온 값',
  saved: (at: string) => `${savedAtText(at)} 저장`,
  missing: '저장된 값이 없습니다. 해당 화면을 열어 저장하세요.',
}

// Lists the values this screen reads from other screens, with when they were
// saved there, and links to open the cell they come from. Nothing when the
// screen reads none.
//
// One rendering of `useExternalRefs`; for another layout, draw your own.
export function ExternalRefs({
  texts: custom,
}: {
  texts?: Partial<typeof externalRefsTexts>
}) {
  const texts = { ...externalRefsTexts, ...custom }
  const refs = useExternalRefs()
  if (refs.length === 0) return null

  return (
    <div className="wb-external-refs" data-external-refs>
      <span className="wb-external-refs-title">{texts.title}</span>
      <ul className="wb-external-refs-list">
        {refs.map((ref) => (
          <li key={ref.address} className="wb-external-ref">
            <button
              type="button"
              className="wb-external-ref-link"
              onClick={ref.open}
            >
              {ref.label} ↗
            </button>
            {ref.value ? (
              <>
                <span
                  className={`wb-external-ref-value ${ref.value.error ? 'wb-error' : ''}`}
                >
                  {ref.value.text}
                </span>
                <span className="wb-external-ref-meta">
                  {texts.saved(ref.value.savedAt)}
                </span>
              </>
            ) : (
              <span className="wb-external-ref-missing">{texts.missing}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
