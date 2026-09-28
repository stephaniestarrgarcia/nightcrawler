'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLive } from '@/lib/useLive'
import {
  clearSavedOrder, readSavedOrder, saveOrder, useTrackedOrder, type SavedOrder,
} from '@/lib/useTrackedOrder'
import type { Fulfillment, Product, PublicState, Status } from '@/lib/db/types'
import { AgeGate } from './AgeGate'
import { Nav } from './Nav'
import { Hero } from './Hero'
import { Menu } from './Menu'
import { Merch } from './Merch'
import { Events } from './Events'
import { Locations } from './Locations'
import { Testimonials } from './Testimonials'
import { Newsletter } from './Newsletter'
import { Footer } from './Footer'
import { BagDrawer, type CartLine, type Step } from './BagDrawer'

const AGE_COOKIE_DAYS = 30

function confirmAge() {
  const expires = new Date(Date.now() + AGE_COOKIE_DAYS * 86_400_000).toUTCString()
  document.cookie = `nc-age-ok=1; expires=${expires}; path=/; samesite=lax`
  try {
    localStorage.setItem('nc-age-ok', '1')
  } catch {
    /* the cookie is the source of truth; localStorage is a convenience */
  }
}

export function SiteApp({
  initial,
  initialLocation,
  aged: agedInitially,
}: {
  initial: PublicState
  initialLocation: string
  aged: boolean
}) {
  const [aged, setAged] = useState(agedInitially)
  const [location, setLocation] = useState(initialLocation)
  const [cart, setCart] = useState<CartLine[]>([])
  const [bagOpen, setBagOpen] = useState(false)
  const [step, setStep] = useState<Step>('bag')
  const [saved, setSaved] = useState<SavedOrder | null>(null)
  const [orderError, setOrderError] = useState<string | null>(null)

  const { data, refresh } = useLive<PublicState>(`/api/state?location=${location}`, initial)
  const state = data ?? initial
  const { order, error: trackError, reload } = useTrackedOrder(saved)

  useEffect(() => {
    setSaved(readSavedOrder())
  }, [])

  // Remember the room across visits so the bag and the menu agree on reload.
  useEffect(() => {
    try {
      const stored = localStorage.getItem('nc-location')
      if (stored && stored !== location) setLocation(stored)
    } catch {
      /* ignore */
    }
    // Intentionally on mount only: later changes are user-driven.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pickLocation = useCallback((id: string) => {
    setLocation(id)
    try {
      localStorage.setItem('nc-location', id)
    } catch {
      /* ignore */
    }
  }, [])

  const room = state.locations.find(l => l.id === location)
  const flower = useMemo(() => state.products.filter(p => p.kind === 'flower'), [state.products])
  const merch = useMemo(() => state.products.filter(p => p.kind === 'merch'), [state.products])

  // A room switch — or the admin selling something out, repricing it, or
  // dropping a size — can invalidate the bag. Reconcile against what is
  // actually purchasable right now rather than letting checkout fail later.
  useEffect(() => {
    setCart(current => {
      let changed = false
      const next: CartLine[] = []
      for (const line of current) {
        const product = state.products.find(p => p.id === line.product_id)
        if (!product || product.status !== 'Available') {
          changed = true
          continue
        }
        if (line.size && !product.sizes.includes(line.size)) {
          changed = true
          continue
        }
        if (product.price_cents !== line.price_cents) {
          changed = true
          next.push({ ...line, price_cents: product.price_cents })
          continue
        }
        next.push(line)
      }
      return changed ? next : current
    })
  }, [state.products])

  function add(p: Product & { status: Status }, size: string | null = null) {
    const key = `${p.id}:${size ?? ''}`
    setCart(current => {
      const existing = current.find(l => l.key === key)
      if (existing) {
        return current.map(l => (l.key === key ? { ...l, qty: l.qty + 1 } : l))
      }
      const label = p.kind === 'flower' && p.type ? `${p.name} — ${p.type}` : p.name
      return [...current, { key, product_id: p.id, name: label, size, price_cents: p.price_cents, qty: 1 }]
    })
    setStep('bag')
    setBagOpen(true)
  }

  function changeQty(key: string, qty: number) {
    if (qty < 1) return remove(key)
    setCart(current => current.map(l => (l.key === key ? { ...l, qty } : l)))
  }

  function remove(key: string) {
    setCart(current => current.filter(l => l.key !== key))
  }

  async function place(input: {
    fulfillment: Fulfillment
    customer_name: string
    phone: string
    email: string
    address: string
  }): Promise<string | null> {
    setOrderError(null)
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location_id: location,
        aged: true,
        ...input,
        items: cart.map(l => ({
          product_id: l.product_id,
          name: l.name,
          size: l.size,
          price_cents: l.price_cents,
          qty: l.qty,
        })),
      }),
    })

    if (!res.ok) {
      return ((await res.json()) as { error?: string }).error ?? 'We could not send that order'
    }

    const created = (await res.json()) as { number: string; phone: string }
    const record: SavedOrder = {
      number: created.number,
      proof: input.phone.replace(/\D/g, '').slice(-4),
      where:
        input.fulfillment === 'delivery'
          ? `Delivery to ${input.address}`
          : `Pickup at ${room?.name ?? ''}`,
    }
    saveOrder(record)
    setSaved(record)
    setCart([])
    setStep('tracking')
    return null
  }

  function newOrder() {
    clearSavedOrder()
    setSaved(null)
    setStep('bag')
    setBagOpen(false)
  }

  return (
    <>
      {!aged && (
        <AgeGate
          onEnter={() => {
            confirmAge()
            setAged(true)
          }}
        />
      )}

      <div style={{ minHeight: '100vh' }} aria-hidden={!aged}>
        <Nav
          locations={state.locations}
          activeLocation={location}
          onPickLocation={pickLocation}
          cartCount={cart.reduce((n, l) => n + l.qty, 0)}
          onOpenBag={() => {
            setStep(cart.length === 0 && saved ? 'tracking' : 'bag')
            setBagOpen(true)
            void reload()
          }}
        />

        <BagDrawer
          open={bagOpen}
          step={step}
          onStep={setStep}
          onClose={() => setBagOpen(false)}
          cart={cart}
          onChangeQty={changeQty}
          onRemove={remove}
          room={room}
          order={order}
          orderError={orderError ?? trackError}
          onPlace={place}
          onNewOrder={newOrder}
        />

        <Hero roomName={room?.name ?? ''} />
        <Menu products={flower} onAdd={add} />
        <Testimonials />
        <Merch items={merch} onAdd={add} />
        <Events events={state.events} onChanged={() => void refresh(true)} />
        <Locations locations={state.locations} activeLocation={location} onPick={pickLocation} />
        <Newsletter />
        <Footer />
      </div>
    </>
  )
}
