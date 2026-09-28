'use client'

import { c, display } from '@/lib/tokens'
import type { Location } from '@/lib/db/types'
import { SectionTitle } from './SectionTitle'

export function Locations({
  locations,
  activeLocation,
  onPick,
}: {
  locations: Location[]
  activeLocation: string
  onPick: (id: string) => void
}) {
  return (
    <section id="locations" className="nc-section" style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
      <SectionTitle eyebrow="Where to find us" title="Locations" />
      <div className="nc-grid-4 nc-locations" style={{ gap: 20 }}>
        {locations.map(l => {
          const active = l.id === activeLocation
          return (
            <button
              key={l.id}
              onClick={() => onPick(l.id)}
              disabled={!l.is_open}
              aria-pressed={active}
              style={{
                background: active ? c.cardActive : c.card,
                border: `1px solid ${active ? c.cigar : c.hairline}`,
                padding: '30px 28px',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                textAlign: 'left',
                cursor: l.is_open ? 'pointer' : 'not-allowed',
                opacity: l.is_open ? 1 : 0.75,
                font: 'inherit',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div className="nc-display" style={{ fontFamily: display, fontSize: 36 }}>
                  {l.name}
                </div>
                {active && (
                  <div
                    style={{
                      background: c.accent,
                      color: c.card,
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: '0.2em',
                      textTransform: 'uppercase',
                      padding: '4px 9px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Shopping here
                  </div>
                )}
              </div>

              <div style={{ fontSize: 14, color: c.boneMuted, lineHeight: 1.7, whiteSpace: 'pre-line' }}>{l.address}</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: l.is_open ? c.live : c.accent,
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                  }}
                >
                  {l.is_open ? 'Open tonight' : 'Closed'}
                </div>
                <div style={{ fontSize: 14, color: c.bone }}>{l.hours}</div>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
