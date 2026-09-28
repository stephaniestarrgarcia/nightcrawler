import { driver } from '@/lib/db'
import { bad, handled, json } from '@/lib/api'

export const dynamic = 'force-dynamic'

/**
 * The tracker's read endpoint. An order number alone is guessable, so the last
 * four digits of the phone on the order are required alongside it.
 */
export function GET(req: Request, ctx: { params: Promise<{ number: string }> }) {
  return handled(async () => {
    const { number } = await ctx.params
    const proof = new URL(req.url).searchParams.get('p') ?? ''
    const order = await driver.orderByNumber(number.toUpperCase())
    if (!order) return bad('No order with that number', 404)
    if (order.phone.replace(/\D/g, '').slice(-4) !== proof.replace(/\D/g, '').slice(-4)) {
      return bad('That order number and phone do not match', 403)
    }
    return json({
      number: order.number,
      fulfillment: order.fulfillment,
      stage: order.stage,
      total_cents: order.total_cents,
      location_id: order.location_id,
      address: order.address,
      items: order.items.map(i => ({ name: i.name, size: i.size, qty: i.qty, price_cents: i.price_cents })),
    })
  })()
}
