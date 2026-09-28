import { c } from '@/lib/tokens'

/** Fixed brand copy from the handoff — not shop data, so it lives in code. */
const QUOTES = [
  { quote: 'Velvet Static is the only thing that turns my brain off. The jar alone is worth the price.', who: 'Marisol — New York' },
  { quote: 'Feels less like a dispensary, more like a record shop that happens to sell flower.', who: 'Dre — Los Angeles' },
  { quote: 'Ghost Tiger drop sold out in an hour. Get on the list, trust me.', who: 'Kat — The Valley' },
]

export function Testimonials() {
  return (
    <section className="nc-section" style={{ paddingTop: 50, paddingBottom: 90 }}>
      <div
        className="nc-reviews"
        style={{
          background: c.card,
          border: `1px solid ${c.hairline}`,
          padding: '44px 48px',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 44,
        }}
      >
        {QUOTES.map(t => (
          <figure key={t.who} style={{ display: 'flex', flexDirection: 'column', gap: 14, margin: 0 }}>
            <div style={{ color: c.accent, fontSize: 15, letterSpacing: 3 }}>★★★★★</div>
            <blockquote style={{ fontSize: 14, color: c.boneMuted, lineHeight: 1.7, fontStyle: 'italic', margin: 0 }}>
              “{t.quote}”
            </blockquote>
            <figcaption style={{ fontSize: 11, color: c.cigar, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              {t.who}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}
