import { createContext, useContext, useEffect, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'

import { createStore } from '../store/create-store'
import type { Store } from '../store/create-store'
import { useStore } from './use-store'
import { externalsFrom } from '../core/external'
import { navigate } from '../core/navigation'
import type { UiState } from '../core/navigation'
import type {
  Address,
  ScreenExports,
  Workbook,
  WorkbookDef,
} from '../core/types'
import { buildWorkbook } from '../core/workbook'

// Opens another screen, focusing `address` there when given.
export type OpenScreen = (screen: string, address?: Address) => void

type WorkbookContextValue = {
  wb: Workbook
  ui: Store<UiState>
  openScreen?: OpenScreen
}

const WorkbookContext = createContext<WorkbookContextValue | null>(null)

const noExternals = createStore<Record<string, ScreenExports | undefined>>({})

// Evaluates the whole workbook whenever the session state (or a saved export
// of another screen) changes, and shares the result with every grid, the
// formula bar and any other consumer.
export function WorkbookProvider<TState extends object>({
  store,
  def,
  ui,
  externals = noExternals,
  openScreen,
  children,
}: {
  store: Store<TState>
  def: WorkbookDef<TState>
  ui: Store<UiState>
  externals?: Store<Record<string, ScreenExports | undefined>>
  openScreen?: OpenScreen
  children: ReactNode
}) {
  const state = useStore(store, (s) => s)
  const saved = useStore(externals, (s) => s)
  const lookup = useMemo(() => externalsFrom(saved), [saved])
  const wb = useMemo(
    () => buildWorkbook(def, state, store.set, lookup),
    [def, state, store, lookup],
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

  const value = useMemo(() => ({ wb, ui, openScreen }), [wb, ui, openScreen])
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
