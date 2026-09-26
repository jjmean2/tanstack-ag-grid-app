import { useRef, useSyncExternalStore } from 'react'

import type { Store } from './create-store'

export function shallowEqual(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
) {
  if (Object.is(a, b)) return true
  const keysA = Object.keys(a)
  return (
    keysA.length === Object.keys(b).length &&
    keysA.every((key) => Object.is(a[key], b[key]))
  )
}

// Subscribes to a slice of the store. The component re-renders only when the
// selected value changes according to `isEqual`.
export function useStore<TState, TResult>(
  store: Store<TState>,
  selector: (state: TState) => TResult,
  isEqual: (a: TResult, b: TResult) => boolean = Object.is,
): TResult {
  const cache = useRef<{ value: TResult } | null>(null)

  const getSnapshot = () => {
    const next = selector(store.get())
    if (cache.current && isEqual(cache.current.value, next)) {
      return cache.current.value
    }
    cache.current = { value: next }
    return next
  }

  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot)
}
