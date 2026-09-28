import { driver } from '@/lib/db'
import { handled, stateResponse } from '@/lib/api'

export const dynamic = 'force-dynamic'

export function GET(req: Request) {
  const url = new URL(req.url)
  const location = url.searchParams.get('location') || 'ny'
  return handled(async () => stateResponse(await driver.publicState(location), url.searchParams.get('since')))()
}
