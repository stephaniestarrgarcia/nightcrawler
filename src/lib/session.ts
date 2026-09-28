import 'server-only'
import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'

/**
 * Admin session: the PIN is verified on the server, never in the browser, and
 * exchanged for a signed httpOnly cookie that idles out after 15 minutes.
 */

const COOKIE = 'nc-admin'
export const IDLE_MS = 15 * 60 * 1000

const DEV_PIN = '4242'

function secret(): string {
  const configured = process.env.ADMIN_SESSION_SECRET
  if (configured) return configured
  if (process.env.NODE_ENV === 'production') {
    throw new Error('ADMIN_SESSION_SECRET must be set in production')
  }
  // Dev only: stable per process so a restart simply logs you out.
  globalThis.__ncDevSecret ??= randomBytes(32).toString('hex')
  return globalThis.__ncDevSecret
}

declare global {
  var __ncDevSecret: string | undefined
}

function equal(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

export function pinIsValid(pin: string): boolean {
  const expected = process.env.ADMIN_PIN
  if (!expected) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ADMIN_PIN must be set in production')
    }
    return equal(pin, DEV_PIN)
  }
  return equal(pin, expected)
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('hex')
}

function token(expiresAt: number): string {
  const payload = String(expiresAt)
  return `${payload}.${sign(payload)}`
}

function verify(raw: string | undefined): boolean {
  if (!raw) return false
  const [payload, mac] = raw.split('.')
  if (!payload || !mac) return false
  if (!equal(mac, sign(payload))) return false
  return Number(payload) > Date.now()
}

export async function startSession(): Promise<void> {
  const store = await cookies()
  store.set(COOKIE, token(Date.now() + IDLE_MS), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(IDLE_MS / 1000),
  })
}

export async function endSession(): Promise<void> {
  const store = await cookies()
  store.delete(COOKIE)
}

/**
 * Read-only check. Server Components may not write cookies, so rendering a
 * page uses this and leaves the idle window where it is.
 */
export async function sessionIsLive(): Promise<boolean> {
  const store = await cookies()
  return verify(store.get(COOKIE)?.value)
}

/**
 * The same check for Route Handlers, which may write: every authenticated
 * request slides the 15-minute idle window forward.
 */
export async function requireSession(): Promise<boolean> {
  const store = await cookies()
  if (!verify(store.get(COOKIE)?.value)) return false
  store.set(COOKIE, token(Date.now() + IDLE_MS), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(IDLE_MS / 1000),
  })
  return true
}
