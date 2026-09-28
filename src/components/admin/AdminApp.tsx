'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { c, display } from '@/lib/tokens'
import { useLive } from '@/lib/useLive'
import type { AdminState } from '@/lib/db/types'
import { PinLock } from './PinLock'
import { OrdersTab } from './OrdersTab'
import { ProductsTab } from './ProductsTab'
import { EventsTab } from './EventsTab'
import { RoomsTab } from './RoomsTab'
import { ListTab } from './ListTab'

const TABS = ['orders', 'flower', 'merch', 'events', 'rooms', 'list'] as const
type Tab = (typeof TABS)[number]

const LABELS: Record<Tab, string> = {
  orders: 'Orders',
  flower: 'Flower',
  merch: 'Merch',
  events: 'Events',
  rooms: 'Rooms',
  list: 'List',
}

export function AdminApp({ unlockedInitially }: { unlockedInitially: boolean }) {
  const [unlocked, setUnlocked] = useState(unlockedInitially)
  const [tab, setTab] = useState<Tab>('orders')
  const [location, setLocation] = useState('ny')

  const { data, refresh } = useLive<AdminState>(`/api/admin/state?location=${location}`, null, {
    enabled: unlocked,
    intervalMs: 4000,
  })

  const onChanged = useCallback(() => void refresh(true), [refresh])

  // Stable identity: PinLock keys its submit effect off this.
  const onUnlocked = useCallback(() => {
    setUnlocked(true)
    void refresh(true)
  }, [refresh])

  async function lock() {
    await fetch('/api/admin/session', { method: 'DELETE' })
    setUnlocked(false)
  }

  // The session idles out server-side after 15 minutes; notice and show the pad.
  useEffect(() => {
    if (!unlocked) return
    const id = window.setInterval(async () => {
      const res = await fetch('/api/admin/session', { cache: 'no-store' })
      const body = (await res.json()) as { unlocked: boolean }
      if (!body.unlocked) setUnlocked(false)
    }, 60_000)
    return () => window.clearInterval(id)
  }, [unlocked])

  const flower = useMemo(() => data?.products.filter(p => p.kind === 'flower') ?? [], [data])
  const merch = useMemo(() => data?.products.filter(p => p.kind === 'merch') ?? [], [data])
  const freshCount = data?.orders.filter(o => !o.seen).length ?? 0

  return (
    <div style={{ background: c.bg, minHeight: '100vh', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 560, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {!unlocked ? (
          <PinLock onUnlocked={onUnlocked} />
        ) : (
          <>
            <header
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 20,
                background: 'rgba(14,11,9,0.95)',
                backdropFilter: 'blur(10px)',
                borderBottom: `1px solid ${c.hairline}`,
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div className="nc-display" style={{ fontFamily: display, fontSize: 28, transform: 'rotate(-3deg)' }}>
                  Nightcrawler
                </div>
                <div style={{ fontSize: 9, color: c.cigar, letterSpacing: '0.35em', textTransform: 'uppercase' }}>
                  Back of house
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <select
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  aria-label="Room"
                  style={{
                    background: c.card,
                    color: c.bone,
                    border: `1px solid ${c.umber}`,
                    fontSize: 12,
                    padding: '9px 10px',
                    cursor: 'pointer',
                  }}
                >
                  {(data?.locations ?? []).map(l => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
                <button onClick={lock} aria-label="Lock" className="nc-icon-btn" style={{ width: 38, height: 38, fontSize: 14 }}>
                  ⏻
                </button>
              </div>
            </header>

            <div
              role="tablist"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                borderBottom: `1px solid ${c.hairline}`,
                background: c.bg,
                position: 'sticky',
                top: 69,
                zIndex: 20,
              }}
            >
              {TABS.map(t => {
                const active = tab === t
                return (
                  <button
                    key={t}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTab(t)}
                    style={{
                      background: 'none',
                      border: 'none',
                      borderBottom: `2px solid ${active ? c.accent : 'transparent'}`,
                      color: active ? c.bone : c.ashDim,
                      fontSize: 11,
                      fontWeight: 500,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      padding: '16px 2px',
                      cursor: 'pointer',
                    }}
                  >
                    {LABELS[t]}
                    {t === 'orders' && freshCount > 0 && <span style={{ color: c.accent }}> ·{freshCount}</span>}
                  </button>
                )
              })}
            </div>

            {!data ? (
              <div style={{ padding: 20, fontSize: 12, color: c.ashDim, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                Loading the room…
              </div>
            ) : (
              <>
                {tab === 'orders' && <OrdersTab orders={data.orders} locationId={location} onChanged={onChanged} />}
                {tab === 'flower' && <ProductsTab kind="flower" products={flower} locationId={location} onChanged={onChanged} />}
                {tab === 'merch' && <ProductsTab kind="merch" products={merch} locationId={location} onChanged={onChanged} />}
                {tab === 'events' && <EventsTab events={data.events} rooms={data.locations} onChanged={onChanged} />}
                {tab === 'rooms' && <RoomsTab rooms={data.locations} onChanged={onChanged} />}
                {tab === 'list' && <ListTab />}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
