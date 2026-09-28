import { driver } from '@/lib/db'
import { guarded, stateResponse } from '@/lib/api'

export const dynamic = 'force-dynamic'

export function GET(req: Request) {
  const url = new URL(req.url)
  const location = url.searchParams.get('location') || 'ny'
  return guarded(async () => stateResponse(await driver.adminState(location), url.searchParams.get('since')))()
}
