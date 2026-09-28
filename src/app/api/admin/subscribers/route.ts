import { driver } from '@/lib/db'
import { guarded, json } from '@/lib/api'

export const dynamic = 'force-dynamic'

/**
 * The list, with every "notify me" interest resolved to a product name so the
 * admin shows who is waiting on which drop rather than a column of ids.
 */
export function GET() {
  return guarded(async () => {
    const [subscribers, state] = await Promise.all([
      driver.subscribers(),
      driver.adminState('ny'),
    ])
    const nameOf = new Map(state.products.map(p => [p.id, p.name]))
    return json({
      subscribers: subscribers.map(s => ({
        email: s.email,
        created_at: s.created_at,
        waitingFor: s.interest.map(id => nameOf.get(id) ?? 'a removed product'),
      })),
    })
  })()
}
