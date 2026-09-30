import { useEffect, useState } from 'react'

import { createSession } from '@lab/workbook'
import type { ScreenExports, WorkbookDef, WorkbookSession } from '@lab/workbook'
import { SCREENS } from '@/shared/config/screens'
import type { ScreenId } from '@/shared/config/screens'
import { screenStorage } from './storage'

// A screen's workbook session (the library's: state, UI state, other screens'
// exports), plus what this app adds: how it is saved, and whether it changed
// since it was loaded or saved. Where it is saved is the session's: this
// browser (useScreenSession) or a server (useServerScreenSession); the screen
// frame only calls `save`.
export type ScreenSession<TState> = {
  id: string // the screen's name in references (`[ext:<id>/…]`)
  title: string
  workbook: WorkbookSession<TState>
  persist: boolean
  // JSON of the state last loaded or saved, which "changed" compares with;
  // null when a persisted screen has never been saved.
  baseline: string | null
  savedAt: string | null
  reset: () => void // back to where it started
  // Saves the state with what it exports; resolves to whether it worked.
  save: (state: TState, exports: ScreenExports) => Promise<boolean>
  saving: boolean
}

export function useScreenSession<TState>(opts: {
  id: ScreenId
  def: WorkbookDef<TState>
  initial: () => TState // a fresh state: from the server, an import, ...
  persist?: boolean // start from the saved state, and allow saving
  imports?: readonly ScreenId[] // screens this one reads with `[ext:...]`
}): ScreenSession<TState> {
  const [started] = useState(() => {
    const saved = opts.persist
      ? screenStorage.loadState<TState>(opts.id)
      : undefined
    const state = saved ?? opts.initial()
    const imports = opts.imports ?? []
    return {
      initial: opts.initial,
      imports,
      workbook: createSession(opts.def, state, {
        externals: screenStorage.loadExports(imports),
      }),
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
    baseline: started.baseline,
    savedAt: started.savedAt,
  })

  // Another browser tab may save a screen this one references.
  useEffect(
    () =>
      screenStorage.watchExports(started.imports, started.workbook.externals),
    [started],
  )

  return {
    id: opts.id,
    title: SCREENS[opts.id].title,
    workbook: started.workbook,
    persist: opts.persist ?? false,
    baseline: saved.baseline,
    savedAt: saved.savedAt,
    reset: () => started.workbook.store.set(() => started.initial()),
    save: (state, exports) => {
      const ok = screenStorage.save(opts.id, state, exports)
      if (ok)
        setSaved({ baseline: JSON.stringify(state), savedAt: exports.savedAt })
      return Promise.resolve(ok)
    },
    saving: false,
  }
}
