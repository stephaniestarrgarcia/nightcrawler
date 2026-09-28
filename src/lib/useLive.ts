'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Keeps a snapshot fresh.
 *
 * Two mechanisms, deliberately: Supabase Realtime pushes a refetch the instant
 * a row changes (when Supabase is configured), and a version-guarded poll runs
 * underneath it so the screen still converges if the socket drops, the tab
 * sleeps, or the app is running on the local JSON driver. The poll sends the
 * version it already has and the server answers 304 when nothing moved, so the
 * steady-state cost is an empty response.
 */

const TABLES = ['orders', 'products', 'product_status', 'locations', 'events'] as const

interface Options {
  /** Poll interval while the tab is visible. */
  intervalMs?: number
  /** Skip fetching entirely (e.g. admin is still locked). */
  enabled?: boolean
}

export function useLive<T extends { version: number }>(
  url: string,
  initial: T | null = null,
  { intervalMs = 5000, enabled = true }: Options = {},
) {
  const [data, setData] = useState<T | null>(initial)
  const [error, setError] = useState<string | null>(null)
  const versionRef = useRef<number>(initial?.version ?? -1)
  const inFlight = useRef(false)

  const refresh = useCallback(
    async (force = false) => {
      if (!enabled || inFlight.current) return
      inFlight.current = true
      try {
        const sep = url.includes('?') ? '&' : '?'
        const res = await fetch(force ? url : `${url}${sep}since=${versionRef.current}`, {
          cache: 'no-store',
        })
        if (res.status === 304) return
        if (!res.ok) throw new Error(`${res.status}`)
        const next = (await res.json()) as T
        versionRef.current = next.version
        setData(next)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not reach the server')
      } finally {
        inFlight.current = false
      }
    },
    [url, enabled],
  )

  // Refetch whenever the URL changes (e.g. the room picker moved).
  useEffect(() => {
    versionRef.current = -1
    void refresh(true)
  }, [refresh])

  // Poll while visible; catch up immediately on wake.
  useEffect(() => {
    if (!enabled) return
    const tick = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    const id = window.setInterval(tick, intervalMs)
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('online', tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
      window.removeEventListener('online', tick)
    }
  }, [refresh, intervalMs, enabled])

  // Supabase Realtime, when it is configured: push instead of wait.
  useEffect(() => {
    if (!enabled) return
    const url_ = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url_ || !key) return

    let cancelled = false
    let teardown: (() => void) | undefined

    void import('@supabase/supabase-js').then(({ createClient }) => {
      if (cancelled) return
      const client = createClient(url_, key, { auth: { persistSession: false } })
      const channel = client.channel('nc-live')
      for (const table of TABLES) {
        channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => void refresh())
      }
      channel.subscribe()
      teardown = () => void client.removeChannel(channel)
    })

    return () => {
      cancelled = true
      teardown?.()
    }
  }, [refresh, enabled])

  return { data, error, refresh }
}
