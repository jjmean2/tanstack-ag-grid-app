import type { Store } from '../store/create-store'
import type { ScreenExports } from './types'

// Saves each screen's state and, separately, what it exports, so a screen that
// references another one reads only a few values, not that screen's state.
// localStorage stands in for a server here; the shape of the calls is the same.

const VERSION = 1

const stateKey = (screen: string) => `workbook:${screen}:state`
const exportsKey = (screen: string) => `workbook:${screen}:exports`

type Saved<T> = { version: number; data: T }

function read<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return undefined
    const saved = JSON.parse(raw) as Saved<T>
    // A different version means the shape changed: ignore rather than guess.
    return saved.version === VERSION ? saved.data : undefined
  } catch {
    return undefined
  }
}

function write<T>(key: string, data: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify({ version: VERSION, data }))
    return true
  } catch {
    return false
  }
}

export const screenStorage = {
  loadState: <TState>(screen: string) => read<TState>(stateKey(screen)),

  // Returns false when the storage is unavailable (private mode, quota, ...).
  save: <TState>(screen: string, state: TState, exports: ScreenExports) =>
    write(stateKey(screen), state) && write(exportsKey(screen), exports),

  loadExports: (screens: readonly string[]) =>
    Object.fromEntries(
      screens.map((screen) => [
        screen,
        read<ScreenExports>(exportsKey(screen)),
      ]),
    ) as Record<string, ScreenExports | undefined>,

  // Keeps `store` up to date when another browser tab saves one of `screens`.
  watchExports: (
    screens: readonly string[],
    store: Store<Record<string, ScreenExports | undefined>>,
  ) => {
    const onStorage = (event: StorageEvent) => {
      const screen = screens.find((s) => event.key === exportsKey(s))
      if (!screen) return
      store.set((all) => ({
        ...all,
        [screen]: read<ScreenExports>(exportsKey(screen)),
      }))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  },
}
