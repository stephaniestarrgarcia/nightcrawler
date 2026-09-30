'use client'

import { useState } from 'react'
import { c, display } from '@/lib/tokens'
import type { Location } from '@/lib/db/types'

const LINKS = [
  ['#shop', 'Shop'],
  ['#merch', 'Merch'],
  ['#events', 'Events'],
  ['#locations', 'Locations'],
] as const

export function Nav({
  locations,
  activeLocation,
  onPickLocation,
  cartCount,
  onOpenBag,
  liveOrder,
  onOpenTracker,
}: {
  locations: Location[]
  activeLocation: string
  onPickLocation: (id: string) => void
  cartCount: number
  onOpenBag: () => void
  /** A placed order still worth watching, shown so it can be found again. */
  liveOrder: { number: string; stageLabel: string; done: boolean } | null
  onOpenTracker: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav
      className="nc-nav"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(14,11,9,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${c.hairline}`,
      }}
    >
      <div
        className="nc-nav-inner"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '0 40px',
          height: 68,
        }}
      >
        <a
          href="#top"
          className="nc-display nc-nav-word"
          style={{ fontFamily: display, fontSize: 30, transform: 'rotate(-4deg)', whiteSpace: 'nowrap' }}
        >
          Nightcrawler
        </a>

        <div
          className="nc-nav-links"
          style={{ display: 'flex', alignItems: 'center', gap: 30, fontSize: 12, letterSpacing: '0.22em', textTransform: 'uppercase' }}
        >
          {LINKS.map(([href, label]) => (
            <a key={href} href={href} style={{ color: c.boneMuted }}>
              {label}
            </a>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {liveOrder && (
            <button
              onClick={onOpenTracker}
              className="nc-order-pill"
              title={`Order ${liveOrder.number} — ${liveOrder.stageLabel}`}
            >
              <span
                aria-hidden
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: liveOrder.done ? c.live : c.accent,
                  flexShrink: 0,
                }}
              />
              <span className="nc-order-pill-full">
                {liveOrder.number} · {liveOrder.stageLabel}
              </span>
              <span className="nc-order-pill-short">Order</span>
            </button>
          )}

          <label className="nc-nav-links" style={{ display: 'flex' }}>
            <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
              Shopping from
            </span>
            <select
              value={activeLocation}
              onChange={e => onPickLocation(e.target.value)}
              style={{
                background: c.card,
                color: c.bone,
                border: `1px solid ${c.umber}`,
                fontSize: 12,
                letterSpacing: '0.1em',
                padding: '9px 12px',
                cursor: 'pointer',
              }}
            >
              {locations.map(l => (
                <option key={l.id} value={l.id}>
                  {l.name}
                  {l.is_open ? '' : ' — closed'}
                </option>
              ))}
            </select>
          </label>

          <button
            onClick={onOpenBag}
            style={{
              background: 'none',
              border: `1px solid ${cartCount > 0 ? c.accent : c.umber}`,
              color: c.bone,
              fontSize: 12,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              padding: '10px 18px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Bag · {cartCount}
          </button>

          <button
            className="nc-nav-toggle"
            onClick={() => setMenuOpen(o => !o)}
            aria-expanded={menuOpen}
            aria-label="Menu"
            style={{
              display: 'none',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: `1px solid ${c.umber}`,
              color: c.bone,
              width: 40,
              height: 40,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            ☰
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          className="nc-nav-toggle"
          style={{ flexDirection: 'column', borderTop: `1px solid ${c.hairline}`, padding: '8px 20px 16px' }}
        >
          {LINKS.map(([href, label]) => (
            <a
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              style={{
                color: c.boneMuted,
                fontSize: 12,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                padding: '14px 0',
                borderBottom: `1px solid ${c.hairline}`,
              }}
            >
              {label}
            </a>
          ))}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 16 }}>
            <span className="nc-eyebrow" style={{ fontSize: 10 }}>Shopping from</span>
            <select
              value={activeLocation}
              onChange={e => onPickLocation(e.target.value)}
              className="nc-input"
              style={{ cursor: 'pointer' }}
            >
              {locations.map(l => (
                <option key={l.id} value={l.id}>
                  {l.name}
                  {l.is_open ? '' : ' — closed'}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
    </nav>
  )
}
