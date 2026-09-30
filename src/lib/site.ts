/**
 * The site's own public address, from NEXT_PUBLIC_SITE_URL.
 *
 * This is what tracker links are built from — the ones staff hand to customers
 * — so it has to survive however the value gets typed into the host's
 * environment settings: with or without a trailing slash, with or without a
 * scheme.
 */
export function siteUrl(fallback = ''): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (!raw) return fallback
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  return withScheme.replace(/\/+$/, '')
}

/** The customer-facing link for an order, proved by the last 4 of their phone. */
export function trackerUrl(origin: string, orderNumber: string, phone: string): string {
  return `${origin}/track/${orderNumber}?p=${phone.replace(/\D/g, '').slice(-4)}`
}
