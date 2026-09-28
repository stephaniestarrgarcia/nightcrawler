import { driver } from '@/lib/db'
import { bad, guarded, json } from '@/lib/api'
import { notifyStageChanged } from '@/lib/notify'
import { isStage } from '@/lib/stages'

export const dynamic = 'force-dynamic'

/** Advancing an order here is what moves the customer's tracker. */
export function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return guarded(async () => {
    const { id } = await ctx.params
    const body = (await req.json()) as { stage?: unknown }
    if (!isStage(body.stage)) return bad('Stage must be 0–3')

    const current = await driver.setOrderStage(id, body.stage)
    if (!current) return bad('No such order', 404)

    notifyStageChanged(current, body.stage)
    return json(current)
  })()
}
