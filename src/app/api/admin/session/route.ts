import { bad, handled, json } from '@/lib/api'
import { endSession, pinIsValid, requireSession, startSession } from '@/lib/session'
import { firstError, pinSchema } from '@/lib/validate'

export const dynamic = 'force-dynamic'

/** Is this browser still unlocked? Also slides the 15-minute idle window. */
export function GET() {
  return handled(async () => json({ unlocked: await requireSession() }))()
}

export function POST(req: Request) {
  return handled(async () => {
    const parsed = pinSchema.safeParse(await req.json())
    if (!parsed.success) return bad(firstError(parsed.error))
    if (!pinIsValid(parsed.data.pin)) return bad('That PIN is not recognised', 401)
    await startSession()
    return json({ unlocked: true })
  })()
}

export function DELETE() {
  return handled(async () => {
    await endSession()
    return json({ unlocked: false })
  })()
}
