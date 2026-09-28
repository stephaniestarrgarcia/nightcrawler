import { c, display } from '@/lib/tokens'

export function Footer() {
  return (
    <footer style={{ borderTop: `1px solid ${c.hairline}`, padding: '50px 40px 60px' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div className="nc-display" style={{ fontFamily: display, fontSize: 40, transform: 'rotate(-4deg)' }}>
            Nightcrawler
          </div>
          <div style={{ display: 'flex', gap: 26, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', flexWrap: 'wrap' }}>
            {[
              ['#shop', 'Shop'],
              ['#merch', 'Merch'],
              ['#events', 'Events'],
              ['#locations', 'Locations'],
            ].map(([href, label]) => (
              <a key={href} href={href} style={{ color: c.ash }}>
                {label}
              </a>
            ))}
          </div>
        </div>
        <div style={{ height: 1, background: c.hairline }} />
        <div style={{ fontSize: 11, color: c.ashDim, lineHeight: 1.8, maxWidth: 860 }}>
          For adult use only. Keep out of reach of children and pets. Cannabis products have intoxicating effects and may
          be habit forming. Do not operate a vehicle or machinery under the influence. Licence no. — to be supplied.
          © {new Date().getFullYear()} Nightcrawler — cultivated after dark.
        </div>
      </div>
    </footer>
  )
}
