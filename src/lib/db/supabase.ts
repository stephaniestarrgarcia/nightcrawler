import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type {
  AdminState, Driver, EventGuest, EventRow, Location, LocationPatch, NewOrderInput,
  Order, Product, ProductKind, ProductPatch, PublicState, Stage, Status, Subscriber,
} from './types'

/**
 * Production driver. Every call goes through the service-role key from a
 * server-only module, so RLS in `supabase/schema.sql` is the second line of
 * defence rather than the only one.
 */

let client: SupabaseClient | null = null

function db(): SupabaseClient {
  if (client) return client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase driver selected but NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are unset')
  client = createClient(url, key, { auth: { persistSession: false } })
  return client
}

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'products'

function unwrap<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`)
  if (res.data === null) throw new Error(`${what}: no rows returned`)
  return res.data
}

/** A single counter bumped by triggers on every table — cheap change detection. */
async function version(): Promise<number> {
  const { data } = await db().from('meta').select('value').eq('key', 'version').maybeSingle()
  return Number(data?.value ?? 0)
}

type ProductRow = Product
type StatusRow = { product_id: string; location_id: string; status: Status }

async function productsFor(locationId: string): Promise<(Product & { status: Status })[]> {
  const products = unwrap(await db().from('products').select('*').order('kind').order('slot', { nullsFirst: false }).order('created_at'), 'load products') as ProductRow[]
  const statuses = unwrap(await db().from('product_status').select('*').eq('location_id', locationId), 'load statuses') as StatusRow[]
  return products.map(p => ({
    ...p,
    sizes: p.sizes ?? [],
    status: statuses.find(s => s.product_id === p.id)?.status ?? 'Hidden',
  }))
}

async function ordersWithItems(locationId: string): Promise<Order[]> {
  const rows = unwrap(
    await db().from('orders').select('*, items:order_items(*)').eq('location_id', locationId).order('created_at', { ascending: false }).limit(200),
    'load orders',
  ) as Order[]
  return rows.map(o => ({ ...o, items: o.items ?? [] }))
}

export const supabaseDriver: Driver = {
  async publicState(locationId): Promise<PublicState> {
    const [locations, products, events, v] = await Promise.all([
      db().from('locations').select('*').order('sort'),
      productsFor(locationId),
      db().from('events').select('*').order('sort'),
      version(),
    ])
    return {
      locations: unwrap(locations, 'load locations') as Location[],
      products: products.filter(p => p.status !== 'Hidden'),
      events: unwrap(events, 'load events') as EventRow[],
      version: v,
    }
  },

  async adminState(locationId): Promise<AdminState> {
    const [locations, products, events, orders, v] = await Promise.all([
      db().from('locations').select('*').order('sort'),
      productsFor(locationId),
      db().from('events').select('*').order('sort'),
      ordersWithItems(locationId),
      version(),
    ])
    return {
      locations: unwrap(locations, 'load locations') as Location[],
      products,
      events: unwrap(events, 'load events') as EventRow[],
      orders,
      version: v,
    }
  },

  async createOrder(input: NewOrderInput): Promise<Order> {
    const number = unwrap(await db().rpc('next_order_number'), 'allocate order number') as unknown as string
    const total_cents = input.items.reduce((t, i) => t + i.price_cents * i.qty, 0)
    const order = unwrap(
      await db().from('orders').insert({
        number,
        location_id: input.location_id,
        fulfillment: input.fulfillment,
        customer_name: input.customer_name,
        phone: input.phone,
        email: input.email,
        address: input.address,
        total_cents,
      }).select().single(),
      'create order',
    ) as Order

    const items = unwrap(
      await db().from('order_items').insert(
        input.items.map(i => ({ order_id: order.id, ...i })),
      ).select(),
      'create order items',
    ) as Order['items']

    return { ...order, items }
  },

  async orderByNumber(number) {
    const { data, error } = await db().from('orders').select('*, items:order_items(*)').eq('number', number).maybeSingle()
    if (error) throw new Error(`load order: ${error.message}`)
    return data ? { ...(data as Order), items: (data as Order).items ?? [] } : null
  },

  async setOrderStage(id, stage: Stage) {
    const { data, error } = await db().from('orders').update({ stage, seen: true }).eq('id', id).select('*, items:order_items(*)').maybeSingle()
    if (error) throw new Error(`advance order: ${error.message}`)
    return data ? { ...(data as Order), items: (data as Order).items ?? [] } : null
  },

  async markOrdersSeen(locationId) {
    const { error } = await db().from('orders').update({ seen: true }).eq('location_id', locationId).eq('seen', false)
    if (error) throw new Error(`mark seen: ${error.message}`)
  },

  async createProduct(kind: ProductKind): Promise<Product> {
    const isFlower = kind === 'flower'
    let slot: number | null = null
    if (!isFlower) {
      const { count } = await db().from('products').select('id', { count: 'exact', head: true }).eq('kind', 'merch')
      slot = (count ?? 0) + 1
    }
    const product = unwrap(
      await db().from('products').insert({
        kind,
        name: isFlower ? 'New strain' : 'New item',
        type: isFlower ? 'Hybrid' : null,
        price_cents: isFlower ? 5000 : 0,
        weight: isFlower ? '3.5 g' : null,
        sizes: [],
        slot,
      }).select().single(),
      'create product',
    ) as Product

    const locations = unwrap(await db().from('locations').select('id'), 'load locations') as { id: string }[]
    // New products start Hidden in every room — nothing goes live by accident.
    const { error } = await db().from('product_status').insert(
      locations.map(l => ({ product_id: product.id, location_id: l.id, status: 'Hidden' })),
    )
    if (error) throw new Error(`seed statuses: ${error.message}`)
    return { ...product, sizes: product.sizes ?? [] }
  },

  async patchProduct(id, patch: ProductPatch) {
    const { data, error } = await db().from('products').update(patch).eq('id', id).select().maybeSingle()
    if (error) throw new Error(`update product: ${error.message}`)
    return data as Product | null
  },

  async deleteProduct(id) {
    const { error } = await db().from('products').delete().eq('id', id)
    if (error) throw new Error(`delete product: ${error.message}`)
  },

  async setProductStatus(product_id, location_id, status: Status) {
    const { error } = await db().from('product_status').upsert({ product_id, location_id, status }, { onConflict: 'product_id,location_id' })
    if (error) throw new Error(`set status: ${error.message}`)
  },

  async createEvent(e) {
    const { data: maxRow } = await db().from('events').select('sort').order('sort', { ascending: false }).limit(1).maybeSingle()
    return unwrap(
      await db().from('events').insert({ ...e, sort: (maxRow?.sort ?? 0) + 1 }).select().single(),
      'create event',
    ) as EventRow
  },

  async deleteEvent(id) {
    // event_rsvps cascades on delete.
    const { error } = await db().from('events').delete().eq('id', id)
    if (error) throw new Error(`delete event: ${error.message}`)
  },

  async rsvp(id, guest) {
    const { data, error } = await db().rpc('rsvp_event', {
      p_id: id,
      p_name: guest.name,
      p_email: guest.email.toLowerCase(),
    })
    if (error) throw new Error(`rsvp: ${error.message}`)
    return (data as EventRow[] | null)?.[0] ?? null
  },

  async eventGuests(id) {
    return unwrap(
      await db().from('event_rsvps').select('*').eq('event_id', id).order('created_at', { ascending: false }),
      'load guests',
    ) as EventGuest[]
  },

  async patchLocation(id, patch: LocationPatch) {
    const { data, error } = await db().from('locations').update(patch).eq('id', id).select().maybeSingle()
    if (error) throw new Error(`update location: ${error.message}`)
    return data as Location | null
  },

  async subscribe(email, interest) {
    const { error } = await db().rpc('add_subscriber', { p_email: email, p_interest: interest })
    if (error) throw new Error(`subscribe: ${error.message}`)
  },

  async subscribers() {
    return unwrap(
      await db().from('subscribers').select('*').order('created_at', { ascending: false }).limit(1000),
      'load subscribers',
    ) as Subscriber[]
  },

  async uploadPhoto(productId, file) {
    const ext = (file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
    const key = `${productId}/${Date.now()}.${ext}`
    const { error } = await db().storage.from(BUCKET).upload(key, await file.arrayBuffer(), {
      contentType: file.type || 'image/jpeg',
      upsert: true,
    })
    if (error) throw new Error(`upload photo: ${error.message}`)
    return db().storage.from(BUCKET).getPublicUrl(key).data.publicUrl
  },

  async removePhoto(productId) {
    const { data } = await db().from('products').select('photo_url').eq('id', productId).maybeSingle()
    const { error } = await db().from('products').update({ photo_url: null }).eq('id', productId)
    if (error) throw new Error(`remove photo: ${error.message}`)

    // Best effort: an object that is already gone must not fail the edit.
    const url = (data as { photo_url: string | null } | null)?.photo_url
    const marker = `/storage/v1/object/public/${BUCKET}/`
    if (url?.includes(marker)) {
      await db().storage.from(BUCKET).remove([url.split(marker)[1]])
    }
  },
}
