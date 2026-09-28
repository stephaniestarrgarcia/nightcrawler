import { driver } from '@/lib/db'
import { bad, guarded, json } from '@/lib/api'
import { eventSchema, firstError, parseEventDate } from '@/lib/validate'

export const dynamic = 'force-dynamic'

export function POST(req: Request) {
  return guarded(async () => {
    const parsed = eventSchema.safeParse(await req.json())
    if (!parsed.success) return bad(firstError(parsed.error))
    const { day, month } = parseEventDate(parsed.data.date)
    const event = await driver.createEvent({
      day,
      month,
      title: parsed.data.title,
      where: parsed.data.where || 'All rooms',
      location_id: parsed.data.location_id ?? null,
    })
    return json(event, { status: 201 })
  })()
}
