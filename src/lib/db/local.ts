import { promises as fs } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import * as seed from './seed'
import type {
  AdminState, Driver, EventGuest, EventRow, Location, LocationPatch, NewOrderInput,
  Order, Product, ProductKind, ProductPatch, ProductStatus, PublicState, Stage,
  Status, Subscriber,
} from './types'

/**
 * Zero-config driver: the whole shop in one JSON file under `.data/`.
 * It exists so the app runs — and can be demoed end to end — before anyone
 * has provisioned Supabase. Single-process only; see `supabase.ts` for prod.
 */

interface Shape {
  version: number
  orderSeq: number
  locations: Location[]
  products: Product[]
  statuses: ProductStatus[]
  orders: Order[]
  events: EventRow[]
  guests: EventGuest[]
  subscribers: Subscriber[]
}

const FILE = path.join(process.cwd(), '.data', 'nightcrawler.json')

function initial(): Shape {
  const now = Date.now()
  const products: Product[] = seed.products.map(({ statuses, defaultStatus, ...rest }) => ({
    ...rest,
    created_at: new Date(now).toISOString(),
  }))

  const demoOrder = (
    number: string, who: string, minutesAgo: number, fulfillment: Order['fulfillment'],
    stage: Stage, fresh: boolean, items: [string, number][],
  ): Order => {
    const id = randomUUID()
    return {
      id,
      number,
      location_id: 'ny',
      fulfillment,
      customer_name: who,
      phone: '+15550000000',
      email: null,
      address: fulfillment === 'delivery' ? '000 Address TBD, New York, NY' : null,
      total_cents: items.reduce((t, [, cents]) => t + cents, 0),
      stage,
      seen: !fresh,
      created_at: new Date(now - minutesAgo * 60_000).toISOString(),
      items: items.map(([name, price_cents]) => ({
        id: randomUUID(), order_id: id, product_id: null, name, size: null, price_cents, qty: 1,
      })),
    }
  }

  return {
    version: 1,
    orderSeq: 4313,
    locations: seed.locations.map(l => ({ ...l })),
    products,
    statuses: seed.seedStatuses(),
    events: seed.events.map(e => ({ ...e })),
    guests: [],
    subscribers: [],
    // Three orders so the admin queue is demonstrable on a cold start.
    orders: [
      demoOrder('NC-4312', 'Marisol R.', 2, 'pickup', 0, true, [['Velvet Static — Indica', 5200], ['Sodium Halo — Sativa', 5400]]),
      demoOrder('NC-4311', 'Dre W.', 18, 'delivery', 1, false, [['Night Shift — Pre-rolls', 3600], ['Ghost Tiger — Sativa', 5800]]),
      demoOrder('NC-4309', 'Kat V.', 60, 'pickup', 3, false, [['Script Tee — washed black', 3800], ['After Dark Cap', 3200], ['Die-cut Sticker Sheet', 800]]),
    ],
  }
}

let cache: Shape | null = null
/** Serialises read-modify-write so concurrent requests can't clobber the file. */
let chain: Promise<unknown> = Promise.resolve()

/** Temp file + rename, so a reader never observes a half-written store. */
async function persist(db: Shape): Promise<void> {
  await fs.mkdir(path.dirname(FILE), { recursive: true })
  const tmp = `${FILE}.${process.pid}.tmp`
  await fs.writeFile(tmp, JSON.stringify(db, null, 2))
  await fs.rename(tmp, FILE)
}

async function load(): Promise<Shape> {
  if (cache) return cache

  let raw: string
  try {
    raw = await fs.readFile(FILE, 'utf8')
  } catch (err) {
    // Only a genuinely absent file means "new shop". Anything else — a
    // permission problem, a bad mount — must not be answered by seeding.
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
    cache = initial()
    await persist(cache)
    return cache
  }

  try {
    cache = JSON.parse(raw) as Shape
  } catch {
    // Refuse rather than reseed: overwriting a corrupt store would throw away
    // every order in it. Deleting .data is a decision for a human to make.
    throw new Error(
      `${FILE} is not readable JSON. Inspect it, or delete .data/ to start from the seed lineup.`,
    )
  }
  return cache
}

async function read<T>(fn: (db: Shape) => T): Promise<T> {
  const run = chain.then(async () => fn(await load()))
  chain = run.catch(() => {})
  return run
}

/** Every mutation bumps `version`; clients poll it to know something moved. */
async function write<T>(fn: (db: Shape) => T): Promise<T> {
  const run = chain.then(async () => {
    const db = await load()
    const out = fn(db)
    db.version++
    await persist(db)
    return out
  })
  chain = run.catch(() => {})
  return run
}

function withStatus(db: Shape, locationId: string) {
  return db.products.map(p => ({
    ...p,
    status: db.statuses.find(s => s.product_id === p.id && s.location_id === locationId)?.status ?? 'Hidden',
  }))
}

function sortProducts<T extends Product>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'flower' ? -1 : 1
    if (a.kind === 'merch') return (a.slot ?? 99) - (b.slot ?? 99)
    return a.created_at.localeCompare(b.created_at)
  })
}

