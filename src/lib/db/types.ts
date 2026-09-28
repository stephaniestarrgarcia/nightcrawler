export type ProductKind = 'flower' | 'merch'
export type FlowerType = 'Indica' | 'Sativa' | 'Hybrid' | 'Pre-rolls'
export type Status = 'Available' | 'Sold out' | 'Hidden'
export type Fulfillment = 'pickup' | 'delivery'
/** 0 received · 1 being packed · 2 ready / out for delivery · 3 picked up / delivered */
export type Stage = 0 | 1 | 2 | 3

export interface Location {
  id: string
  name: string
  address: string
  hours: string
  is_open: boolean
  sort: number
}

export interface Product {
  id: string
  kind: ProductKind
  name: string
  type: FlowerType | null
  price_cents: number
  thc: string | null
  weight: string | null
  sizes: string[]
  description: string | null
  photo_url: string | null
  slot: number | null
  /** 0–5, rendered as the star row on the site. */
  rating: number
  reviews: number
  created_at: string
}

/** Per-room availability. One row per (product, location). */
export interface ProductStatus {
  product_id: string
  location_id: string
  status: Status
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string | null
  name: string
  /** Chosen merch size, e.g. "L". Null for one-size items and for flower. */
  size: string | null
  price_cents: number
  qty: number
}

export interface Order {
  id: string
  number: string
  location_id: string
  fulfillment: Fulfillment
  customer_name: string
  phone: string
  email: string | null
  address: string | null
  total_cents: number
  stage: Stage
  seen: boolean
  created_at: string
  items: OrderItem[]
}

export interface EventRow {
  id: string
  day: string
  month: string
  title: string
  where: string
  location_id: string | null
  rsvps: number
  sort: number
}

/** Who is actually coming — the door list behind an event's RSVP count. */
export interface EventGuest {
  id: string
  event_id: string
  name: string
  email: string
  created_at: string
}

export interface Subscriber {
  email: string
  /** Product ids this address asked to be notified about. */
  interest: string[]
  created_at: string
}

/** Everything the customer site renders, for one room. */
export interface PublicState {
  locations: Location[]
  products: (Product & { status: Status })[]
  events: EventRow[]
  version: number
}

/** Everything the admin renders, for one room. */
export interface AdminState {
  locations: Location[]
  products: (Product & { status: Status })[]
  events: EventRow[]
  orders: Order[]
  version: number
}

export interface NewOrderInput {
  location_id: string
  fulfillment: Fulfillment
  customer_name: string
  phone: string
  email: string | null
  address: string | null
  items: { product_id: string | null; name: string; size: string | null; price_cents: number; qty: number }[]
}

export interface ProductPatch {
  name?: string
  type?: FlowerType | null
  price_cents?: number
  thc?: string | null
  weight?: string | null
  sizes?: string[]
  description?: string | null
  photo_url?: string | null
}

export interface LocationPatch {
  hours?: string
  is_open?: boolean
}

/**
 * The whole persistence surface. Two drivers implement it: `local` (a JSON
 * file, the default) and `supabase`. Nothing above this line knows which.
 */
export interface Driver {
  publicState(locationId: string): Promise<PublicState>
  adminState(locationId: string): Promise<AdminState>

  createOrder(input: NewOrderInput): Promise<Order>
  orderByNumber(number: string): Promise<Order | null>
  setOrderStage(id: string, stage: Stage): Promise<Order | null>
  markOrdersSeen(locationId: string): Promise<void>

  createProduct(kind: ProductKind): Promise<Product>
  patchProduct(id: string, patch: ProductPatch): Promise<Product | null>
  deleteProduct(id: string): Promise<void>
  setProductStatus(productId: string, locationId: string, status: Status): Promise<void>

  createEvent(e: {
    day: string
    month: string
    title: string
    where: string
    location_id: string | null
  }): Promise<EventRow>
  deleteEvent(id: string): Promise<void>
  /** Records a guest and returns the event with its updated count. */
  rsvp(id: string, guest: { name: string; email: string }): Promise<EventRow | null>
  eventGuests(id: string): Promise<EventGuest[]>

  patchLocation(id: string, patch: LocationPatch): Promise<Location | null>

  subscribe(email: string, interest: string | null): Promise<void>
  subscribers(): Promise<Subscriber[]>

  uploadPhoto(productId: string, file: File): Promise<string>
  removePhoto(productId: string): Promise<void>
}
