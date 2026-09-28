'use client'

import { useEffect, useState } from 'react'
import { c, display } from '@/lib/tokens'
import { formatPrice, parsePrice } from '@/lib/money'
import type { FlowerType, Product, ProductKind, Status } from '@/lib/db/types'
import { PhotoUpload } from './PhotoUpload'

type AdminProduct = Product & { status: Status }

const STATUSES: { label: string; value: Status; on: string; text: string }[] = [
  { label: 'Live', value: 'Available', on: c.live, text: c.card },
  { label: 'Sold out', value: 'Sold out', on: c.accent, text: c.card },
  { label: 'Hidden', value: 'Hidden', on: c.bone, text: c.card },
]

const TYPES: FlowerType[] = ['Indica', 'Sativa', 'Hybrid', 'Pre-rolls']

interface Draft {
  name: string
  price: string
  type: FlowerType | null
  thc: string
  weight: string
  sizes: string
  description: string
}

function toDraft(p: AdminProduct): Draft {
  return {
    name: p.name,
    price: formatPrice(p.price_cents),
    type: p.type,
    thc: p.thc ?? '',
    weight: p.weight ?? '',
    sizes: p.sizes.join(', '),
    description: p.description ?? '',
  }
}

export function ProductsTab({
  kind,
  products,
  locationId,
  onChanged,
}: {
  kind: ProductKind
  products: AdminProduct[]
  locationId: string
  onChanged: () => void
}) {
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [error, setError] = useState<string | null>(null)
  const isFlower = kind === 'flower'

  // If the row being edited disappears (deleted here or in another room's
  // session), drop the editor rather than leaving a draft pointing at nothing.
  useEffect(() => {
    if (editing && !products.some(p => p.id === editing)) {
      setEditing(null)
      setDraft(null)
    }
  }, [products, editing])

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      setError(((await res.json()) as { error?: string }).error ?? 'That did not save')
      return false
    }
    setError(null)
    onChanged()
    return true
  }

  /** Flushes the whole draft. Called on Done, so nothing is half-saved. */
  async function save(id: string): Promise<boolean> {
    if (!draft) return true
    if (!draft.name.trim()) {
      setError('Name is required')
      return false
    }
    const price_cents = parsePrice(draft.price)
    if (price_cents === null) {
      setError('Price must be a number, like 52 or 52.50')
      return false
    }
    if (isFlower && !draft.type) {
      setError('Pick a type for this strain')
      return false
    }
    return patch(id, {
      name: draft.name.trim(),
      price_cents,
      type: isFlower ? draft.type : null,
      thc: isFlower ? draft.thc.trim() || null : null,
      weight: isFlower ? draft.weight.trim() || null : null,
      sizes: isFlower ? [] : draft.sizes.split(',').map(s => s.trim()).filter(Boolean),
      description: draft.description.trim() || null,
    })
  }

  async function toggleEdit(p: AdminProduct) {
    if (editing === p.id) {
      if (await save(p.id)) {
        setEditing(null)
        setDraft(null)
      }
      return
    }
    if (editing && !(await save(editing))) return
    setError(null)
    setEditing(p.id)
    setDraft(toDraft(p))
  }

  async function setStatus(id: string, status: Status) {
    await fetch(`/api/admin/products/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location_id: locationId, status }),
    })
    onChanged()
  }

  async function remove(id: string) {
    await fetch(`/api/admin/products/${id}`, { method: 'DELETE' })
    setEditing(null)
    setDraft(null)
    onChanged()
  }

  async function add() {
    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind }),
    })
    if (!res.ok) return
    const created = (await res.json()) as Product
    onChanged()
    setEditing(created.id)
    setDraft(toDraft({ ...created, status: 'Hidden' }))
  }

  const set = (key: keyof Draft, value: string | FlowerType | null) =>
    setDraft(d => (d ? { ...d, [key]: value } : d))

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {products.map(p => {
        const open = editing === p.id
        const statusColor = p.status === 'Available' ? c.live : p.status === 'Sold out' ? c.accent : c.ashDim
        return (
          <div
            key={p.id}
            style={{
              background: c.card,
              border: `1px solid ${c.hairline}`,
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              opacity: p.status === 'Hidden' && !open ? 0.5 : 1,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                {isFlower ? (
                  <div className="nc-display" style={{ fontFamily: display, fontSize: 26 }}>
                    {p.name}
                  </div>
                ) : (
                  <div style={{ fontSize: 14, fontWeight: 500, color: c.bone }}>{p.name}</div>
                )}
                <div style={{ fontSize: 12, color: c.cigar, letterSpacing: '0.08em' }}>
                  {isFlower
                    ? `${p.type ?? '—'} · ${formatPrice(p.price_cents)}`
                    : `${formatPrice(p.price_cents)} · slot ${p.slot ?? '—'}`}
                </div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: statusColor, whiteSpace: 'nowrap' }}>
                {p.status}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              {STATUSES.map(s => {
                const active = p.status === s.value
                return (
                  <button
                    key={s.value}
                    onClick={() => setStatus(p.id, s.value)}
                    aria-pressed={active}
                    className="nc-seg"
                    style={{ background: active ? s.on : 'transparent', color: active ? s.text : c.ash }}
                  >
                    {s.label}
                  </button>
                )
              })}
              <button
                onClick={() => toggleEdit(p)}
                className="nc-seg"
                style={{
                  flex: 'none',
                  width: 64,
                  background: open ? c.bone : 'transparent',
                  color: open ? c.card : c.bone,
                  borderColor: open ? c.bone : c.umber,
                }}
              >
                {open ? 'Done' : 'Edit'}
              </button>
            </div>

            {open && draft && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: `1px solid ${c.hairline}`, paddingTop: 14 }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    value={draft.name}
                    onChange={e => set('name', e.target.value)}
                    placeholder={isFlower ? 'Strain name' : 'Item name'}
                    aria-label="Name"
                    className="nc-input"
                    style={{ flex: 2, minWidth: 0 }}
                  />
                  <input
                    value={draft.price}
                    onChange={e => set('price', e.target.value)}
                    placeholder="$0"
                    aria-label="Price"
                    inputMode="decimal"
                    className="nc-input"
                    style={{ flex: 1, minWidth: 0 }}
                  />
                </div>

                {isFlower && (
                  <>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {TYPES.map(t => {
                        const active = draft.type === t
                        return (
                          <button
                            key={t}
                            onClick={() => set('type', t)}
                            aria-pressed={active}
                            className="nc-seg"
                            style={{
                              background: active ? c.cigar : 'transparent',
                              color: active ? c.bone : c.ash,
                              fontWeight: 400,
                              letterSpacing: '0.1em',
                              padding: '10px 2px',
                            }}
                          >
                            {t}
                          </button>
                        )
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <input
                        value={draft.thc}
                        onChange={e => set('thc', e.target.value)}
                        placeholder="THC % (e.g. 27%)"
                        aria-label="THC percentage"
                        className="nc-input"
                        style={{ flex: 1, minWidth: 0 }}
                      />
                      <input
                        value={draft.weight}
                        onChange={e => set('weight', e.target.value)}
                        placeholder="Weight (e.g. 3.5 g)"
                        aria-label="Weight"
                        className="nc-input"
                        style={{ flex: 1, minWidth: 0 }}
                      />
                    </div>
                  </>
                )}

                {!isFlower && (
                  <input
                    value={draft.sizes}
                    onChange={e => set('sizes', e.target.value)}
                    placeholder="Sizes (e.g. S, M, L, XL) — leave blank for one-size"
                    aria-label="Sizes"
                    className="nc-input"
                  />
                )}

                <textarea
                  value={draft.description}
                  onChange={e => set('description', e.target.value)}
                  placeholder={isFlower ? 'Short description — effects, terps, mood' : 'Short description — fabric, print, fit'}
                  aria-label="Description"
                  rows={3}
                  className="nc-input"
                />

                <PhotoUpload productId={p.id} photoUrl={p.photo_url} onChanged={onChanged} />

                <button
                  onClick={() => remove(p.id)}
                  className="nc-icon-btn"
                  style={{
                    alignSelf: 'flex-start',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    padding: '9px 12px',
                  }}
                >
                  {isFlower ? 'Delete strain' : 'Delete item'}
                </button>

                {error && (
                  <div role="alert" style={{ fontSize: 11, color: c.accent }}>
                    {error}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      <button onClick={add} className="nc-btn-dashed">
        + Add {isFlower ? 'strain' : 'merch item'}
      </button>

      <div style={{ fontSize: 11, color: c.ashDim, lineHeight: 1.7, padding: '8px 4px' }}>
        {isFlower
          ? 'Statuses are per-location — switch rooms up top. Name, price and description are shared across all rooms.'
          : 'One tap flips the live site — the sold-out badge appears and the button becomes “Notify me”. Hidden slots hold your next drop.'}
      </div>
    </div>
  )
}
