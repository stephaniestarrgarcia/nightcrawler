import { driver } from '@/lib/db'
import { bad, handled, json } from '@/lib/api'
import { notifyOrderPlaced } from '@/lib/notify'
import { firstError, orderSchema, toE164 } from '@/lib/validate'

export const dynamic = 'force-dynamic'

export function POST(req: Request) {
  return handled(async () => {
    const parsed = orderSchema.safeParse(await req.json())
    if (!parsed.success) return bad(firstError(parsed.error))
    const input = parsed.data

    // Prices come from the database, never from the client's bag.
    const state = await driver.publicState(input.location_id)
    const room = state.locations.find(l => l.id === input.location_id)
    if (!room) return bad('That room does not exist')
    if (!room.is_open) return bad(`${room.name} is closed tonight`)

    const items = []
    for (const line of input.items) {
      const product = line.product_id ? state.products.find(p => p.id === line.product_id) : undefined
      if (!product) return bad(`${line.name} is no longer on the menu`)
      if (product.status !== 'Available') return bad(`${product.name} just sold out`)

      // Sizes are authoritative here too: an item that comes in sizes must
      // carry one the shop actually stocks, or staff cannot pick it.
      let size: string | null = null
      if (product.sizes.length > 0) {
        const chosen = product.sizes.find(s => s === line.size)
        if (!chosen) return bad(`Pick a size for ${product.name}`)
        size = chosen
      }

      items.push({
        product_id: product.id,
        name: product.name,
        size,
        price_cents: product.price_cents,
        qty: line.qty,
      })
    }

    const order = await driver.createOrder({
      location_id: input.location_id,
      fulfillment: input.fulfillment,
      customer_name: input.customer_name,
      phone: toE164(input.phone),
      email: input.email || null,
      address: input.fulfillment === 'delivery' ? input.address || null : null,
      items,
    })

    notifyOrderPlaced(order, room.name)
    return json(order, { status: 201 })
  })()
}
