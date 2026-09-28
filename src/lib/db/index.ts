import 'server-only'
import { localDriver } from './local'
import { supabaseDriver } from './supabase'
import type { Driver } from './types'

/**
 * Supabase when it is configured, the bundled JSON store otherwise. Swapping
 * one for the other is an env change — no call site knows the difference.
 */
export const usingSupabase = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
)

function resolve(): Driver {
  if (usingSupabase) return supabaseDriver

  // The JSON store writes to the local filesystem: per-instance, wiped on
  // redeploy, read-only on most hosts. Reaching for it in a production build
  // means orders would be accepted and then quietly lost, so refuse instead.
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_LOCAL_STORE !== '1') {
    throw new Error(
      'Running a production build with no Supabase credentials. The bundled JSON store keeps ' +
        'data in a local file — it is per-instance, does not survive a redeploy, and is read-only ' +
        'on most hosts, so orders would be lost. Set NEXT_PUBLIC_SUPABASE_URL and ' +
        'SUPABASE_SERVICE_ROLE_KEY, or set ALLOW_LOCAL_STORE=1 to override deliberately.',
    )
  }
  return localDriver
}

/**
 * Resolved on first use rather than at import, so `next build` (which runs with
 * NODE_ENV=production) is unaffected and the check lands on the first request.
 */
export const driver: Driver = new Proxy({} as Driver, {
  get(_target, prop: keyof Driver) {
    const value = resolve()[prop]
    return typeof value === 'function' ? value.bind(resolve()) : value
  },
})

export * from './types'
