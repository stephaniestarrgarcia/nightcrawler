'use client'

import { useEffect, useState } from 'react'
import { c, display } from '@/lib/tokens'
import type { Location } from '@/lib/db/types'

export function RoomsTab({ rooms, onChanged }: { rooms: Location[]; onChanged: () => void }) {
  const [hours, setHours] = useState<Record<string, string>>({})

  // Follow the server unless this room's field is currently being edited.
  useEffect(() => {
    setHours(current => {
      const next = { ...current }
      for (const r of rooms) if (next[r.id] === undefined) next[r.id] = r.hours
      return next
    })
  }, [rooms])

  async function patch(id: string, body: Record<string, unknown>) {
    await fetch(`/api/admin/locations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    onChanged()
  }

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {rooms.map(r => (
        <div key={r.id} style={{ background: c.card, border: `1px solid ${c.hairline}`, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
              <div className="nc-display" style={{ fontFamily: display, fontSize: 28 }}>
                {r.name}
              </div>
              <div style={{ fontSize: 12, color: c.ash, whiteSpace: 'pre-line' }}>{r.address.replace('\n', ', ')}</div>
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: r.is_open ? c.live : c.accent,
                whiteSpace: 'nowrap',
              }}
            >
              {r.is_open ? 'Open tonight' : 'Closed'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 10, color: c.ashDim, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                Tonight&apos;s hours
              </span>
              <input
                value={hours[r.id] ?? r.hours}
                onChange={e => setHours(h => ({ ...h, [r.id]: e.target.value }))}
                onBlur={e => {
                  if (e.target.value !== r.hours) void patch(r.id, { hours: e.target.value })
                }}
                className="nc-input"
              />
            </label>
            <button
              onClick={() => patch(r.id, { is_open: !r.is_open })}
              style={{
                background: 'none',
                border: `1px solid ${r.is_open ? c.umber : c.live}`,
                color: r.is_open ? c.accent : c.live,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                padding: '13px 16px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {r.is_open ? 'Close room' : 'Open room'}
            </button>
          </div>
        </div>
      ))}

      <div style={{ fontSize: 11, color: c.ashDim, lineHeight: 1.7, padding: '8px 4px' }}>
        Closing a room hides it from checkout on the live site and marks it closed on the locations section. Hours update
        instantly.
      </div>
    </div>
  )
}
