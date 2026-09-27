import { createContext, useContext, useEffect, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'

import type { Store } from '../store/create-store'
import { useStore } from '../store/use-store'
import type { UiState } from './navigation'
import type { Workbook, WorkbookDef } from './types'
import { buildWorkbook } from './workbook'

type WorkbookContextValue = { wb: Workbook; ui: Store<UiState> }

const WorkbookContext = createContext<WorkbookContextValue | null>(null)

// Evaluates the whole workbook whenever the session state changes and shares
// the result with every grid, the formula bar and any other consumer.
export function WorkbookProvider<TState extends object>({
  store,
  def,
  ui,
  children,
}: {
  store: Store<TState>
  def: WorkbookDef<TState>
  ui: Store<UiState>
  children: ReactNode
}) {
  const state = useStore(store, (s) => s)
  const wb = useMemo(
    () => buildWorkbook(def, state, store.set),
    [def, state, store],
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

  const value = useMemo(() => ({ wb, ui }), [wb, ui])
  return <WorkbookContext value={value}>{children}</WorkbookContext>
}

export function useWorkbook() {
  const value = useContext(WorkbookContext)
  if (!value)
    throw new Error('useWorkbook must be used inside <WorkbookProvider>')
  return value
}
