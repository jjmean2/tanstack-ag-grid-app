import { createContext, useContext, useEffect, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'

import type { Store } from '../store/create-store'
import { useStore } from './use-store'
import { navigate } from '../core/navigation'
import type { UiState } from '../core/navigation'
import type { WorkbookSession } from '../core/session'
import type { Address, Workbook } from '../core/types'
import { buildWorkbook } from '../core/workbook'
import { defaultViews } from './views'
import type { CellViews } from './views'

// Opens another screen, focusing `address` there when given.
export type OpenScreen = (screen: string, address?: Address) => void

type WorkbookContextValue = {
  wb: Workbook
  ui: Store<UiState>
  views: CellViews
  openScreen?: OpenScreen
}

const WorkbookContext = createContext<WorkbookContextValue | null>(null)

// Evaluates the whole workbook whenever the session state (or a saved export
// of another screen) changes, and shares it with every view inside: grids,
// form sheets, inputs, the formula bar.
//
//   session     createSession(def, initial): the state and UI stores
//   views       how cells are shown (defineCellViews / defineInputViews);
//               a module-level constant
//   openScreen  how to open another screen (the app's router)
export function WorkbookProvider<TState extends object>({
  session,
  views = defaultViews,
  openScreen,
  children,
}: {
  session: WorkbookSession<TState>
  views?: CellViews
  openScreen?: OpenScreen
  children: ReactNode
}) {
  const { def, store, ui, externals } = session
  const state = useStore(store, (s) => s)
  const saved = useStore(externals, (s) => s)
  const wb = useMemo(
    () => buildWorkbook(def, state, { update: store.set, externals: saved }),
    [def, state, store, saved],
  )

  // Formulas are fixed, so a structural error (unknown reference, cycle, ...)
  // is a bug in the workbook definition: say so loudly in development.
  const logged = useRef('')
  useEffect(() => {
    if (!import.meta.env.DEV || wb.structuralErrors.length === 0) return
    const message = wb.structuralErrors
      .map((e) => `${e.address}: ${e.code}${e.detail ? ` (${e.detail})` : ''}`)
      .join('\n')
    if (logged.current === message) return
    logged.current = message
    console.error(`Workbook has formula errors:\n${message}`)
  }, [wb])

  const value = useMemo(
    () => ({ wb, ui, views, openScreen }),
    [wb, ui, views, openScreen],
  )
  return <WorkbookContext value={value}>{children}</WorkbookContext>
}

export function useWorkbook() {
  const value = useContext(WorkbookContext)
  if (!value)
    throw new Error('useWorkbook must be used inside <WorkbookProvider>')
  return value
}

// Moves focus to `address` once it is given, e.g. a cell named in the URL by a
// link from another screen. `onDone` lets the caller clear it from the URL.
export function useFocusAddress(address?: Address, onDone?: () => void) {
  const { wb, ui } = useWorkbook()
  const done = useRef<Address | undefined>(undefined)
  useEffect(() => {
    if (!address || done.current === address) return
    done.current = address
    navigate(ui, wb, address)
    onDone?.()
  }, [address, ui, wb, onDone])
}
