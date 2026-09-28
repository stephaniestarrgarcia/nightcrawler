'use client'

import { useCallback, useEffect, useState } from 'react'
import type { TrackedOrder } from '@/components/site/Tracker'
import type { Fulfillment, Stage } from './db/types'

/** What the browser remembers between visits, so the tracker survives reload. */
export interface SavedOrder {
  number: string
  proof: string
  where: string
}

const KEY = 'nc-order'

export function readSavedOrder(): SavedOrder | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as SavedOrder) : null
  } catch {
    return null
  }
}

export function saveOrder(order: SavedOrder): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(order))
  } catch {
    /* private mode — the tracker simply won't survive a reload */
  }
}

export function clearSavedOrder(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* nothing to clear */
  }
}

interface ApiOrder {
  number: string
  fulfillment: Fulfillment
  stage: Stage
  total_cents: number
  address: string | null
  items: { name: string; size: string | null; qty: number; price_cents: number }[]
}

/**
 * Polls one order. Stops once it is delivered/picked up — there is nothing
 * further to watch, and an idle tab shouldn't keep asking.
 */
export function useTrackedOrder(saved: SavedOrder | null, initial: TrackedOrder | null = null) {
  const [order, setOrder] = useState<TrackedOrder | null>(initial)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!saved) return
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(saved.number)}?p=${encodeURIComponent(saved.proof)}`, {
        cache: 'no-store',
      })
      if (!res.ok) {
        setError(((await res.json()) as { error?: string }).error ?? 'Could not load that order')
        return
      }
      const api = (await res.json()) as ApiOrder
      setOrder({ ...api, where: saved.where })
      setError(null)
    } catch {
      setError('Could not reach the server')
    }
  }, [saved])

  useEffect(() => {
    if (!saved) {
      setOrder(null)
      return
    }
    void load()
  }, [saved, load])

  useEffect(() => {
    if (!saved || (order && order.stage >= 3)) return
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load()
    }, 5000)
    return () => window.clearInterval(id)
  }, [saved, order, load])

  return { order, error, reload: load }
}
