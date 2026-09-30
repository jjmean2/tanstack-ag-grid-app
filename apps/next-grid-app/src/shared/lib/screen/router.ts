'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

import type { OpenScreen } from '@lab/workbook/react'
import { isScreenId, SCREENS } from '@/shared/config/screens'

// Where the workbook library meets the router (here Next.js's App Router):
// which route shows a screen, and the cell to focus travelling in `?cell=`.

// Opens another screen's route, focusing `address` there.
export function useOpenScreen(): OpenScreen {
  const router = useRouter()
  return useCallback(
    (screen, address) => {
      if (!isScreenId(screen)) return
      const path = SCREENS[screen].path
      router.push(
        address ? `${path}?cell=${encodeURIComponent(address)}` : path,
      )
    },
    [router],
  )
}

// The cell named in the current URL, and a way to drop it once focused (so
// following the same link again works, and a reload does not jump).
export function useCellSearch(): [string | undefined, () => void] {
  const params = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const cell = params.get('cell') ?? undefined
  const clear = useCallback(() => {
    const next = new URLSearchParams(params.toString())
    next.delete('cell')
    const query = next.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    })
  }, [params, pathname, router])
  return [cell, clear]
}
