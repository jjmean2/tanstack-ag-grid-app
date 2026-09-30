import type { NextRequest } from 'next/server'

import type { ScreenExports } from '@lab/workbook'
import {
  isServerScreenId,
  readScreen,
  writeScreen,
} from '@/server/screen-store'

// A screen's state: GET it (the seed until first saved), PUT it with what it
// exports.

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!isServerScreenId(id)) return Response.json(null, { status: 404 })
  return Response.json(await readScreen(id))
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!isServerScreenId(id)) return Response.json(null, { status: 404 })
  const body = (await request.json()) as {
    state: unknown
    exports: ScreenExports
  }
  const savedAt = await writeScreen(id, body.state, body.exports)
  return Response.json({ savedAt })
}
