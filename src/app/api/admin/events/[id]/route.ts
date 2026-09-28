import { driver } from '@/lib/db'
import { guarded, json } from '@/lib/api'

export const dynamic = 'force-dynamic'

export function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return guarded(async () => {
    const { id } = await ctx.params
    await driver.deleteEvent(id)
    return json({ ok: true })
  })()
}
