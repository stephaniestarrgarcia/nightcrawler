import { driver } from '@/lib/db'
import { bad, guarded, json } from '@/lib/api'
import { firstError, productPatchSchema } from '@/lib/validate'

export const dynamic = 'force-dynamic'

export function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return guarded(async () => {
    const { id } = await ctx.params
    const parsed = productPatchSchema.safeParse(await req.json())
    if (!parsed.success) return bad(firstError(parsed.error))
    const product = await driver.patchProduct(id, parsed.data)
    if (!product) return bad('No such product', 404)
    return json(product)
  })()
}

export function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return guarded(async () => {
    const { id } = await ctx.params
    await driver.deleteProduct(id)
    return json({ ok: true })
  })()
}
