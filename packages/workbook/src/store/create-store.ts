// Minimal external store: the single source of truth for an editing session.
// Views (inputs, grids) read slices through `useStore` and write with `set`.
export type Store<TState> = {
  get: () => TState
  set: (updater: (state: TState) => TState) => void
  subscribe: (listener: () => void) => () => void
}

export function createStore<TState>(initial: TState): Store<TState> {
  let state = initial
  const listeners = new Set<() => void>()

  return {
    get: () => state,
    set: (updater) => {
      const next = updater(state)
      if (Object.is(next, state)) return
      state = next
      listeners.forEach((listener) => listener())
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
