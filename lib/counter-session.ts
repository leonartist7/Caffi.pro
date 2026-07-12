import 'server-only'

import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Short-lived staff counter session, issued after a shared-PIN login and
 * bound to a venue + device. Signed (HMAC-SHA256) cookie payload — no
 * Supabase auth user involved; the counter API routes verify this token
 * and then act via the service-role client, scoped to the bound venue.
 */
export interface CounterSession {
  membershipId: string
  venueId: string
  device: string
  staffName: string | null
  /** unix seconds */
  exp: number
}

export const COUNTER_COOKIE = 'aro_counter_session'
export const COUNTER_SESSION_TTL_HOURS = 12

function signingKey(): Buffer {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) {
    throw new Error('Counter sessions need SUPABASE_SERVICE_ROLE_KEY (see .env.example)')
  }
  // Derive a dedicated key so the raw service key never signs anything.
  return createHmac('sha256', 'aro-counter-session-v1').update(secret).digest()
}

function sign(payload: string): string {
  return createHmac('sha256', signingKey()).update(payload).digest('base64url')
}

export function createCounterToken(
  session: Omit<CounterSession, 'exp'>,
  ttlHours: number = COUNTER_SESSION_TTL_HOURS
): { token: string; exp: number } {
  const exp = Math.floor(Date.now() / 1000) + ttlHours * 3600
  const payload = Buffer.from(JSON.stringify({ ...session, exp })).toString('base64url')
  return { token: `${payload}.${sign(payload)}`, exp }
}

export function verifyCounterToken(token: string | undefined | null): CounterSession | null {
  if (!token) return null
  const dot = token.lastIndexOf('.')
  if (dot < 1) return null
  const payload = token.slice(0, dot)
  const sig = token.slice(dot + 1)

  try {
    const expected = sign(payload)
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null

    const session = JSON.parse(Buffer.from(payload, 'base64url').toString()) as CounterSession
    if (
      typeof session.membershipId !== 'string' ||
      typeof session.venueId !== 'string' ||
      typeof session.exp !== 'number' ||
      session.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null
    }
    return session
  } catch {
    return null
  }
}
