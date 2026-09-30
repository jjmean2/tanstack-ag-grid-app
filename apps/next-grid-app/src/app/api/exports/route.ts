import type { NextRequest } from 'next/server'

import { isServerScreenId, readExports } from '@/server/screen-store'

// What screens exported when last saved: `?screens=closing,tax`.
export async function GET(request: NextRequest) {
  const ids = (request.nextUrl.searchParams.get('screens') ?? '')
    .split(',')
    .filter(isServerScreenId)
  return Response.json(await readExports(ids))
}
