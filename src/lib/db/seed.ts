import type { EventRow, Location, Product, ProductStatus, Status } from './types'

/**
 * The lineup from the design handoff. Used to seed the local JSON store and
 * mirrored by `supabase/schema.sql` so both drivers start from the same shop.
 */
export const locations: Location[] = [
  { id: 'ny', name: 'New York', address: '000 Address TBD\nNew York, NY', hours: '10a — 12a', is_open: true, sort: 1 },
  { id: 'nj', name: 'New Jersey', address: '000 Address TBD\nJersey City, NJ', hours: '10a — 10p', is_open: true, sort: 2 },
  { id: 'la', name: 'Los Angeles', address: '000 Address TBD\nLos Angeles, CA', hours: '9a — 10p', is_open: true, sort: 3 },
  { id: 'valley', name: 'The Valley', address: '000 Address TBD\nSherman Oaks, CA', hours: '10a — 11p', is_open: false, sort: 4 },
]

type SeedProduct = Omit<Product, 'created_at'> & { statuses: Partial<Record<string, Status>>; defaultStatus: Status }

const p = (
  id: string,
  kind: Product['kind'],
  name: string,
  type: Product['type'],
  price_cents: number,
  extra: Partial<Product> & { defaultStatus: Status; statuses?: Partial<Record<string, Status>> },
): SeedProduct => ({
  id,
  kind,
  name,
  type,
  price_cents,
  thc: null,
  weight: null,
  sizes: [],
  description: null,
  photo_url: null,
  slot: null,
  rating: 5,
  reviews: 0,
  statuses: extra.statuses ?? {},
  ...extra,
})

export const products: SeedProduct[] = [
  p('f1', 'flower', 'Velvet Static', 'Indica', 5200, {
    thc: '27.4%', weight: '3.5 g', rating: 5, reviews: 128,
    description: 'Heavy velvet body, static hum in the ears. A midnight-only cultivar.',
    defaultStatus: 'Available',
  }),
  p('f2', 'flower', 'Sodium Halo', 'Sativa', 5400, {
    thc: '29.1%', weight: '3.5 g', rating: 5, reviews: 94,
    description: 'Streetlight glow. Bright citrus lift for long nights in motion.',
    defaultStatus: 'Available',
  }),
  p('f3', 'flower', 'Blue Hour', 'Hybrid', 5000, {
    thc: '25.8%', weight: '3.5 g', rating: 4, reviews: 76,
    description: 'The hour between dusk and dark, in flower form. Balanced, cinematic.',
    defaultStatus: 'Available',
  }),
  p('f4', 'flower', 'Ghost Tiger', 'Sativa', 5800, {
    thc: '30.2%', weight: '3.5 g', rating: 5, reviews: 151,
    description: 'The reserve cut. Feral, electric, unmistakably ours.',
    defaultStatus: 'Sold out',
  }),
  p('f5', 'flower', 'Ink Rose', 'Indica', 4800, {
    thc: '24.6%', weight: '3.5 g', rating: 4, reviews: 63,
    description: 'Rose garden after rain, pressed in black ink. Soft landing.',
    defaultStatus: 'Available',
  }),
  p('f6', 'flower', 'Night Shift', 'Pre-rolls', 3600, {
    thc: '23%', weight: '5 × 0.7 g · assorted', rating: 5, reviews: 210,
    description: 'Five rolled hours of dark. The whole lineup in one tin.',
    defaultStatus: 'Available',
  }),

  p('m1', 'merch', 'Script Tee — washed black', null, 3800, {
    slot: 1, sizes: ['S', 'M', 'L', 'XL'],
    description: 'Heavyweight cotton, vermilion script across the chest.',
    defaultStatus: 'Available',
  }),
  p('m2', 'merch', 'Ghost Tiger Tee — back print', null, 4200, {
    slot: 2, sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    description: 'Tribal tiger back print, small script on front.',
    defaultStatus: 'Sold out',
  }),
  p('m3', 'merch', 'After Dark Cap', null, 3200, {
    slot: 3, description: 'Unstructured six-panel, bone embroidery.',
    defaultStatus: 'Available',
  }),
  p('m4', 'merch', 'Die-cut Sticker Sheet', null, 800, {
    slot: 4, description: 'Eight die-cuts on one sheet. Weatherproof vinyl.',
    defaultStatus: 'Available',
  }),
  p('m5', 'merch', 'Hoodie — vermilion embroidery', null, 8800, {
    slot: 5, sizes: ['S', 'M', 'L', 'XL'],
    description: 'Next drop. 450gsm fleece, chain-stitch script.',
    defaultStatus: 'Hidden',
  }),
  p('m6', 'merch', 'Grinder — engraved Nc', null, 4500, {
    slot: 6, description: 'Four-piece anodised aluminium, engraved monogram.',
    defaultStatus: 'Hidden',
  }),
  p('m7', 'merch', 'Ash Tray — bone ceramic', null, 3600, {
    slot: 7, description: 'Hand-glazed bone ceramic, vermilion underside.',
    defaultStatus: 'Hidden',
  }),
  p('m8', 'merch', 'Lighter Sleeve — leather', null, 2200, {
    slot: 8, description: 'Vegetable-tanned leather, debossed script.',
    defaultStatus: 'Hidden',
  }),
]

export const events: EventRow[] = [
  { id: 'e1', day: '17', month: 'Jul', title: 'Ghost Tiger reserve drop', where: 'New York — doors 8p', location_id: 'ny', rsvps: 84, sort: 1 },
  { id: 'e2', day: '24', month: 'Jul', title: 'Rooftop listening session', where: 'Los Angeles — 9p, RSVP only', location_id: 'la', rsvps: 51, sort: 2 },
  { id: 'e3', day: '02', month: 'Aug', title: 'Ink night — flash tattoos in the shop', where: 'The Valley — 7p', location_id: 'valley', rsvps: 129, sort: 3 },
  { id: 'e4', day: '15', month: 'Aug', title: 'Harvest preview: fall cultivars', where: 'All rooms — all day', location_id: null, rsvps: 0, sort: 4 },
]

/** One status row per (product, room), so rooms can diverge from day one. */
export function seedStatuses(): ProductStatus[] {
  const rows: ProductStatus[] = []
  for (const prod of products) {
    for (const loc of locations) {
      rows.push({
        product_id: prod.id,
        location_id: loc.id,
        status: prod.statuses[loc.id] ?? prod.defaultStatus,
      })
    }
  }
  return rows
}
