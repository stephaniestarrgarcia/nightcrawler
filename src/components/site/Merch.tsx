'use client'

import { useState } from 'react'
import { c } from '@/lib/tokens'
import { formatPrice } from '@/lib/money'
import type { Product, Status } from '@/lib/db/types'
import { Photo } from './Photo'
import { SectionTitle } from './SectionTitle'
import { NotifyMe } from './NotifyMe'

type MerchProduct = Product & { status: Status }

export function Merch({
  items,
  onAdd,
}: {
  items: MerchProduct[]
  onAdd: (p: MerchProduct, size: string | null) => void
}) {
  // Chosen size per item. An item that comes in sizes cannot be bagged
  // without one — staff have to pick something off a shelf.
  const [picked, setPicked] = useState<Record<string, string>>({})
  const [prompted, setPrompted] = useState<Record<string, boolean>>({})

  if (items.length === 0) return null

  function add(m: MerchProduct) {
    const needsSize = m.sizes.length > 0
    const size = picked[m.id] ?? null
    if (needsSize && !size) {
      setPrompted(p => ({ ...p, [m.id]: true }))
      return
    }
    onAdd(m, size)
    setPrompted(p => ({ ...p, [m.id]: false }))
  }

  return (
    <section
      id="merch"
      className="nc-section"
      style={{ paddingTop: 0, display: 'flex', flexDirection: 'column', gap: 36 }}
    >
      <SectionTitle eyebrow="Wearables" title="Merch" />
      <div className="nc-grid-4">
        {items.map(m => {
          const sold = m.status === 'Sold out'
          const needsSize = m.sizes.length > 0
          const chosen = picked[m.id]
          const nag = prompted[m.id] && !chosen
          return (
            <article key={m.id} className="nc-card nc-card--lift">
              <div
                style={{
                  position: 'relative',
                  height: 240,
                  filter: sold ? 'grayscale(1) brightness(0.55)' : undefined,
                }}
              >
                <Photo url={m.photo_url} alt={m.name} hint={`Merch photo — slot ${m.slot ?? '—'}`} />
                {sold && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 14,
                      right: 14,
                      background: c.bone,
                      color: c.card,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.2em',
                      textTransform: 'uppercase',
                      padding: '5px 10px',
                      pointerEvents: 'none',
                    }}
                  >
                    Sold out
                  </div>
                )}
              </div>

              <div style={{ padding: '16px 18px 20px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 500, color: c.bone, letterSpacing: '0.06em', margin: 0 }}>
                    {m.name}
                  </h3>
                  <div style={{ fontSize: 14, color: c.bone, whiteSpace: 'nowrap' }}>{formatPrice(m.price_cents)}</div>
                </div>

                {needsSize && !sold && (
                  <div role="group" aria-label={`Size for ${m.name}`} style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {m.sizes.map(s => {
                      const active = chosen === s
                      return (
                        <button
                          key={s}
                          onClick={() => {
                            setPicked(p => ({ ...p, [m.id]: s }))
                            setPrompted(p => ({ ...p, [m.id]: false }))
                          }}
                          aria-pressed={active}
                          style={{
                            background: active ? c.accent : 'transparent',
                            border: `1px solid ${nag ? c.accent : active ? c.accent : c.umber}`,
                            color: active ? c.card : c.ash,
                            fontSize: 9,
                            fontWeight: active ? 700 : 400,
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            transition: 'background 0.2s, color 0.2s, border-color 0.2s',
                          }}
                        >
                          {s}
                        </button>
                      )
                    })}
                  </div>
                )}

                {needsSize && sold && (
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {m.sizes.map(s => (
                      <span
                        key={s}
                        style={{
                          border: `1px solid ${c.umber}`,
                          color: c.ashDim,
                          fontSize: 9,
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          padding: '4px 8px',
                        }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                {nag && (
                  <div role="alert" style={{ fontSize: 10, color: c.accent, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Pick a size
                  </div>
                )}

                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', paddingTop: 4 }}>
                  {sold ? (
                    <NotifyMe productId={m.id} productName={m.name} />
                  ) : (
                    <button
                      onClick={() => add(m)}
                      className="nc-btn nc-btn-add"
                      style={{ fontSize: 10, letterSpacing: '0.2em', padding: 11 }}
                    >
                      Add to bag
                    </button>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
