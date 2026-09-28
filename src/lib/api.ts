import 'server-only'
import { NextResponse } from 'next/server'
import { requireSession } from './session'

export const json = NextResponse.json

export function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

/**
 * `since` lets a poller say "I already have version N". Returning 304 keeps the
 * steady-state cost of a live screen close to nothing.
 */
export function stateResponse<T extends { version: number }>(state: T, since: string | null) {
  if (since !== null && Number(since) === state.version) {
    return new NextResponse(null, { status: 304 })
  }
  return NextResponse.json(state, { headers: { 'Cache-Control': 'no-store' } })
}

/** Wraps an admin handler: session check first, uncaught errors never leak. */
export function guarded(handler: () => Promise<Response>) {
  return async (): Promise<Response> => {
    if (!(await requireSession())) return bad('Locked', 401)
    try {
      return await handler()
    } catch (err) {
      console.error('[admin]', err)
      return bad(err instanceof Error ? err.message : 'Something went wrong', 500)
    }
  }
}

/** Same, for public handlers — no session, same error hygiene. */
export function handled(handler: () => Promise<Response>) {
  return async (): Promise<Response> => {
    try {
      return await handler()
    } catch (err) {
      console.error('[api]', err)
      return bad('Something went wrong', 500)
    }
  }
}
