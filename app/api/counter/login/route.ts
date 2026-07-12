import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import {
  createCounterToken,
  COUNTER_COOKIE,
  COUNTER_SESSION_TTL_HOURS,
} from '@/lib/counter-session'

// Naive in-memory rate limit (per serverless instance): 5 attempts / 5 min
// per venue+IP. Good enough to blunt PIN guessing until a shared store exists.
const attempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 5 * 60 * 1000

function rateLimited(key: string): boolean {
  const now = Date.now()
  const entry = attempts.get(key)
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  entry.count += 1
  return entry.count > MAX_ATTEMPTS
}

/**
 * Shared-PIN counter login. Body: { venue_slug, pin, device? }
 * Verifies the PIN against staff memberships of that venue (bcrypt check
 * runs INSIDE Postgres via verify_counter_pin; the hash never leaves the
 * DB) and issues a short-lived signed cookie bound to venue + device.
 */
export async function POST(request: NextRequest) {
  try {
    const { venue_slug, pin, device } = await request.json()

    if (!venue_slug || typeof pin !== 'string' || !/^[0-9]{4,8}$/.test(pin)) {
      return NextResponse.json(
        { error: 'venue_slug and a 4-8 digit pin are required' },
        {
          status: 400,
        }
      )
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
    if (rateLimited(`${venue_slug}:${ip}`)) {
      return NextResponse.json(
        { error: 'Too many attempts — wait a few minutes' },
        {
          status: 429,
        }
      )
    }

    const admin = getSupabaseAdmin()
    const { data: venue, error: venueError } = await admin
      .from('venues')
      .select('venue_id, business_name, kill_switch')
      .eq('slug', venue_slug)
      .single()

    if (venueError || !venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
    }
    if (venue.kill_switch) {
      return NextResponse.json({ error: 'This venue is paused' }, { status: 403 })
    }

    const { data: match, error: pinError } = await admin.rpc('verify_counter_pin', {
      p_venue_id: venue.venue_id,
      p_pin: pin,
    })

    if (pinError) {
      console.error('[counter/login] verify_counter_pin failed:', pinError)
      return NextResponse.json({ error: 'PIN verification failed' }, { status: 500 })
    }

    const staff = Array.isArray(match) ? match[0] : match
    if (!staff?.membership_id) {
      return NextResponse.json({ error: 'Wrong PIN' }, { status: 401 })
    }

    const deviceName = typeof device === 'string' && device ? device.slice(0, 64) : 'counter'
    const { token, exp } = createCounterToken({
      membershipId: staff.membership_id,
      venueId: venue.venue_id,
      device: deviceName,
      staffName: staff.full_name ?? null,
    })

    const response = NextResponse.json({
      ok: true,
      venue: { venue_id: venue.venue_id, business_name: venue.business_name },
      staff_name: staff.full_name,
      expires_at: new Date(exp * 1000).toISOString(),
    })
    response.cookies.set(COUNTER_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: COUNTER_SESSION_TTL_HOURS * 3600,
      path: '/',
    })
    return response
  } catch (error) {
    console.error('[counter/login] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
