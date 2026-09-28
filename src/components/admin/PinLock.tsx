'use client'

import { useEffect, useRef, useState } from 'react'
import { c, display } from '@/lib/tokens'

/**
 * Four digits, verified on the server. The keypad only collects them — no
 * comparison happens in the browser.
 */
export function PinLock({ onUnlocked }: { onUnlocked: () => void }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  // A ref, not state: a re-render must not cancel a PIN check in flight.
  const submitting = useRef(false)

  useEffect(() => {
    if (pin.length !== 4 || submitting.current) return
    submitting.current = true
    setChecking(true)
    void (async () => {
      try {
        const res = await fetch('/api/admin/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin }),
        })
        if (res.ok) {
          onUnlocked()
        } else {
          setError(((await res.json()) as { error?: string }).error ?? 'That PIN is not recognised')
          setPin('')
        }
      } catch {
        setError('Could not reach the server')
        setPin('')
      } finally {
        submitting.current = false
        setChecking(false)
      }
    })()
  }, [pin, onUnlocked])

  // A physical keyboard is faster than the pad when the tablet is docked.
  useEffect(() => {
    const press = (key: string) => {
      setError(null)
      setPin(current => (key === '⌫' ? current.slice(0, -1) : (current + key).slice(0, 4)))
    }
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key)
      else if (e.key === 'Backspace') press('⌫')
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  function press(key: string) {
    setError(null)
    setPin(current => (key === '⌫' ? current.slice(0, -1) : (current + key).slice(0, 4)))
  }

  return (
    <div
      className="nc-rise-sm"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 28,
        padding: '40px 24px',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div className="nc-display" style={{ fontFamily: display, fontSize: 54, transform: 'rotate(-4deg)' }}>
          Nightcrawler
        </div>
        <div style={{ fontSize: 11, color: c.cigar, letterSpacing: '0.45em', textTransform: 'uppercase', paddingLeft: '0.45em' }}>
          Back of house
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12 }} aria-label={`${pin.length} of 4 digits entered`}>
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              border: `1px solid ${c.umber}`,
              background: i < pin.length ? c.accent : 'transparent',
              transition: 'background 0.15s',
            }}
          />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 76px)', gap: 12 }}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '⌫'].map(key => (
          <button
            key={key}
            onClick={() => press(key)}
            disabled={checking}
            aria-label={key === '⌫' ? 'Delete' : key}
            style={{
              height: 76,
              background: c.card,
              border: `1px solid ${c.hairline}`,
              color: c.bone,
              fontSize: 22,
              cursor: 'pointer',
              transition: 'border-color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = c.cigar)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = c.hairline)}
          >
            {key}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 11, color: error ? c.accent : c.ashDim, minHeight: 16, textAlign: 'center' }}>
        {error ?? 'Enter your 4-digit staff PIN'}
      </div>
    </div>
  )
}
