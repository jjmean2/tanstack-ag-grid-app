import 'server-only'

import type { SavedExports, ScreenExports } from '@lab/workbook'
import { toSession } from '@/entities/tax-session/model/adapter'
import { taxSessionResponse } from '@/entities/tax-session/model/data'
import { initialClosing } from '@/widgets/closing-workbook/model/closing-workbook'

// The server side of the server-backed screens: each screen's state, and what
// it exports for other screens, kept apart so a screen reads a few values of
// another, not its state. A stand-in for a database: kept in this server
// process's memory (it survives hot reloads, not restarts), seeded with the
// same data the other demos start from.

export const SERVER_SCREEN_IDS = ['closing', 'tax'] as const
export type ServerScreenId = (typeof SERVER_SCREEN_IDS)[number]

export const isServerScreenId = (id: string): id is ServerScreenId =>
  (SERVER_SCREEN_IDS as readonly string[]).includes(id)

type Saved = { state: unknown; savedAt: string | null }

const seeds: Record<ServerScreenId, () => unknown> = {
  closing: () => initialClosing,
  tax: () => toSession(taxSessionResponse),
}

const store = ((globalThis as { __screenStore?: unknown }).__screenStore ??= {
  states: new Map<ServerScreenId, Saved>(),
  exports: new Map<ServerScreenId, ScreenExports>(),
}) as {
  states: Map<ServerScreenId, Saved>
  exports: Map<ServerScreenId, ScreenExports>
}

// A little latency, so the client's loading and saving states show.
const LATENCY_MS = 400
const later = () => new Promise((resolve) => setTimeout(resolve, LATENCY_MS))

export async function readScreen(id: ServerScreenId): Promise<Saved> {
  await later()
  return store.states.get(id) ?? { state: seeds[id](), savedAt: null }
}

export async function writeScreen(
  id: ServerScreenId,
  state: unknown,
  exports: ScreenExports,
): Promise<string> {
  await later()
  const savedAt = exports.savedAt
  store.states.set(id, { state, savedAt })
  store.exports.set(id, exports)
  return savedAt
}

export async function readExports(
  ids: readonly ServerScreenId[],
): Promise<SavedExports> {
  await later()
  return Object.fromEntries(ids.map((id) => [id, store.exports.get(id)]))
}
