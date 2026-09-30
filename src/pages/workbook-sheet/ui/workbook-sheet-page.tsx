import { useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'

import { toSession } from '#/entities/tax-session/model/adapter'
import { taxSessionResponse } from '#/entities/tax-session/model/data'
import type { TabId, TaxSession } from '#/entities/tax-session/model/types'
import { createStore } from '#/shared/lib/store/create-store'
import type { Store } from '#/shared/lib/store/create-store'
import { useStore } from '#/shared/lib/store/use-store'
import { ExternalRefs } from '#/shared/lib/workbook/external-refs'
import { FormulaBar } from '#/shared/lib/workbook/formula-bar'
import { createUiStore } from '#/shared/lib/workbook/navigation'
import type { UiState } from '#/shared/lib/workbook/navigation'
import { screenStorage } from '#/shared/lib/workbook/screen-storage'
import { useOpenScreen } from '#/shared/lib/workbook/use-open-screen'
import {
  useFocusAddress,
  useWorkbook,
  WorkbookProvider,
} from '#/shared/lib/workbook/workbook-context'
import { PageHeader } from '#/shared/ui/page-header'
import {
  issueCounts,
  taxWorkbook,
} from '#/widgets/tax-workbook/model/tax-workbook'
import { CompanyTab } from '#/widgets/tax-workbook/ui/company-tab'
import { TaxTab } from '#/widgets/tax-workbook/ui/tax-tab'
import { WorkbookSummary } from '#/widgets/tax-workbook/ui/workbook-summary'
import { SheetGrid } from '#/shared/lib/workbook/sheet-grid'
import { SessionDebug } from '#/widgets/tax-session/ui/session-debug'

const tabs: { id: TabId; label: string }[] = [
  { id: 'company', label: '기본정보' },
  { id: 'adjustment', label: '소득금액조정' },
  { id: 'tax', label: '세액계산' },
]

// Screens this one references with `[ext:...]`.
const IMPORTS = ['closing'] as const

function Screen({
  store,
  ui,
  initialJson,
  focusCell,
}: {
  store: Store<TaxSession>
  ui: Store<UiState>
  initialJson: string
  focusCell?: string
}) {
  const { wb } = useWorkbook()
  const state = useStore(store, (s) => s)
  const tab = useStore(ui, (s) => s.tab) as TabId
  const issues = issueCounts(wb, state)
  const dirty = JSON.stringify(state) !== initialJson

  const navigate = useNavigate()
  const clearCell = useCallback(
    () => void navigate({ to: '/workbook-sheet', search: {}, replace: true }),
    [navigate],
  )
  useFocusAddress(focusCell, clearCell)

  return (
    <>
      <WorkbookSummary
        dirty={dirty}
        onReset={() => store.set(() => toSession(taxSessionResponse))}
      />
      <ExternalRefs />
      <FormulaBar />

      <section className="mx-auto max-w-[1500px] border border-[#c5d0c7] bg-[#fffdf8] shadow-[0_1rem_3rem_rgb(38_65_55/8%)]">
        <nav
          className="flex border-b border-[#c5d0c7] font-sans"
          role="tablist"
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`flex cursor-pointer items-center gap-2 border-r border-[#c5d0c7] px-5 py-3 text-sm font-bold ${tab === t.id ? 'bg-[#fffdf8] text-[#17312d]' : 'bg-[#eef3ed] text-[#536863]'}`}
              onClick={() => ui.set((s) => ({ ...s, tab: t.id }))}
            >
              {t.label}
              {issues[t.id] > 0 && (
                <span className="rounded-full bg-[#c0392b] px-1.5 text-xs text-white">
                  {issues[t.id]}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Inactive tabs are unmounted; the data lives in the store. */}
        {tab === 'company' && <CompanyTab store={store} />}
        {tab === 'adjustment' && <SheetGrid sheetId="adj" />}
        {tab === 'tax' && <TaxTab />}
      </section>
    </>
  )
}

export function WorkbookSheetPage({ focusCell }: { focusCell?: string }) {
  // One editing session: the server response becomes the client state once.
  // Other screens are not loaded: only the values they exported are read.
  const [session] = useState(() => {
    const initial = toSession(taxSessionResponse)
    return {
      store: createStore(initial),
      ui: createUiStore('adjustment'),
      initialJson: JSON.stringify(initial),
      externals: createStore(screenStorage.loadExports(IMPORTS)),
    }
  })
  const { store, ui, initialJson, externals } = session
  const openScreen = useOpenScreen()

  useEffect(() => screenStorage.watchExports(IMPORTS, externals), [externals])

  return (
    <main className="min-h-screen bg-[#f4f1e9] p-6 text-[#17312d] sm:p-10 lg:p-16">
      <PageHeader
        eyebrow="AG Grid playground"
        title="Workbook"
        description="Typed cells and fixed formulas across sheets and tabs. Select a cell to see its formula; click a reference in the formula bar to jump to that cell. The tax calculation also reads net income from the closing screen ([ext:closing/netIncome]); that reference opens the closing screen."
      />

      <WorkbookProvider
        store={store}
        def={taxWorkbook}
        ui={ui}
        externals={externals}
        openScreen={openScreen}
      >
        <Screen
          store={store}
          ui={ui}
          initialJson={initialJson}
          focusCell={focusCell}
        />
      </WorkbookProvider>

      <SessionDebug store={store} />
    </main>
  )
}
