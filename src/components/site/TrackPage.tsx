'use client'

import Link from 'next/link'
import { c, display } from '@/lib/tokens'
import { useTrackedOrder, type SavedOrder } from '@/lib/useTrackedOrder'
import { Tracker, type TrackedOrder } from './Tracker'

export function TrackPage({ saved, initial }: { saved: SavedOrder | null; initial: TrackedOrder | null }) {
  const { order, error } = useTrackedOrder(saved, initial)

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: c.bg,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 60% 45% at 50% 40%, rgba(232,56,47,0.10), transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div className="nc-rise" style={{ position: 'relative', width: '100%', maxWidth: 460, display: 'flex', flexDirection: 'column', gap: 30 }}>
        <Link href="/" className="nc-display" style={{ fontFamily: display, fontSize: 48, transform: 'rotate(-4deg)', alignSelf: 'center' }}>
          Nightcrawler
        </Link>

        {order ? (
          <div style={{ background: c.card, border: `1px solid ${c.hairline}`, padding: 28 }}>
            <Tracker order={order} />
          </div>
        ) : (
          <div style={{ background: c.card, border: `1px solid ${c.hairline}`, padding: 28, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 15, color: c.boneMuted }}>
              {error ?? "We couldn't find that order."}
            </div>
            <div style={{ fontSize: 13, color: c.ashDim, lineHeight: 1.6 }}>
              Use the link from your confirmation text — it carries the last four digits of your phone number.
            </div>
            <Link href="/" style={{ color: c.accent, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', paddingTop: 6 }}>
              ← Back to the menu
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
