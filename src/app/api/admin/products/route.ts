import { driver } from '@/lib/db'
import { bad, guarded, json } from '@/lib/api'

export const dynamic = 'force-dynamic'

export function POST(req: Request) {
  return guarded(async () => {
    const { kind } = (await req.json()) as { kind?: string }
    if (kind !== 'flower' && kind !== 'merch') return bad('kind must be flower or merch')
    return json(await driver.createProduct(kind), { status: 201 })
  })()
}
