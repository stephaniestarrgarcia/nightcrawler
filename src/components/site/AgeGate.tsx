'use client'

import { c, display } from '@/lib/tokens'

/** Blocks everything until 21+ is confirmed. 30-day cookie, set by the caller. */
export function AgeGate({ onEnter }: { onEnter: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Age verification"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: c.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 60% 45% at 50% 55%, rgba(232,56,47,0.12), transparent 70%)',
        }}
      />
      <div
        className="nc-rise"
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 26,
          textAlign: 'center',
          padding: 24,
        }}
      >
        <div
          className="nc-display nc-gate-word"
          style={{ fontFamily: display, fontSize: 76, transform: 'rotate(-4deg)', whiteSpace: 'nowrap' }}
        >
          Nightcrawler
        </div>
        <div style={{ fontSize: 12, color: c.cigar, letterSpacing: '0.45em', textTransform: 'uppercase', paddingLeft: '0.45em' }}>
          fine cannabis — after dark
        </div>
        <div style={{ width: 60, height: 1, background: c.umber }} />
        <div style={{ fontSize: 15, color: c.boneMuted, maxWidth: 340, lineHeight: 1.6 }}>
          The night is for adults. Are you 21 or older?
        </div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={onEnter} className="nc-btn nc-btn-primary" style={{ fontSize: 13, padding: '16px 38px' }}>
            I am 21+
          </button>
          <a
            href="https://www.samhsa.gov"
            style={{
              display: 'flex',
              alignItems: 'center',
              border: `1px solid ${c.umber}`,
              color: c.ash,
              fontSize: 13,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              padding: '16px 38px',
            }}
          >
            Not yet
          </a>
        </div>
      </div>
    </div>
  )
}
