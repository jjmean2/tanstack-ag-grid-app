import type { SavedExports, ScreenExports } from '@lab/workbook'

// The server-backed screens' API (src/app/api), and the TanStack Query keys
// for what it returns.

export const SERVER_SCREENS = {
  closing: { title: '결산 (서버)', path: '/server/closing' },
  tax: { title: '법인세 세무조정 (서버)', path: '/server/tax' },
} as const
export type ServerScreenId = keyof typeof SERVER_SCREENS

export const isServerScreenId = (id: string): id is ServerScreenId =>
  id in SERVER_SCREENS

export const screenKeys = {
  state: (id: ServerScreenId) => ['screen', id] as const,
  // Every screen's exports, whichever screens a query asked for: saving one
  // invalidates them all.
  exports: (ids: readonly ServerScreenId[]) => ['exports', ...ids] as const,
  allExports: ['exports'] as const,
}

export type ScreenOnServer<TState> = { state: TState; savedAt: string | null }

async function json<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(`${response.status} ${response.url}`)
  return (await response.json()) as T
}

export const fetchScreen = <TState>(id: ServerScreenId) =>
  fetch(`/api/screens/${id}`).then((r) => json<ScreenOnServer<TState>>(r))

export const fetchExports = (ids: readonly ServerScreenId[]) =>
  fetch(`/api/exports?screens=${ids.join(',')}`).then((r) =>
    json<SavedExports>(r),
  )

export const saveScreen = (
  id: ServerScreenId,
  state: unknown,
  exports: ScreenExports,
) =>
  fetch(`/api/screens/${id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ state, exports }),
  }).then((r) => json<{ savedAt: string }>(r))
