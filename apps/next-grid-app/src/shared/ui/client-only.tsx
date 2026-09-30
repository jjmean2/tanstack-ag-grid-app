'use client'

import { Suspense, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'

const subscribe = () => () => {}

// Renders its children in the browser only. Workbook screens start from what
// this browser saved (localStorage) and draw AG Grid, neither of which exists
// while the server renders: rendering them there would only differ from the
// first client render (a hydration error). The Suspense boundary lets them
// read the URL's search params (`useSearchParams`).
export function ClientOnly({ children }: { children: ReactNode }) {
  const inBrowser = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
  return inBrowser ? <Suspense>{children}</Suspense> : null
}
