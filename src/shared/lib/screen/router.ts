import { useNavigate, useSearch } from '@tanstack/react-router'
import { useCallback } from 'react'

import type { OpenScreen } from '@labs/workbook/react'
import { isScreenId, SCREENS } from '#/shared/config/screens'

// Where the workbook library meets the router: which route shows a screen, and
// the cell to focus travelling in `?cell=`.

export type CellSearch = { cell?: string }

// For every screen route: `validateSearch: validateCellSearch`.
export const validateCellSearch = (
  search: Record<string, unknown>,
): CellSearch => ({
  cell: typeof search.cell === 'string' ? search.cell : undefined,
})

// Opens another screen's route, focusing `address` there.
export function useOpenScreen(): OpenScreen {
  const navigate = useNavigate()
  return useCallback(
    (screen, address) => {
      if (!isScreenId(screen)) return
      void navigate({ to: SCREENS[screen].path, search: { cell: address } })
    },
    [navigate],
  )
}

// The cell named in the current URL, and a way to drop it once focused (so
// following the same link again works, and a reload does not jump).
export function useCellSearch(): [string | undefined, () => void] {
  const { cell } = useSearch({ strict: false })
  const navigate = useNavigate()
  const clear = useCallback(
    () =>
      void navigate({
        to: '.',
        search: (prev: object) => ({ ...prev, cell: undefined }),
        replace: true,
      }),
    [navigate],
  )
  return [cell, clear]
}
