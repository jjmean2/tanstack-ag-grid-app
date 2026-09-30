import { useEffect, useState } from 'react'

import { createStore, createUiStore, screenStorage } from '@lab/workbook'
import type { ScreenExports, Store, UiState } from '@lab/workbook'
import { SCREENS } from '#/shared/config/screens'
import type { ScreenId } from '#/shared/config/screens'

// Everything a screen keeps while it is open: its editing session (the state
// store), its UI state, and the saved exports of the screens it references.
export type ScreenSession<TState> = {
  id: ScreenId
  title: string
  store: Store<TState>
  ui: Store<UiState>
  externals: Store<Record<string, ScreenExports | undefined>>
  persist: boolean
  // JSON of the state last loaded or saved, which "changed" compares with;
  // null when a persisted screen has never been saved.
  baseline: string | null
  savedAt: string | null
  reset: () => void // back to `initial()`
  markSaved: (json: string, at: string) => void
}

export function useScreenSession<TState>(opts: {
  id: ScreenId
  initial: () => TState // a fresh state: from the server, an import, ...
  tab: string // the tab shown first
  persist?: boolean // start from the saved state, and allow saving
  imports?: readonly ScreenId[] // screens this one reads with `[ext:...]`
}): ScreenSession<TState> {
  const [session] = useState(() => {
    const saved = opts.persist
      ? screenStorage.loadState<TState>(opts.id)
      : undefined
    const state = saved ?? opts.initial()
    const imports = opts.imports ?? []
    return {
      initial: opts.initial,
      imports,
      store: createStore(state),
      ui: createUiStore(opts.tab),
      externals: createStore(screenStorage.loadExports(imports)),
      baseline: opts.persist
        ? saved === undefined
          ? null
          : JSON.stringify(saved)
        : JSON.stringify(state),
      savedAt: saved
        ? (screenStorage.loadExports([opts.id])[opts.id]?.savedAt ?? null)
        : null,
    }
  })
  const [saved, setSaved] = useState({
    baseline: session.baseline,
    savedAt: session.savedAt,
  })

  // Another browser tab may save a screen this one references.
  useEffect(
    () => screenStorage.watchExports(session.imports, session.externals),
    [session],
  )

  return {
    id: opts.id,
    title: SCREENS[opts.id].title,
    store: session.store,
    ui: session.ui,
    externals: session.externals,
    persist: opts.persist ?? false,
    baseline: saved.baseline,
    savedAt: saved.savedAt,
    reset: () => session.store.set(() => session.initial()),
    markSaved: (json, at) => setSaved({ baseline: json, savedAt: at }),
  }
}
