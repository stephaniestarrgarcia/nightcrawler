import { c } from '@/lib/tokens'

/** Five glyphs, filled to `rating`. The count sits beside them in ash-dim. */
export function Stars({ rating, reviews }: { rating: number; reviews: number }) {
  const filled = Math.round(rating)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span
        aria-label={`${filled} out of 5 stars`}
        style={{ color: c.accent, fontSize: 13, letterSpacing: 2 }}
      >
        {'★'.repeat(filled)}
        {'☆'.repeat(5 - filled)}
      </span>
      <span style={{ color: c.ashDim, fontSize: 11 }}>({reviews})</span>
    </div>
  )
}
