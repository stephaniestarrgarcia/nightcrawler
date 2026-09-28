import { driver } from '@/lib/db'
import { bad, guarded, json } from '@/lib/api'
import { z } from 'zod'
import { firstError } from '@/lib/validate'

export const dynamic = 'force-dynamic'

const schema = z.object({
  hours: z.string().trim().max(60).optional(),
  is_open: z.boolean().optional(),
})

export function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return guarded(async () => {
    const { id } = await ctx.params
    const parsed = schema.safeParse(await req.json())
    if (!parsed.success) return bad(firstError(parsed.error))
    const location = await driver.patchLocation(id, parsed.data)
    if (!location) return bad('No such room', 404)
    return json(location)
  })()
}
