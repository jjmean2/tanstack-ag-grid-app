import { useNavigate } from '@tanstack/react-router'
import { useCallback, useState } from 'react'

import { SCREENS } from '#/shared/config/screens'
import { createStore } from '#/shared/lib/store/create-store'
import type { Store } from '#/shared/lib/store/create-store'
import { useStore } from '#/shared/lib/store/use-store'
import { screenExports } from '#/shared/lib/workbook/external'
import { FormulaBar, savedAtText } from '#/shared/lib/workbook/formula-bar'
import { createUiStore } from '#/shared/lib/workbook/navigation'
import { screenStorage } from '#/shared/lib/workbook/screen-storage'
import { SheetGrid } from '#/shared/lib/workbook/sheet-grid'
import { useOpenScreen } from '#/shared/lib/workbook/use-open-screen'
import {
  useFocusAddress,
  useWorkbook,
  WorkbookProvider,
} from '#/shared/lib/workbook/workbook-context'
import { PageHeader } from '#/shared/ui/page-header'
import {
  closingWorkbook,
  initialClosing,
} from '#/widgets/closing-workbook/model/closing-workbook'
import type { ClosingState } from '#/widgets/closing-workbook/model/closing-workbook'

const SCREEN = 'closing'

function Screen({
  store,
  savedJson,
  savedAt,
  onSaved,
  focusCell,
}: {
  store: Store<ClosingState>
  savedJson: string | null
  savedAt: string | null
  onSaved: (json: string, at: string) => void
  focusCell?: string
}) {
  const { wb, openScreen } = useWorkbook()
  const state = useStore(store, (s) => s)
  const dirty = JSON.stringify(state) !== savedJson
  const [failed, setFailed] = useState(false)

  const navigate = useNavigate()
  const clearCell = useCallback(
    () => void navigate({ to: '/workbook-closing', search: {}, replace: true }),
    [navigate],
  )
  useFocusAddress(focusCell, clearCell)

  const save = () => {
    const exports = screenExports(wb, SCREEN, SCREENS.closing.title)
    const ok = screenStorage.save(SCREEN, state, exports)
    setFailed(!ok)
    if (ok) onSaved(JSON.stringify(state), exports.savedAt)
  }

  return (
    <>
      <div className="mx-auto mb-4 flex max-w-375 flex-wrap items-center gap-x-6 gap-y-3 border border-[#c5d0c7] bg-[#fffdf8] px-6 py-4 font-sans text-sm">
        <div className="grid gap-1">
          <span className="text-xs font-bold text-[#536863]">
            다른 화면에 공개하는 값 (저장할 때 함께 저장)
          </span>
          <ul className="flex flex-wrap gap-x-6" data-exports>
            {Object.entries(wb.exports).map(([name, value]) => (
              <li key={name}>
                <code className="text-xs text-[#b35131]">
                  ext:{SCREEN}/{name}
                </code>{' '}
                {value.label} ={' '}
                <strong className="font-mono">{value.text}</strong>
              </li>
            ))}
          </ul>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-[#536863]">
            {savedAt ? `${savedAtText(savedAt)} 저장됨` : '저장된 적 없음'}
          </span>
          {failed && (
            <span className="text-xs font-bold text-[#c0392b]">
              저장하지 못했습니다
            </span>
          )}
          <span
            className={`px-2 py-1 text-xs font-bold ${dirty ? 'bg-[#f6e2d8] text-[#b35131]' : 'bg-[#e6eee8] text-[#536863]'}`}
          >
            {dirty ? '저장 안 됨' : '저장됨'}
          </span>
          <button
            type="button"
            className="cursor-pointer border border-[#1f6f66] bg-[#1f6f66] px-3 py-1.5 font-bold text-white hover:bg-[#185a53] disabled:cursor-default disabled:opacity-40"
            disabled={!dirty}
            onClick={save}
          >
            저장
          </button>
          <button
            type="button"
            className="cursor-pointer border border-[#9aaba0] bg-white px-3 py-1.5 font-bold hover:bg-[#eef3ed]"
            onClick={() => openScreen?.('tax')}
          >
            {SCREENS.tax.title} 화면 열기 ↗
          </button>
        </div>
      </div>

      <FormulaBar />

      <section className="mx-auto max-w-375 border border-[#c5d0c7] bg-[#fffdf8] p-6 shadow-[0_1rem_3rem_rgb(38_65_55/8%)]">
        <div className="max-w-2xl border border-[#c5d0c7]">
          <SheetGrid sheetId="is" />
        </div>
      </section>
    </>
  )
}

export function WorkbookClosingPage({ focusCell }: { focusCell?: string }) {
  const [session] = useState(() => {
    const saved = screenStorage.loadState<ClosingState>(SCREEN)
    const exports = screenStorage.loadExports([SCREEN])[SCREEN]
    return {
      store: createStore(saved ?? initialClosing),
      ui: createUiStore('is'),
      saved: saved
        ? { json: JSON.stringify(saved), at: exports?.savedAt ?? null }
        : { json: null, at: null },
    }
  })
  const [saved, setSaved] = useState(session.saved)
  const openScreen = useOpenScreen()

  return (
    <main className="min-h-screen bg-[#f4f1e9] p-6 text-[#17312d] sm:p-10 lg:p-16">
      <PageHeader
        eyebrow="Workbook · 화면 간 참조"
        title={SCREENS.closing.title}
        description="이 화면은 당기순이익을 export합니다. 저장하면 법인세 세무조정 화면이 그 값을 [ext:closing/netIncome]으로 읽습니다. 다른 브라우저 탭에 세무조정 화면을 열어 두면 저장하는 즉시 반영됩니다."
      />

      <WorkbookProvider
        store={session.store}
        def={closingWorkbook}
        ui={session.ui}
        openScreen={openScreen}
      >
        <Screen
          store={session.store}
          savedJson={saved.json}
          savedAt={saved.at}
          onSaved={(json, at) => setSaved({ json, at })}
          focusCell={focusCell}
        />
      </WorkbookProvider>
    </main>
  )
}
