'use client'

import { useState } from 'react'
import { c } from '@/lib/tokens'
import type { EventGuest, EventRow, Location } from '@/lib/db/types'

export function EventsTab({
  events,
  rooms,
  onChanged,
}: {
  events: EventRow[]
  rooms: Location[]
  onChanged: () => void
}) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [where, setWhere] = useState('')
  const [locationId, setLocationId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Guest lists are fetched per event rather than polled with the room —
  // a door list is read occasionally, not watched.
  const [openList, setOpenList] = useState<string | null>(null)
  const [guests, setGuests] = useState<Record<string, EventGuest[]>>({})
  const [loadingList, setLoadingList] = useState(false)

  async function toggleGuests(id: string) {
    if (openList === id) return setOpenList(null)
    setOpenList(id)
    if (guests[id]) return
    setLoadingList(true)
    const res = await fetch(`/api/admin/events/${id}/guests`, { cache: 'no-store' })
    if (res.ok) {
      const body = (await res.json()) as { guests: EventGuest[] }
      setGuests(g => ({ ...g, [id]: body.guests }))
    }
    setLoadingList(false)
  }

  async function add() {
    if (busy) return
    setBusy(true)
    const res = await fetch('/api/admin/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, date, where, location_id: locationId || null }),
    })
    setBusy(false)
    if (!res.ok) {
      setError(((await res.json()) as { error?: string }).error ?? 'That did not save')
      return
    }
    setTitle('')
    setDate('')
    setWhere('')
    setLocationId('')
    setError(null)
    onChanged()
  }

  async function remove(id: string) {
    await fetch(`/api/admin/events/${id}`, { method: 'DELETE' })
    setOpenList(null)
    onChanged()
  }

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {events.map(e => {
        const open = openList === e.id
        const list = guests[e.id]
        return (
          <div key={e.id} style={{ background: c.card, border: `1px solid ${c.hairline}`, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 44, flexShrink: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 500, color: c.bone }}>{e.day}</div>
                  <div style={{ fontSize: 10, color: c.cigar, letterSpacing: '0.2em', textTransform: 'uppercase' }}>{e.month}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: c.bone }}>{e.title}</div>
                  <div style={{ fontSize: 11, color: c.ash, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    {e.where}
                  </div>
                </div>
              </div>
              <button
                onClick={() => remove(e.id)}
                aria-label={`Remove ${e.title}`}
                className="nc-icon-btn"
                style={{ width: 34, height: 34, fontSize: 13, flexShrink: 0 }}
              >
                ✕
              </button>
            </div>

            <button
              onClick={() => toggleGuests(e.id)}
              aria-expanded={open}
              className="nc-seg"
              style={{ background: 'transparent', color: e.rsvps > 0 ? c.bone : c.ash, flex: 'none' }}
            >
              {e.rsvps} {e.rsvps === 1 ? 'RSVP' : 'RSVPs'}
              {e.rsvps > 0 && (open ? ' — hide list' : ' — see who')}
            </button>

            {open && (
              <div style={{ borderTop: `1px solid ${c.hairline}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {loadingList && !list && (
                  <div style={{ fontSize: 11, color: c.ashDim, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Loading…</div>
                )}
                {list?.length === 0 && (
                  <div style={{ fontSize: 12, color: c.ashDim }}>Nobody has RSVP&apos;d yet.</div>
                )}
                {list?.map(g => (
                  <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12 }}>
                    <span style={{ color: c.bone }}>{g.name}</span>
                    <span style={{ color: c.ash, overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.email}</span>
                  </div>
                ))}
                {list && list.length > 0 && (
                  <a
                    href={`mailto:?bcc=${encodeURIComponent(list.map(g => g.email).join(','))}&subject=${encodeURIComponent(`Nightcrawler — ${e.title}`)}`}
                    style={{ fontSize: 10, color: c.accent, letterSpacing: '0.18em', textTransform: 'uppercase', paddingTop: 4 }}
                  >
                    Email everyone ↗
                  </a>
                )}
              </div>
            )}
          </div>
        )
      })}

      <div style={{ background: c.card, border: `1px dashed ${c.umber}`, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Event title" aria-label="Event title" className="nc-input" />
        <div style={{ display: 'flex', gap: 10 }}>
          <input value={date} onChange={e => setDate(e.target.value)} placeholder="Date (e.g. 22 Aug)" aria-label="Date" className="nc-input" style={{ flex: 1, minWidth: 0 }} />
          <input value={where} onChange={e => setWhere(e.target.value)} placeholder="Where (e.g. New York — 8p)" aria-label="Where" className="nc-input" style={{ flex: 1, minWidth: 0 }} />
        </div>
        <select
          value={locationId}
          onChange={e => setLocationId(e.target.value)}
          aria-label="Room"
          className="nc-input"
          style={{ cursor: 'pointer', color: locationId ? c.bone : c.ashDim }}
        >
          <option value="">All rooms</option>
          {rooms.map(r => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <button onClick={add} disabled={busy} className="nc-btn nc-btn-primary" style={{ fontSize: 11, letterSpacing: '0.18em', padding: 14 }}>
          {busy ? '…' : 'Add event'}
        </button>
        {error && (
          <div role="alert" style={{ fontSize: 11, color: c.accent }}>
            {error}
          </div>
        )}
      </div>

      <div style={{ fontSize: 11, color: c.ashDim, lineHeight: 1.7, padding: '8px 4px' }}>
        &ldquo;Where&rdquo; is the line customers read on the site. The room below it is what the event is filed
        under — leave it on all rooms for brand-wide nights.
      </div>
    </div>
  )
}
