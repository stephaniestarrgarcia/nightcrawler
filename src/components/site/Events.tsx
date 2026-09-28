'use client'

import { useState } from 'react'
import { c, display } from '@/lib/tokens'
import type { EventRow } from '@/lib/db/types'

type State = { open: boolean; name: string; email: string; busy: boolean; error: string | null; done: boolean }

const blank: State = { open: false, name: '', email: '', busy: false, error: null, done: false }

export function Events({ events, onChanged }: { events: EventRow[]; onChanged: () => void }) {
  // An RSVP is free but named — a count with no door list is no use to staff.
  const [forms, setForms] = useState<Record<string, State>>({})
  const stateFor = (id: string) => forms[id] ?? blank
  const patch = (id: string, next: Partial<State>) =>
    setForms(f => ({ ...f, [id]: { ...stateFor(id), ...next } }))

  async function submit(e: React.FormEvent, id: string) {
    e.preventDefault()
    const { name, email } = stateFor(id)
    patch(id, { busy: true, error: null })
    const res = await fetch('/api/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name, email }),
    })
    if (res.ok) {
      patch(id, { busy: false, done: true, open: false })
      onChanged()
    } else {
      patch(id, { busy: false, error: ((await res.json()) as { error?: string }).error ?? 'That did not save' })
    }
  }

  return (
    <section id="events" style={{ background: c.card, borderTop: `1px solid ${c.hairline}`, borderBottom: `1px solid ${c.hairline}` }}>
      <div className="nc-section nc-events" style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 60 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="nc-eyebrow">Calendar</div>
          <h2
            className="nc-title"
            style={{ fontFamily: display, fontSize: 62, color: c.accent, lineHeight: 1, transform: 'rotate(-2deg)', margin: 0, fontWeight: 400 }}
          >
            Night moves
          </h2>
          <p style={{ fontSize: 14, color: c.ash, lineHeight: 1.7, maxWidth: 300, margin: 0 }}>
            Drops, sessions, and after-hours events across our rooms. RSVP is always free.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {events.length === 0 && (
            <div style={{ fontSize: 14, color: c.ash, padding: '24px 8px' }}>Nothing on the calendar yet.</div>
          )}
          {events.map(e => {
            const f = stateFor(e.id)
            return (
              <div key={e.id} style={{ borderBottom: `1px solid ${c.hairline}` }}>
                <div
                  className="nc-event-row"
                  style={{ display: 'grid', gridTemplateColumns: '110px 1fr auto', gap: 28, alignItems: 'center', padding: '24px 8px' }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ fontSize: 24, fontWeight: 500, color: c.bone }}>{e.day}</div>
                    <div style={{ fontSize: 11, color: c.cigar, letterSpacing: '0.2em', textTransform: 'uppercase' }}>{e.month}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ fontSize: 17, fontWeight: 500, color: c.bone }}>{e.title}</div>
                    <div style={{ fontSize: 12, color: c.ash, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{e.where}</div>
                  </div>
                  <button
                    onClick={() => patch(e.id, { open: !f.open })}
                    disabled={f.done}
                    aria-expanded={f.open}
                    className="nc-rsvp nc-btn nc-btn-add"
                    style={{
                      fontSize: 11,
                      letterSpacing: '0.2em',
                      padding: '11px 22px',
                      ...(f.done ? { background: 'none', borderColor: c.umber, color: c.live } : {}),
                    }}
                  >
                    {f.done ? "You're in" : f.open ? 'Cancel' : 'RSVP'}
                  </button>
                </div>

                {f.open && !f.done && (
                  <form
                    onSubmit={ev => submit(ev, e.id)}
                    style={{ display: 'flex', gap: 10, padding: '0 8px 24px', flexWrap: 'wrap', alignItems: 'flex-start' }}
                  >
                    <input
                      required
                      autoFocus
                      value={f.name}
                      onChange={ev => patch(e.id, { name: ev.target.value })}
                      placeholder="Your name"
                      aria-label={`Your name for ${e.title}`}
                      className="nc-input"
                      style={{ flex: '1 1 160px', width: 'auto' }}
                    />
                    <input
                      required
                      type="email"
                      value={f.email}
                      onChange={ev => patch(e.id, { email: ev.target.value })}
                      placeholder="your@email.com"
                      aria-label={`Your email for ${e.title}`}
                      className="nc-input"
                      style={{ flex: '1 1 200px', width: 'auto' }}
                    />
                    <button type="submit" disabled={f.busy} className="nc-btn nc-btn-primary" style={{ fontSize: 11, padding: '13px 24px' }}>
                      {f.busy ? '…' : 'Put me on the list'}
                    </button>
                    {f.error && (
                      <div role="alert" style={{ flexBasis: '100%', fontSize: 12, color: c.accent }}>
                        {f.error}
                      </div>
                    )}
                  </form>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
