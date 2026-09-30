import { useNavigate } from '@tanstack/react-router'
import { useCallback } from 'react'

import { isScreenId, SCREENS } from '#/shared/config/screens'
import type { OpenScreen } from './workbook-context'

// Opens another screen's route; the target cell travels in `?cell=`.
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

export type CellSearch = { cell?: string }

export const validateCellSearch = (
  search: Record<string, unknown>,
): CellSearch => ({
  cell: typeof search.cell === 'string' ? search.cell : undefined,
})
