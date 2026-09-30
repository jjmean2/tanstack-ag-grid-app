import { useState } from 'react'
import type { ReactNode } from 'react'

import { screenExports, screenStorage, splitAddress } from '@lab/workbook'
import type { Workbook, WorkbookDef } from '@lab/workbook'
import { SheetGridProvider } from '@lab/workbook/ag-grid'
import {
  ExternalRefs,
  FormulaBar,
  savedAtText,
  useFocusAddress,
  useStore,
  useWorkbook,
  WorkbookErrorBoundary,
  WorkbookProvider,
} from '@lab/workbook/react'
import { playgroundGridTheme } from '#/shared/config/ag-grid'
import { useCellSearch, useOpenScreen } from '#/shared/lib/screen/router'
import type { ScreenSession } from '#/shared/lib/screen/use-screen-session'

export type ScreenTab = { id: string; label: string; render: () => ReactNode }

type Props<TState> = {
  session: ScreenSession<TState>
  def: WorkbookDef<TState>
  tabs: ScreenTab[] // one tab: no tab bar
  // Left of the status bar, inside the workbook (may use `useWorkbook`).
  toolbar?: ReactNode
  // Badge per tab; by default the formula errors on the tab's sheets.
  issues?: (wb: Workbook, state: TState) => Record<string, number>
}

// The frame every screen shares: the workbook and its error boundary, the
// status bar (changed / save / reset), references to other screens, the
// formula bar, the tab bar, and focusing a cell named in the URL.
export function ScreenLayout<TState extends object>(props: Props<TState>) {
  const { session, def } = props
  const openScreen = useOpenScreen()
  return (
    <SheetGridProvider theme={playgroundGridTheme}>
      <WorkbookErrorBoundary>
        <WorkbookProvider
          store={session.store}
          def={def}
          ui={session.ui}
          externals={session.externals}
          openScreen={openScreen}
        >
          <Screen {...props} />
        </WorkbookProvider>
      </WorkbookErrorBoundary>
    </SheetGridProvider>
  )
}

function Screen<TState extends object>({
  session,
  tabs,
  toolbar,
  issues,
}: Props<TState>) {
  const { wb } = useWorkbook()
  const state = useStore(session.store, (s) => s)
  const tab = useStore(session.ui, (s) => s.tab)
  const [cell, clearCell] = useCellSearch()
  useFocusAddress(cell, clearCell)

  const badges = issues
    ? issues(wb, state)
    : Object.fromEntries(
        tabs.map((t) => [
          t.id,
          wb.errors.filter(
            (e) => wb.tabOf(splitAddress(e.address).sheetId) === t.id,
          ).length,
        ]),
      )
  const current = tabs.find((t) => t.id === tab) ?? tabs[0]

  return (
    <>
      <StatusBar session={session} state={state} toolbar={toolbar} />
      <ExternalRefs />
      <FormulaBar />
      <section className="mx-auto max-w-375 border border-[#c5d0c7] bg-[#fffdf8] shadow-[0_1rem_3rem_rgb(38_65_55/8%)]">
        {tabs.length > 1 && (
          <nav
            className="flex border-b border-[#c5d0c7] font-sans"
            role="tablist"
          >
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={current.id === t.id}
                className={`flex cursor-pointer items-center gap-2 border-r border-[#c5d0c7] px-5 py-3 text-sm font-bold ${current.id === t.id ? 'bg-[#fffdf8] text-[#17312d]' : 'bg-[#eef3ed] text-[#536863]'}`}
                onClick={() => session.ui.set((s) => ({ ...s, tab: t.id }))}
              >
                {t.label}
                {(badges[t.id] ?? 0) > 0 && (
                  <span className="rounded-full bg-[#c0392b] px-1.5 text-xs text-white">
                    {badges[t.id]}
                  </span>
                )}
              </button>
            ))}
          </nav>
        )}
        {/* Inactive tabs are unmounted; the data lives in the store. */}
        {current.render()}
      </section>
    </>
  )
}

function StatusBar<TState>({
  session,
  state,
  toolbar,
}: {
  session: ScreenSession<TState>
  state: TState
  toolbar?: ReactNode
}) {
  const { wb } = useWorkbook()
  const [failed, setFailed] = useState(false)
  const dirty = JSON.stringify(state) !== session.baseline

  const save = () => {
    const exports = screenExports(wb, session.id, session.title)
    const ok = screenStorage.save(session.id, state, exports)
    setFailed(!ok)
    if (ok) session.markSaved(JSON.stringify(state), exports.savedAt)
  }

  return (
    <div className="mx-auto mb-4 flex max-w-375 flex-wrap items-center gap-x-8 gap-y-3 border border-[#c5d0c7] bg-[#fffdf8] px-6 py-4 font-sans text-sm">
      {toolbar}
      <div className="ml-auto flex items-center gap-3">
        {wb.errors.length > 0 && (
          <span className="bg-[#f6d8d4] px-2 py-1 text-xs font-bold text-[#c0392b]">
            수식 오류 {wb.errors.length}
          </span>
        )}
        {session.persist && (
          <span className="text-xs text-[#536863]">
            {session.savedAt
              ? `${savedAtText(session.savedAt)} 저장됨`
              : '저장된 적 없음'}
          </span>
        )}
        {failed && (
          <span className="text-xs font-bold text-[#c0392b]">
            저장하지 못했습니다
          </span>
        )}
        <span
          className={`px-2 py-1 text-xs font-bold ${dirty ? 'bg-[#f6e2d8] text-[#b35131]' : 'bg-[#e6eee8] text-[#536863]'}`}
        >
          {dirty ? '변경됨' : '변경 없음'}
        </span>
        {session.persist && (
          <button
            type="button"
            className="cursor-pointer border border-[#1f6f66] bg-[#1f6f66] px-3 py-1.5 font-bold text-white hover:bg-[#185a53] disabled:cursor-default disabled:opacity-40"
            disabled={!dirty}
            onClick={save}
          >
            저장
          </button>
        )}
        <button
          type="button"
          className="cursor-pointer border border-[#9aaba0] bg-white px-3 py-1.5 font-bold hover:bg-[#eef3ed]"
          onClick={session.reset}
        >
          초기값으로
        </button>
      </div>
    </div>
  )
}
