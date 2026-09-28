'use client'

import { useState } from 'react'
import { c, display } from '@/lib/tokens'
import { Photo } from './Photo'

export function Newsletter() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setState('saving')
    const res = await fetch('/api/subscribers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    if (res.ok) {
      setState('done')
    } else {
      setMessage(((await res.json()) as { error?: string }).error ?? 'That did not save')
      setState('error')
    }
  }

  return (
    <section style={{ background: c.card, borderTop: `1px solid ${c.hairline}` }}>
      <div
        className="nc-section nc-feed"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 70, alignItems: 'start' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="nc-eyebrow">From the feed</div>
            <h2 style={{ fontFamily: display, fontSize: 52, color: c.bone, lineHeight: 1, transform: 'rotate(-2deg)', margin: 0, fontWeight: 400 }}>
              Follow the night
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {['IG post', 'IG post', 'YT thumbnail'].map((hint, i) => (
              <div key={i} style={{ aspectRatio: '1' }}>
                <Photo url={null} alt={hint} hint={hint} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              ['https://instagram.com', 'Instagram ↗'],
              ['https://youtube.com', 'YouTube ↗'],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                style={{ border: `1px solid ${c.umber}`, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', padding: '12px 24px', color: c.bone }}
              >
                {label}
              </a>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="nc-eyebrow">The list</div>
            <h2 style={{ fontFamily: display, fontSize: 52, color: c.bone, lineHeight: 1, transform: 'rotate(-2deg)', margin: 0, fontWeight: 400 }}>
              First to know
            </h2>
          </div>
          <p style={{ fontSize: 14, color: c.ash, lineHeight: 1.7, maxWidth: 400, margin: 0 }}>
            Drops, events, and reserve batches — before they hit the menu. No noise, once a week at most.
          </p>

          {state === 'done' ? (
            <div style={{ border: `1px solid ${c.accent}`, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ color: c.accent, fontSize: 20 }}>✦</span>
              <span style={{ color: c.bone, fontSize: 14 }}>You&apos;re on the list. See you after dark.</span>
            </div>
          ) : (
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex' }}>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  aria-label="Email address"
                  className="nc-input nc-input--lg"
                  style={{ borderRight: 'none', padding: '16px 18px' }}
                />
                <button type="submit" disabled={state === 'saving'} className="nc-btn nc-btn-primary" style={{ padding: '16px 30px', whiteSpace: 'nowrap' }}>
                  {state === 'saving' ? '…' : 'Join'}
                </button>
              </div>
              {state === 'error' && <div style={{ fontSize: 12, color: c.accent }}>{message}</div>}
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
