import { driver } from '@/lib/db'
import { bad, guarded, json } from '@/lib/api'

export const dynamic = 'force-dynamic'

const STATUSES = ['Available', 'Sold out', 'Hidden'] as const

/** Status is per room — this only ever touches the room that was passed in. */
export function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return guarded(async () => {
    const { id } = await ctx.params
    const body = (await req.json()) as { location_id?: string; status?: string }
    if (!body.location_id) return bad('Which room?')
    const status = STATUSES.find(s => s === body.status)
    if (!status) return bad('status must be Available, Sold out or Hidden')
    await driver.setProductStatus(id, body.location_id, status)
    return json({ ok: true })
  })()
}
