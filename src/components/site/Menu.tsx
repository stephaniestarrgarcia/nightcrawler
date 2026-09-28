'use client'

import { useState } from 'react'
import { c, display, typeBg } from '@/lib/tokens'
import { formatPrice } from '@/lib/money'
import type { Product, Status } from '@/lib/db/types'
import { Photo } from './Photo'
import { Stars } from './Stars'
import { SectionTitle } from './SectionTitle'
import { NotifyMe } from './NotifyMe'

type MenuProduct = Product & { status: Status }

const FILTERS = ['all', 'Indica', 'Sativa', 'Hybrid'] as const

export function Menu({
  products,
  onAdd,
}: {
  products: MenuProduct[]
  onAdd: (p: MenuProduct) => void
}) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all')
  const shown = filter === 'all' ? products : products.filter(p => p.type === filter)

  return (
    <section id="shop" className="nc-section" style={{ paddingBottom: 40, display: 'flex', flexDirection: 'column', gap: 36 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24, flexWrap: 'wrap' }}>
        <SectionTitle eyebrow="The menu" title="Tonight's lineup" />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {FILTERS.map(f => {
            const active = filter === f
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                aria-pressed={active}
                style={{
                  background: active ? c.accent : 'transparent',
                  color: active ? c.card : c.boneMuted,
                  border: `1px solid ${c.umber}`,
                  fontSize: 11,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  padding: '10px 18px',
                  cursor: 'pointer',
                }}
              >
                {f === 'all' ? 'All' : f}
              </button>
            )
          })}
        </div>
      </div>

      {shown.length === 0 ? (
        <div style={{ fontSize: 14, color: c.ash, padding: '40px 0' }}>
          Nothing in this category tonight. Try another room, or check back after dark.
        </div>
      ) : (
        <div className="nc-grid-3">
          {shown.map(p => {
            const sold = p.status === 'Sold out'
            return (
              <article
                key={p.id}
                className="nc-card nc-card--lift"
                style={sold ? { filter: 'grayscale(1) brightness(0.55)' } : undefined}
              >
                <div style={{ position: 'relative', height: 250 }}>
                  <Photo url={p.photo_url} alt={p.name} hint={`${p.name} product shot`} />
                  <div
                    style={{
                      position: 'absolute',
                      top: 14,
                      left: 14,
                      background: sold ? c.bone : typeBg[p.type ?? ''] ?? c.cigar,
                      color: c.card,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      padding: '5px 10px',
                      pointerEvents: 'none',
                    }}
                  >
                    {sold ? 'Sold out' : p.type}
                  </div>
                </div>

                <div style={{ padding: '20px 22px 22px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                    <h3 className="nc-display" style={{ fontFamily: display, fontSize: 34, margin: 0, fontWeight: 400 }}>
                      {p.name}
                    </h3>
                    <div style={{ fontSize: 17, fontWeight: 500, color: c.bone, whiteSpace: 'nowrap' }}>
                      {formatPrice(p.price_cents)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 11, color: c.ash, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                      {[p.thc && `THC ${p.thc}`, p.weight].filter(Boolean).join(' · ')}
                    </div>
                    <Stars rating={p.rating} reviews={p.reviews} />
                  </div>

                  <div style={{ fontSize: 13, color: c.ash, lineHeight: 1.6, flex: 1 }}>{p.description}</div>

                  <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column' }}>
                    {sold ? (
                      <NotifyMe productId={p.id} productName={p.name} />
                    ) : (
                      <button onClick={() => onAdd(p)} className="nc-btn nc-btn-add" style={{ fontSize: 11, padding: 13 }}>
                        Add to bag
                      </button>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
