import { createStore } from '../store/create-store'
import type { Store } from '../store/create-store'
import { createUiStore } from './navigation'
import type { UiState } from './navigation'
import type { SavedExports, WorkbookDef } from './types'

// What a screen keeps while it is open: its definition, the editing session
// (the state store), the UI state (focus, navigation), and the saved exports
// of the screens it references. `WorkbookProvider` takes it as is.
export type WorkbookSession<TState> = {
  def: WorkbookDef<TState>
  store: Store<TState>
  ui: Store<UiState>
  externals: Store<SavedExports>
}

export function createSession<TState>(
  def: WorkbookDef<TState>,
  initial: TState,
  opts: { externals?: SavedExports } = {},
): WorkbookSession<TState> {
  return {
    def,
    store: createStore(initial),
    ui: createUiStore(),
    externals: createStore(opts.externals ?? {}),
  }
}
