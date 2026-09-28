'use client'

import { useEffect, useState } from 'react'
import { c } from '@/lib/tokens'

interface Row {
  email: string
  created_at: string
  /** Product names this address asked to be told about when back in stock. */
  waitingFor: string[]
}

/**
 * The mailing list. Without this the newsletter sign-ups and every "notify me"
 * tap are captured and then invisible — data nobody can act on.
 */
export function ListTab() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/admin/subscribers', { cache: 'no-store' })
      if (!res.ok) {
        setError(((await res.json()) as { error?: string }).error ?? 'Could not load the list')
        return
      }
      setRows(((await res.json()) as { subscribers: Row[] }).subscribers)
    })()
  }, [])

  const waiting = rows?.filter(r => r.waitingFor.length > 0) ?? []

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {error && (
        <div role="alert" style={{ fontSize: 12, color: c.accent }}>
          {error}
        </div>
      )}

      {!rows && !error && (
        <div style={{ fontSize: 11, color: c.ashDim, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Loading…</div>
      )}

      {rows && rows.length === 0 && (
        <div style={{ fontSize: 13, color: c.ash, lineHeight: 1.7 }}>
          Nobody on the list yet. Sign-ups from the site footer and every &ldquo;notify me&rdquo; tap land here.
        </div>
      )}

      {rows && rows.length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 2px' }}>
            <div style={{ fontSize: 11, color: c.cigar, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              {rows.length} on the list
            </div>
            <a
              href={`mailto:?bcc=${encodeURIComponent(rows.map(r => r.email).join(','))}&subject=${encodeURIComponent('Nightcrawler')}`}
              style={{ fontSize: 10, color: c.accent, letterSpacing: '0.18em', textTransform: 'uppercase' }}
            >
              Email everyone ↗
            </a>
          </div>

          {waiting.length > 0 && (
            <div style={{ background: c.card, border: `1px solid ${c.accent}`, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 11, color: c.accent, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                Waiting on a restock
              </div>
              {waiting.map(r => (
                <div key={r.email} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ fontSize: 13, color: c.bone }}>{r.email}</div>
                  <div style={{ fontSize: 11, color: c.ash }}>{r.waitingFor.join(' · ')}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ background: c.card, border: `1px solid ${c.hairline}`, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rows.map(r => (
              <div key={r.email} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12 }}>
                <span style={{ color: c.bone, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.email}</span>
                <span style={{ color: c.ashDim, whiteSpace: 'nowrap' }}>
                  {new Date(r.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ fontSize: 11, color: c.ashDim, lineHeight: 1.7, padding: '8px 4px' }}>
        Sign-ups from the site footer, plus everyone who tapped &ldquo;notify me&rdquo; on something sold out. Mark
        that item Live again and this is who to tell.
      </div>
    </div>
  )
}
