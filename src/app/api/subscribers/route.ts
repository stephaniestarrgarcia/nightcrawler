import { driver } from '@/lib/db'
import { bad, handled, json } from '@/lib/api'
import { firstError, subscribeSchema } from '@/lib/validate'

export const dynamic = 'force-dynamic'

export function POST(req: Request) {
  return handled(async () => {
    const parsed = subscribeSchema.safeParse(await req.json())
    if (!parsed.success) return bad(firstError(parsed.error))
    await driver.subscribe(parsed.data.email, parsed.data.interest ?? null)
    return json({ ok: true })
  })()
}
