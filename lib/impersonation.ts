import 'server-only'

import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { isAroAdminUser } from '@/lib/authz'

/**
 * aro_admin "Operate as this venue" impersonation.
 *
 * An aro_admin membership has venue_id NULL by design (§R4 deviation note
 * in lib/modules.ts) and the (owner) layout only ever resolves a venue for
 * owner/manager roles — so a platform operator has no way into the real
 * venue console (/home, /creative) without a second owner-role account per
 * venue. This closes that gap with a short-lived, signed, admin-only token
 * rather than granting aro_admin a standing owner-role membership (which
 * would blur the role model everywhere else that checks it).
 *
 * Cookie carries {venueId, adminUserId, exp} + an HMAC-SHA256 signature.
 * Verification re-checks isAroAdminUser on every read — a revoked admin's
 * stale cookie stops working immediately, not just at expiry.
 */

const COOKIE_NAME = 'aro_impersonation'
const TTL_SECONDS = 2 * 60 * 60 // 2 hours — long enough to review a venue, short enough to bound the risk window

interface ImpersonationPayload {
  venueId: string
  adminUserId: string
  exp: number
}

function getSecret(): string {
  const secret = process.env.IMPERSONATION_SECRET
  if (!secret) {
    throw new Error(
      'Impersonation misconfigured: IMPERSONATION_SECRET is not set. Refusing to sign or verify tokens with a placeholder.'
    )
  }
  return secret
}

function sign(payloadB64: string): string {
  return createHmac('sha256', getSecret()).update(payloadB64).digest('hex')
}

function encode(payload: ImpersonationPayload): string {
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${payloadB64}.${sign(payloadB64)}`
}

function decode(token: string): ImpersonationPayload | null {
  const [payloadB64, signature] = token.split('.')
  if (!payloadB64 || !signature) return null

  const expected = sign(payloadB64)
  const expectedBuf = Buffer.from(expected, 'hex')
  const actualBuf = Buffer.from(signature, 'hex')
  if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'))
    if (
      typeof payload?.venueId === 'string' &&
      typeof payload?.adminUserId === 'string' &&
      typeof payload?.exp === 'number'
    ) {
      return payload
    }
    return null
  } catch {
    return null
  }
}

/** Sets the signed impersonation cookie. Caller must have already passed requireAroAdmin(). */
export function startImpersonation(venueId: string, adminUserId: string): void {
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS
  const token = encode({ venueId, adminUserId, exp })
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TTL_SECONDS,
  })
}

export function endImpersonation(): void {
  cookies().delete(COOKIE_NAME)
}

/**
 * Reads and verifies the impersonation cookie for the current request.
 * Returns null on any failure (missing/expired/tampered cookie, cookie
 * belongs to a different user, or the caller is no longer aro_admin) —
 * callers fall back to the normal owner/manager resolution, never error.
 */
export async function getImpersonatedVenueId(currentUserId: string): Promise<string | null> {
  const token = cookies().get(COOKIE_NAME)?.value
  if (!token) return null

  const payload = decode(token)
  if (!payload) return null
  if (payload.adminUserId !== currentUserId) return null
  if (payload.exp < Math.floor(Date.now() / 1000)) return null

  const stillAdmin = await isAroAdminUser(currentUserId)
  if (!stillAdmin) return null

  return payload.venueId
}
