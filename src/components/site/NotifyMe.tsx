'use client'

import { useState } from 'react'
import { c } from '@/lib/tokens'

/**
 * Sold-out capture. The product id rides along as `interest` so the client can
 * mail the people who wanted that exact drop.
 */
export function NotifyMe({ productId, productName }: { productId: string; productName: string }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setState('saving')
    const res = await fetch('/api/subscribers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, interest: productId }),
    })
    if (res.ok) {
      setState('done')
    } else {
      setMessage(((await res.json()) as { error?: string }).error ?? 'That did not save')
      setState('error')
    }
  }

  if (state === 'done') {
    return (
      <div style={{ fontSize: 11, color: c.live, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '11px 0' }}>
        ✦ We&apos;ll let you know
      </div>
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="nc-btn nc-btn-notify"
        style={{ fontSize: 10, letterSpacing: '0.2em', padding: 11 }}
      >
        Notify me
      </button>
    )
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <input
        type="email"
        required
        autoFocus
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com"
        aria-label={`Email me when ${productName} is back`}
        className="nc-input"
        style={{ fontSize: 12, padding: '11px 12px' }}
      />
      <button type="submit" disabled={state === 'saving'} className="nc-btn nc-btn-add" style={{ fontSize: 10, letterSpacing: '0.2em', padding: 11 }}>
        {state === 'saving' ? 'Saving…' : 'Tell me when it lands'}
      </button>
      {state === 'error' && <div style={{ fontSize: 11, color: c.accent }}>{message}</div>}
    </form>
  )
}
