'use client'

import { useEffect, useRef, useState } from 'react'
import { c, display } from '@/lib/tokens'
import { formatPrice } from '@/lib/money'
import type { Fulfillment, Location } from '@/lib/db/types'
import { Tracker, type TrackedOrder } from './Tracker'

export interface CartLine {
  /** product id + size — two sizes of one tee are two lines. */
  key: string
  product_id: string
  name: string
  size: string | null
  price_cents: number
  qty: number
}

export type Step = 'bag' | 'form' | 'tracking'

/** Two sizes of one tee are two lines, so their controls must read apart. */
const label = (line: CartLine) => (line.size ? `${line.name}, size ${line.size}` : line.name)

export function BagDrawer({
  open,
  step,
  onStep,
  onClose,
  cart,
  onChangeQty,
  onRemove,
  room,
  order,
  orderError,
  onPlace,
  onNewOrder,
}: {
  open: boolean
  step: Step
  onStep: (s: Step) => void
  onClose: () => void
  cart: CartLine[]
  onChangeQty: (key: string, qty: number) => void
  onRemove: (key: string) => void
  room: Location | undefined
  order: TrackedOrder | null
  orderError: string | null
  onPlace: (input: {
    fulfillment: Fulfillment
    customer_name: string
    phone: string
    email: string
    address: string
  }) => Promise<string | null>
  onNewOrder: () => void
}) {
  const [fulfillment, setFulfillment] = useState<Fulfillment>('pickup')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const total = cart.reduce((t, l) => t + l.price_cents * l.qty, 0)
  const isDelivery = fulfillment === 'delivery'
  const phoneOk = phone.replace(/\D/g, '').length >= 10
  const canPlace = Boolean(name.trim()) && phoneOk && (!isDelivery || Boolean(address.trim()))

  // Escape closes; focus moves into the panel when it opens.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    panelRef.current?.focus()
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [open, onClose])

  if (!open) return null

  const title = step === 'form' ? 'Checkout' : step === 'tracking' ? 'Order tracker' : 'Your bag'

  async function place() {
    if (!canPlace || placing) return
    setPlacing(true)
    setError(await onPlace({ fulfillment, customer_name: name, phone, email, address }))
    setPlacing(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(6,4,3,0.72)', backdropFilter: 'blur(3px)' }} />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="nc-drawer nc-rise"
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: 440,
          maxWidth: '92vw',
          background: c.card,
          borderLeft: `1px solid ${c.umber}`,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          animationDuration: '0.35s',
          outline: 'none',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 28px', borderBottom: `1px solid ${c.hairline}` }}>
          <div className="nc-display" style={{ fontFamily: display, fontSize: 34, transform: 'rotate(-3deg)' }}>
            {title}
          </div>
          <button onClick={onClose} aria-label="Close" className="nc-icon-btn" style={{ width: 36, height: 36, fontSize: 14 }}>
            ✕
          </button>
        </div>

        {/* ---------------------------------------------------------- bag */}
        {step === 'bag' && (
          <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 18, flex: 1 }}>
            {cart.length === 0 ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '30px 0' }}>
                  <div style={{ fontSize: 15, color: c.boneMuted }}>Nothing in the bag yet.</div>
                  <div style={{ fontSize: 13, color: c.ashDim }}>
                    The night is young —{' '}
                    <a href="#shop" onClick={onClose} style={{ color: c.accent }}>
                      browse the menu
                    </a>
                    .
                  </div>
                </div>
                {order && (
                  <button onClick={() => onStep('tracking')} className="nc-btn nc-btn-secondary" style={{ fontSize: 11, padding: 14 }}>
                    Track my order
                  </button>
                )}
              </>
            ) : (
              <>
                {cart.map(line => (
                  <div
                    key={line.key}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: `1px solid ${c.hairline}` }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                      <div style={{ fontSize: 14, color: c.bone }}>
                        {line.name}
                        {line.size && (
                          <span style={{ color: c.cigar, letterSpacing: '0.12em', textTransform: 'uppercase', fontSize: 11 }}>
                            {' '}· {line.size}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          onClick={() => onChangeQty(line.key, line.qty - 1)}
                          aria-label={`One fewer ${label(line)}`}
                          className="nc-icon-btn"
                          style={{ width: 24, height: 24, fontSize: 12 }}
                        >
                          −
                        </button>
                        <span style={{ fontSize: 12, color: c.cigar, minWidth: 46, textAlign: 'center' }}>
                          {line.qty} × {formatPrice(line.price_cents)}
                        </span>
                        <button
                          onClick={() => onChangeQty(line.key, line.qty + 1)}
                          aria-label={`One more ${label(line)}`}
                          className="nc-icon-btn"
                          style={{ width: 24, height: 24, fontSize: 12 }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ fontSize: 14, color: c.bone }}>{formatPrice(line.price_cents * line.qty)}</div>
                      <button
                        onClick={() => onRemove(line.key)}
                        aria-label={`Remove ${label(line)}`}
                        style={{ background: 'none', border: 'none', color: c.ashDim, fontSize: 14, cursor: 'pointer', padding: 4 }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div style={{ fontSize: 12, color: c.ash, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Total</div>
                    <div style={{ fontSize: 24, fontWeight: 500, color: c.bone }}>{formatPrice(total)}</div>
                  </div>
                  <button onClick={() => onStep('form')} disabled={!room?.is_open} className="nc-btn nc-btn-primary">
                    Checkout
                  </button>
                  {!room?.is_open && (
                    <div style={{ fontSize: 11, color: c.accent, lineHeight: 1.6 }}>
                      {room?.name ?? 'This room'} is closed tonight. Pick another room from the nav to check out.
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: c.ashDim, lineHeight: 1.6 }}>
                    No payment online — you pay at pickup or on delivery. We just need to know what to set aside.
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ----------------------------------------------------- checkout */}
        {step === 'form' && (
          <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['pickup', 'delivery'] as const).map(f => {
                const active = fulfillment === f
                return (
                  <button
                    key={f}
                    onClick={() => setFulfillment(f)}
                    aria-pressed={active}
                    style={{
                      flex: 1,
                      background: active ? c.accent : 'transparent',
                      color: active ? c.card : c.boneMuted,
                      border: `1px solid ${c.umber}`,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      padding: 13,
                      cursor: 'pointer',
                    }}
                  >
                    {f === 'pickup' ? 'Pickup' : 'Delivery'}
                  </button>
                )
              })}
            </div>

            {isDelivery && (
              <input
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Delivery address"
                aria-label="Delivery address"
                className="nc-input nc-input--lg"
              />
            )}

            <div style={{ fontSize: 12, color: c.cigar, letterSpacing: '0.1em', marginTop: -6 }}>
              {isDelivery ? 'Delivery from ' : 'Pickup at '}
              {room?.name} — {room?.address.split('\n')[0]}
            </div>

            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" aria-label="Your name" className="nc-input nc-input--lg" />
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Phone (for order updates)"
              aria-label="Phone number"
              inputMode="tel"
              className="nc-input nc-input--lg"
            />
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email (optional)"
              aria-label="Email address"
              inputMode="email"
              className="nc-input nc-input--lg"
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '6px 0' }}>
              <div style={{ fontSize: 12, color: c.ash, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                Total — pay on arrival
              </div>
              <div style={{ fontSize: 22, fontWeight: 500, color: c.bone }}>{formatPrice(total)}</div>
            </div>

            <button onClick={place} disabled={!canPlace || placing} className="nc-btn nc-btn-primary">
              {placing ? 'Sending…' : 'Place order'}
            </button>

            {(error || orderError) && (
              <div role="alert" style={{ fontSize: 12, color: c.accent, lineHeight: 1.6 }}>
                {error ?? orderError}
              </div>
            )}

            <button onClick={() => onStep('bag')} className="nc-btn-ghost">
              ← Back to bag
            </button>

            <div style={{ fontSize: 11, color: c.ashDim, lineHeight: 1.6 }}>
              Your order is sent straight to our team. ID required at pickup / delivery — 21+ only.
            </div>
          </div>
        )}

        {/* ------------------------------------------------------ tracker */}
        {step === 'tracking' && order && (
          <div style={{ padding: 28 }}>
            <Tracker order={order} onNewOrder={onNewOrder} />
          </div>
        )}
      </div>
    </div>
  )
}
