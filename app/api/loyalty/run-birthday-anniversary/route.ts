import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireVenueRole } from '@/lib/authz'
import { runBirthdayAnniversaryForVenue } from '@/lib/loyalty/birthday-anniversary-issue'

/**
 * POST /api/loyalty/run-birthday-anniversary — the owner-facing "run
 * today's issues now" button. Exists so birthday/anniversary issuance is
 * testable and useful before `CRON_SECRET` is set in Vercel (the cron
 * route 503s until then) — this route needs no cron secret, only the
 * owner's own session, and calls the exact same
 * `runBirthdayAnniversaryForVenue` the cron calls, not a separate copy.
 * Safe to click twice: the underlying period-key dedup makes a same-day
 * re-run a no-op.
 */
export async function POST(request: NextRequest) {
  let body: { venue_id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const authz = await requireVenueRole(body.venue_id, ['owner'])
  if (!authz.ok) return authz.response

  const admin = getSupabaseAdmin()
  const result = await runBirthdayAnniversaryForVenue(admin, authz.ctx.venueId)

  return NextResponse.json({
    ok: true,
    birthdayIssued: result.birthdayIssued,
    anniversaryIssued: result.anniversaryIssued,
  })
}
