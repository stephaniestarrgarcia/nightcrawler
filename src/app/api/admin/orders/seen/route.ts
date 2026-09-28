import { driver } from '@/lib/db'
import { guarded, json } from '@/lib/api'

export const dynamic = 'force-dynamic'

/** Clears the "fresh order" pulse once staff have actually had the queue open. */
export function POST(req: Request) {
  return guarded(async () => {
    const location = new URL(req.url).searchParams.get('location') || 'ny'
    await driver.markOrdersSeen(location)
    return json({ ok: true })
  })()
}
