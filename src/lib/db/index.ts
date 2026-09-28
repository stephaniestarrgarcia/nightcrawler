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

export const driver: Driver = usingSupabase ? supabaseDriver : localDriver

export * from './types'
