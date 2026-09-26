import { useState } from 'react'

import { taxSessionResponse } from '#/entities/tax-session/model/data'
import { toSession } from '#/entities/tax-session/model/adapter'
import { selectIssueCounts } from '#/entities/tax-session/model/selectors'
import type { TabId } from '#/entities/tax-session/model/types'
import { createStore } from '#/shared/lib/store/create-store'
import { shallowEqual, useStore } from '#/shared/lib/store/use-store'
import { PageHeader } from '#/shared/ui/page-header'
import { AdjustmentTab } from '#/widgets/tax-session/ui/adjustment-tab'
import { CompanyTab } from '#/widgets/tax-session/ui/company-tab'
import { SessionDebug } from '#/widgets/tax-session/ui/session-debug'
import { SessionSummary } from '#/widgets/tax-session/ui/session-summary'
import { TaxTab } from '#/widgets/tax-session/ui/tax-tab'

const tabs: { id: TabId; label: string }[] = [
  { id: 'company', label: '기본정보' },
  { id: 'adjustment', label: '소득금액조정' },
  { id: 'tax', label: '세액계산' },
]

export function SessionSheetPage() {
  // One editing session: the server response becomes the client state once.
  const [session] = useState(() => {
    const initial = toSession(taxSessionResponse)
    return { store: createStore(initial), initialJson: JSON.stringify(initial) }
  })
  const { store, initialJson } = session
  const [tab, setTab] = useState<TabId>('adjustment')

  const dirty = useStore(store, (s) => JSON.stringify(s) !== initialJson)
  const issues = useStore(store, selectIssueCounts, shallowEqual)

  return (
    <main className="min-h-screen bg-[#f4f1e9] p-6 text-[#17312d] sm:p-10 lg:p-16">
      <PageHeader
        eyebrow="AG Grid playground"
        title="Session sheet"
        description="Several tabs, one editing session. Inputs and grids in every tab read and write the same client state; derived values are computed from it."
      />

      <SessionSummary
        store={store}
        dirty={dirty}
        onReset={() => store.set(() => toSession(taxSessionResponse))}
      />

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
              onClick={() => setTab(t.id)}
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
        {tab === 'adjustment' && <AdjustmentTab store={store} />}
        {tab === 'tax' && <TaxTab store={store} />}
      </section>

      <SessionDebug store={store} />
    </main>
  )
}
