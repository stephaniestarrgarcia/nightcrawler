import { driver } from '@/lib/db'
import { bad, handled, json } from '@/lib/api'
import { firstError, rsvpSchema } from '@/lib/validate'

export const dynamic = 'force-dynamic'

/** A free RSVP, but a named one — the count is only useful with a door list. */
export function POST(req: Request) {
  return handled(async () => {
    const parsed = rsvpSchema.safeParse(await req.json())
    if (!parsed.success) return bad(firstError(parsed.error))
    const { id, name, email } = parsed.data
    const event = await driver.rsvp(id, { name, email })
    if (!event) return bad('That event is no longer listed', 404)
    return json(event)
  })()
}
