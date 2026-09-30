import { z } from 'zod'

const digits = (s: string) => s.replace(/\D/g, '')

export const phoneSchema = z
  .string()
  .trim()
  .refine(v => digits(v).length >= 10, 'Enter a phone number with at least 10 digits')

/** Best-effort E.164 for Twilio. Assumes +1 for bare 10-digit US numbers. */
export function toE164(input: string): string {
  const d = digits(input)
  if (input.trim().startsWith('+')) return `+${d}`
  if (d.length === 10) return `+1${d}`
  if (d.length === 11 && d.startsWith('1')) return `+${d}`
  return `+${d}`
}

/** E.164 back to something readable for staff: +15552223344 → (555) 222-3344 */
export function formatPhone(e164: string): string {
  const d = e164.replace(/\D/g, '')
  const local = d.length === 11 && d.startsWith('1') ? d.slice(1) : d
  if (local.length !== 10) return e164
  return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`
}

export const orderSchema = z
  .object({
    location_id: z.string().min(1),
    fulfillment: z.enum(['pickup', 'delivery']),
    customer_name: z.string().trim().min(1, 'Name is required').max(120),
    phone: phoneSchema,
    email: z.string().trim().email('That email does not look right').optional().or(z.literal('')),
    address: z.string().trim().max(400).optional().or(z.literal('')),
    aged: z.literal(true, { errorMap: () => ({ message: '21+ confirmation is required' }) }),
    items: z
      .array(
        z.object({
          product_id: z.string().nullable(),
          name: z.string().min(1),
          size: z.string().trim().max(20).nullable().optional(),
          price_cents: z.number().int().nonnegative(),
          qty: z.number().int().positive().max(99),
        }),
      )
      .min(1, 'Your bag is empty'),
  })
  .refine(o => o.fulfillment !== 'delivery' || Boolean(o.address?.trim()), {
    message: 'A delivery address is required',
    path: ['address'],
  })

export const productPatchSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120).optional(),
  type: z.enum(['Indica', 'Sativa', 'Hybrid', 'Pre-rolls']).nullable().optional(),
  price_cents: z.number().int().nonnegative().optional(),
  thc: z.string().trim().max(40).nullable().optional(),
  weight: z.string().trim().max(60).nullable().optional(),
  sizes: z.array(z.string().trim().min(1)).max(20).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  photo_url: z.string().trim().max(1000).nullable().optional(),
})

export const eventSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(160),
  date: z.string().trim().max(40),
  where: z.string().trim().max(160),
  location_id: z.string().trim().min(1).nullable().optional(),
})

export const rsvpSchema = z.object({
  id: z.string().min(1),
  // required_error too: a missing field otherwise reports a bare "Required".
  name: z.string({ required_error: 'Name is required' }).trim().min(1, 'Name is required').max(120),
  email: z
    .string({ required_error: 'An email is required' })
    .trim()
    .email('That email does not look right'),
})

/** "22 Aug" → { day: "22", month: "Aug" }. Tolerates "2 aug", "22/8" and blanks. */
export function parseEventDate(input: string): { day: string; month: string } {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const match = input.trim().match(/^(\d{1,2})\s*[ /-]\s*(\w+)$/)
  if (!match) return { day: '—', month: '' }
  const day = match[1].padStart(2, '0')
  const token = match[2].toLowerCase()
  const byName = months.find(m => m.toLowerCase().startsWith(token.slice(0, 3)))
  const byNumber = /^\d+$/.test(token) ? months[Number(token) - 1] : undefined
  return { day, month: byName ?? byNumber ?? '' }
}

export const subscribeSchema = z.object({
  email: z.string().trim().email('That email does not look right'),
  interest: z.string().trim().max(120).nullable().optional(),
})

export const pinSchema = z.object({ pin: z.string().regex(/^\d{4}$/, 'PIN must be 4 digits') })

export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'That request was not valid'
}