export const localDriver: Driver = {
  async publicState(locationId): Promise<PublicState> {
    return read(db => ({
      locations: [...db.locations].sort((a, b) => a.sort - b.sort),
      // Hidden products never leave the server.
      products: sortProducts(withStatus(db, locationId)).filter(p => p.status !== 'Hidden'),
      events: [...db.events].sort((a, b) => a.sort - b.sort),
      version: db.version,
    }))
  },

  async adminState(locationId): Promise<AdminState> {
    return read(db => ({
      locations: [...db.locations].sort((a, b) => a.sort - b.sort),
      products: sortProducts(withStatus(db, locationId)),
      events: [...db.events].sort((a, b) => a.sort - b.sort),
      orders: db.orders
        .filter(o => o.location_id === locationId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
      version: db.version,
    }))
  },

  async createOrder(input: NewOrderInput): Promise<Order> {
    return write(db => {
      const id = randomUUID()
      const order: Order = {
        id,
        number: `NC-${db.orderSeq++}`,
        location_id: input.location_id,
        fulfillment: input.fulfillment,
        customer_name: input.customer_name,
        phone: input.phone,
        email: input.email,
        address: input.address,
        total_cents: input.items.reduce((t, i) => t + i.price_cents * i.qty, 0),
        stage: 0,
        seen: false,
        created_at: new Date().toISOString(),
        items: input.items.map(i => ({ id: randomUUID(), order_id: id, ...i })),
      }
      db.orders.push(order)
      return order
    })
  },

  async orderByNumber(number) {
    return read(db => db.orders.find(o => o.number === number) ?? null)
  },

  async setOrderStage(id, stage) {
    return write(db => {
      const o = db.orders.find(x => x.id === id)
      if (!o) return null
      o.stage = stage
      o.seen = true
      return o
    })
  },

  async markOrdersSeen(locationId) {
    await write(db => {
      for (const o of db.orders) if (o.location_id === locationId) o.seen = true
    })
  },

  async createProduct(kind: ProductKind): Promise<Product> {
    return write(db => {
      const isFlower = kind === 'flower'
      const product: Product = {
        id: randomUUID(),
        kind,
        name: isFlower ? 'New strain' : 'New item',
        type: isFlower ? 'Hybrid' : null,
        price_cents: isFlower ? 5000 : 0,
        thc: null,
        weight: isFlower ? '3.5 g' : null,
        sizes: [],
        description: null,
        photo_url: null,
        slot: isFlower ? null : db.products.filter(p => p.kind === 'merch').length + 1,
        rating: 5,
        reviews: 0,
        created_at: new Date().toISOString(),
      }
      db.products.push(product)
      // New products start Hidden in every room — nothing goes live by accident.
      for (const loc of db.locations) {
        db.statuses.push({ product_id: product.id, location_id: loc.id, status: 'Hidden' })
      }
      return product
    })
  },

  async patchProduct(id, patch: ProductPatch) {
    return write(db => {
      const p = db.products.find(x => x.id === id)
      if (!p) return null
      Object.assign(p, patch)
      return p
    })
  },

  async deleteProduct(id) {
    await write(db => {
      db.products = db.products.filter(p => p.id !== id)
      db.statuses = db.statuses.filter(s => s.product_id !== id)
    })
  },

  async setProductStatus(productId, locationId, status: Status) {
    await write(db => {
      const row = db.statuses.find(s => s.product_id === productId && s.location_id === locationId)
      if (row) row.status = status
      else db.statuses.push({ product_id: productId, location_id: locationId, status })
    })
  },

  async createEvent(e) {
    return write(db => {
      const row: EventRow = {
        id: randomUUID(),
        day: e.day,
        month: e.month,
        title: e.title,
        where: e.where,
        location_id: e.location_id,
        rsvps: 0,
        sort: Math.max(0, ...db.events.map(x => x.sort)) + 1,
      }
      db.events.push(row)
      return row
    })
  },

  async deleteEvent(id) {
    await write(db => {
      db.events = db.events.filter(e => e.id !== id)
      db.guests = db.guests.filter(g => g.event_id !== id)
    })
  },

  async rsvp(id, guest) {
    return write(db => {
      const e = db.events.find(x => x.id === id)
      if (!e) return null
      const email = guest.email.toLowerCase()
      // One seat per address — a second RSVP updates the name, not the count.
      const existing = db.guests.find(g => g.event_id === id && g.email === email)
      if (existing) {
        existing.name = guest.name
        return e
      }
      db.guests.push({
        id: randomUUID(),
        event_id: id,
        name: guest.name,
        email,
        created_at: new Date().toISOString(),
      })
      e.rsvps++
      return e
    })
  },

  async eventGuests(id) {
    return read(db =>
      db.guests
        .filter(g => g.event_id === id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    )
  },

  async patchLocation(id, patch: LocationPatch) {
    return write(db => {
      const l = db.locations.find(x => x.id === id)
      if (!l) return null
      Object.assign(l, patch)
      return l
    })
  },

  async subscribe(email, interest) {
    await write(db => {
      const existing = db.subscribers.find(s => s.email === email)
      if (existing) {
        if (interest && !existing.interest.includes(interest)) existing.interest.push(interest)
        return
      }
      db.subscribers.push({
        email,
        interest: interest ? [interest] : [],
        created_at: new Date().toISOString(),
      })
    })
  },

  async subscribers() {
    return read(db =>
      [...db.subscribers].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    )
  },

  async uploadPhoto(productId, file) {
    const ext = (file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
    const name = `${productId}-${Date.now()}.${ext}`
    const dir = path.join(process.cwd(), 'public', 'uploads')
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()))
    return `/uploads/${name}`
  },

  async removePhoto(productId) {
    const current = await read(db => db.products.find(p => p.id === productId)?.photo_url ?? null)
    await write(db => {
      const p = db.products.find(x => x.id === productId)
      if (p) p.photo_url = null
    })
    // Best effort: a missing file must not fail the edit.
    if (current?.startsWith('/uploads/')) {
      await fs.rm(path.join(process.cwd(), 'public', current), { force: true }).catch(() => {})
    }
  },
}
