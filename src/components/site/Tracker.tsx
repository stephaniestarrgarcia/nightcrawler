'use client'

import { c, display } from '@/lib/tokens'
import { formatPrice } from '@/lib/money'
import { stageCopy, stageLabels } from '@/lib/stages'
import type { Fulfillment, Stage } from '@/lib/db/types'

export interface TrackedOrder {
  number: string
  fulfillment: Fulfillment
  stage: Stage
  total_cents: number
  items: { name: string; size: string | null; qty: number; price_cents: number }[]
  where: string
}

/**
 * The live order tracker — shared by the bag drawer and the /track deep link.
 * Bars fill umber → vermilion as the admin advances the order.
 */
export function Tracker({ order, onNewOrder }: { order: TrackedOrder; onNewOrder?: () => void }) {
  const labels = stageLabels(order.fulfillment)
  const count = order.items.reduce((n, i) => n + i.qty, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 12, color: c.cigar, letterSpacing: '0.25em', textTransform: 'uppercase' }}>
          Order {order.number}
        </div>
        <div style={{ fontSize: 13, color: c.ash }}>
          {count} {count === 1 ? 'item' : 'items'} · {formatPrice(order.total_cents)}
        </div>
        <div style={{ fontSize: 13, color: c.ash }}>{order.where}</div>
      </div>

      <div style={{ display: 'flex', gap: 6 }} role="progressbar" aria-valuemin={1} aria-valuemax={4} aria-valuenow={order.stage + 1} aria-label={labels[order.stage]}>
        {labels.map((label, i) => (
          <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ height: 6, background: i <= order.stage ? c.accent : c.umber, transition: 'background 0.6s' }} />
            <div
              style={{
                fontSize: 9,
                color: i === order.stage ? c.bone : c.ashDim,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                lineHeight: 1.4,
              }}
            >
              {label}
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: c.bg, border: `1px solid ${c.hairline}`, padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="nc-display" style={{ fontFamily: display, fontSize: 32, transform: 'rotate(-2deg)' }}>
          {labels[order.stage]}
        </div>
        <div style={{ fontSize: 13, color: c.boneMuted, lineHeight: 1.6 }}>
          {stageCopy(order.fulfillment, order.stage)}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {order.items.map(i => (
          <div key={`${i.name}:${i.size ?? ''}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12, color: c.ash }}>
            <span>
              {i.qty} × {i.name}
              {i.size && ` · ${i.size}`}
            </span>
            <span style={{ whiteSpace: 'nowrap' }}>{formatPrice(i.price_cents * i.qty)}</span>
          </div>
        ))}
      </div>

      {order.stage >= 3 && onNewOrder && (
        <button onClick={onNewOrder} className="nc-btn nc-btn-secondary" style={{ fontSize: 11, padding: 14 }}>
          Start a new order
        </button>
      )}

      <div style={{ fontSize: 11, color: c.ashDim, lineHeight: 1.6 }}>
        We&apos;ll text you as your order moves. Questions? Reply to the confirmation text.
      </div>
    </div>
  )
}
