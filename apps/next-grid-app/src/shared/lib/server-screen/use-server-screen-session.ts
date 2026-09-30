'use client'

import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'

import { createSession } from '@lab/workbook'
import type { WorkbookDef } from '@lab/workbook'
import { useRouter } from 'next/navigation'
import type { OpenScreen } from '@lab/workbook/react'
import type { ScreenSession } from '@/shared/lib/screen/use-screen-session'
import {
  fetchExports,
  fetchScreen,
  isServerScreenId,
  saveScreen,
  screenKeys,
  SERVER_SCREENS,
} from './api'
import type { ScreenOnServer, ServerScreenId } from './api'

// A screen whose state lives on a server, through TanStack Query:
//   - its state is a query, read once when the screen opens (it suspends until
//     then; the page shows a fallback). The workbook session starts from it and
//     from then on the state is the session's, edited locally;
//   - other screens' exports are a query too, kept fresh (refetched when the
//     window regains focus, and invalidated whenever a screen is saved) and
//     fed into the session, so formulas reading them follow;
//   - saving is a mutation: it updates the cached state and invalidates the
//     exports, so every screen reading this one refetches them.
// It returns the same ScreenSession as the browser-storage one, so the screen
// frame and the tabs do not know the difference.
export function useServerScreenSession<TState>(opts: {
  id: ServerScreenId
  def: WorkbookDef<TState>
  imports?: readonly ServerScreenId[] // screens this one reads with `[ext:…]`
}): ScreenSession<TState> {
  const imports = opts.imports ?? []
  const queryClient = useQueryClient()
  const { data: loaded } = useSuspenseQuery({
    queryKey: screenKeys.state(opts.id),
    queryFn: () => fetchScreen<TState>(opts.id),
    staleTime: Infinity, // the session owns the state once it has started
  })
  const { data: externals } = useSuspenseQuery({
    queryKey: screenKeys.exports(imports),
    queryFn: () => fetchExports(imports),
    staleTime: 0,
    refetchOnWindowFocus: true,
  })

  const [started] = useState(() => ({
    workbook: createSession(opts.def, loaded.state, { externals }),
    loaded,
  }))
  const [saved, setSaved] = useState({
    baseline: JSON.stringify(loaded.state),
    savedAt: loaded.savedAt,
  })

  // Fresh exports of other screens reach the formulas that read them.
  useEffect(() => {
    started.workbook.externals.set(() => externals)
  }, [externals, started])

  const mutation = useMutation({
    mutationFn: (vars: {
      state: TState
      exports: Parameters<typeof saveScreen>[2]
    }) => saveScreen(opts.id, vars.state, vars.exports),
    onSuccess: ({ savedAt }, { state }) => {
      queryClient.setQueryData<ScreenOnServer<TState>>(
        screenKeys.state(opts.id),
        { state, savedAt },
      )
      void queryClient.invalidateQueries({ queryKey: screenKeys.allExports })
      setSaved({ baseline: JSON.stringify(state), savedAt })
    },
  })

  return {
    id: opts.id,
    title: SERVER_SCREENS[opts.id].title,
    workbook: started.workbook,
    persist: true,
    baseline: saved.baseline,
    savedAt: saved.savedAt,
    // Back to what the server had when the screen opened.
    reset: () => started.workbook.store.set(() => started.loaded.state),
    save: (state, exports) =>
      mutation.mutateAsync({ state, exports }).then(
        () => true,
        () => false,
      ),
    saving: mutation.isPending,
  }
}

// References to other screens open their server-backed routes.
export function useServerOpenScreen(): OpenScreen {
  const router = useRouter()
  return useCallback(
    (screen, address) => {
      if (!isServerScreenId(screen)) return
      const path = SERVER_SCREENS[screen].path
      router.push(
        address ? `${path}?cell=${encodeURIComponent(address)}` : path,
      )
    },
    [router],
  )
}
