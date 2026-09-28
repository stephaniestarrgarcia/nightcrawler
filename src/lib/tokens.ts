/**
 * Nightcrawler design tokens — taken verbatim from the handoff.
 * Border radius is 0 everywhere; there are no shadows outside the hero glow.
 */
export const c = {
  bg: '#0e0b09',        // Black Coffee
  card: '#17120f',      // Card / nav / drawer
  hairline: '#241b15',  // Dividers, card borders
  umber: '#3a2620',     // Input + button borders, inactive bars
  cigar: '#8f5a4a',     // Eyebrow labels, Indica badge, delivery badge
  accent: '#e8382f',    // Vermilion
  bone: '#ece9df',      // Primary text
  boneMuted: '#b5aea2', // Body copy
  ash: '#8a857a',       // Secondary text
  ashDim: '#5c554c',    // Tertiary text, helper copy
  live: '#7dc98f',      // "Available" / "Open" only
  cardActive: '#1d1512',
} as const

/** Badge fill per flower type. Badge text is always `c.card`. */
export const typeBg: Record<string, string> = {
  Indica: c.cigar,
  Sativa: c.bone,
  Hybrid: c.accent,
  'Pre-rolls': c.boneMuted,
}

export const display = "'Pinyon Script', cursive"
export const sans = "'Space Grotesk', sans-serif"
