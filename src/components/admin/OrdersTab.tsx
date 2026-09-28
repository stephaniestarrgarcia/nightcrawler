'use client'

import { useEffect, useState } from 'react'
import { c, display } from '@/lib/tokens'
import { formatPrice } from '@/lib/money'
import { adminStageLabels } from '@/lib/stages'
import { relativeTime } from '@/lib/time'
import type { Order, Stage } from '@/lib/db/types'

export function OrdersTab({
  orders,
  locationId,
  onChanged,
}: {
  orders: Order[]
  locationId: string
  onChanged: () => void
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const [showFulfilled, setShowFulfilled] = useState(false)
  // Re-render once a minute so "2 min ago" doesn't quietly go stale.
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), 60_000)
    return () => window.clearInterval(id)
  }, [])

  // The pulse means "nobody has looked at this yet" — clear it once staff have
  // had the queue open for a few seconds, not the instant it renders.
  useEffect(() => {
    if (!orders.some(o => !o.seen)) return
    const id = window.setTimeout(() => {
      void fetch(`/api/admin/orders/seen?location=${locationId}`, { method: 'POST' }).then(onChanged)
    }, 6000)
    return () => window.clearTimeout(id)
  }, [orders, locationId, onChanged])

  async function advance(order: Order) {
    const next = Math.min(3, order.stage + 1) as Stage
    setBusy(order.id)
    await fetch(`/api/admin/orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: next }),
    })
    setBusy(null)
    onChanged()
  }

  if (orders.length === 0) {
    return (
      <div style={{ padding: 20, fontSize: 13, color: c.ash, lineHeight: 1.7 }}>
        No orders in this room yet. New ones land here the moment they&apos;re placed.
      </div>
    )
  }

  // Fulfilled orders would otherwise bury tonight's work by closing time.
  const active = orders.filter(o => o.stage < 3)
  const fulfilled = orders.filter(o => o.stage >= 3)

  const card = (o: Order) => {
    const labels = adminStageLabels(o.fulfillment)
    const done = o.stage >= 3
    const fresh = !o.seen
    const delivery = o.fulfillment === 'delivery'
    return (
      <article
        key={o.id}
        className={fresh ? 'nc-pulse' : undefined}
        style={{
          background: c.card,
          border: `1px solid ${fresh ? c.accent : c.hairline}`,
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: c.bone, letterSpacing: '0.06em' }}>{o.number}</span>
              <span
                style={{
                  background: delivery ? c.cigar : c.umber,
                  color: c.bone,
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  padding: '3px 8px',
                }}
              >
                {delivery ? 'Delivery' : 'Pickup'}
              </span>
            </div>
            <div style={{ fontSize: 12, color: c.ash }}>
              {o.customer_name} · {relativeTime(o.created_at)}
            </div>
            <div style={{ fontSize: 12, color: c.ash }}>{o.phone}</div>
            {delivery && o.address && <div style={{ fontSize: 12, color: c.boneMuted }}>{o.address}</div>}
          </div>
          <div style={{ fontSize: 17, fontWeight: 500, color: c.bone, whiteSpace: 'nowrap' }}>
            {formatPrice(o.total_cents)}
          </div>
        </div>

        <div style={{ fontSize: 13, color: c.boneMuted, lineHeight: 1.7, borderLeft: `2px solid ${c.hairline}`, paddingLeft: 12 }}>
          {o.items
            .map(i => `${i.qty} × ${i.name}${i.size ? ` · ${i.size}` : ''} (${formatPrice(i.price_cents)})`)
            .join(', ')}
        </div>

        <div style={{ display: 'flex', gap: 5 }}>
          {labels.map((label, i) => (
            <div key={label} style={{ flex: 1, height: 5, background: i <= o.stage ? c.accent : c.umber, transition: 'background 0.4s' }} />
          ))}
        </div>

        {done ? (
          <div style={{ textAlign: 'center', fontFamily: display, fontSize: 24, color: c.cigar, transform: 'rotate(-2deg)' }}>
            fulfilled
          </div>
        ) : (
          <button
            onClick={() => advance(o)}
            disabled={busy === o.id}
            className="nc-btn nc-btn-primary"
            style={{ fontSize: 12, letterSpacing: '0.18em', padding: 15 }}
          >
            {busy === o.id ? '…' : `Mark: ${labels[Math.min(3, o.stage + 1)]}`}
          </button>
        )}
      </article>
    )
  }

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {active.length === 0 ? (
        <div style={{ fontSize: 13, color: c.ash, lineHeight: 1.7, padding: '4px 0 8px' }}>
          Nothing in the queue — everything is fulfilled.
        </div>
      ) : (
        active.map(card)
      )}

      <div style={{ fontSize: 11, color: c.ashDim, lineHeight: 1.7, padding: '8px 4px' }}>
        Each tap updates the customer&apos;s live tracker instantly and texts them the new stage.
      </div>

      {fulfilled.length > 0 && (
        <>
          <button
            onClick={() => setShowFulfilled(v => !v)}
            aria-expanded={showFulfilled}
            className="nc-btn-dashed"
            style={{ padding: 14 }}
          >
            {showFulfilled ? 'Hide' : 'Show'} fulfilled · {fulfilled.length}
          </button>
          {showFulfilled && fulfilled.map(card)}
        </>
      )}
    </div>
  )
}
