/** Prices are integer cents everywhere; only these two functions cross over. */

export function formatPrice(cents: number): string {
  const whole = cents % 100 === 0
  return `$${(cents / 100).toFixed(whole ? 0 : 2)}`
}

/** Accepts "$52", "52.50", "  $1,208 " → cents. Returns null if unparseable. */
export function parsePrice(input: string): number | null {
  const cleaned = input.replace(/[^0-9.]/g, '')
  if (!cleaned || !/^\d*\.?\d*$/.test(cleaned)) return null
  const value = Number(cleaned)
  if (!Number.isFinite(value) || value < 0) return null
  return Math.round(value * 100)
}
