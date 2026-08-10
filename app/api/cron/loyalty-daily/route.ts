import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { runBirthdayAnniversaryForAllVenues } from '@/lib/loyalty/birthday-anniversary-issue'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * GET /api/cron/loyalty-daily — Vercel Cron target (see `vercel.json`),
 * `Authorization: Bearer <CRON_SECRET>`. A missing `CRON_SECRET` renders
 * the visible-stub state (503, explicit body) rather than either running
 * unauthenticated or silently no-op'ing — the aro doctrine
 * (`MASTER-PLAN-aro.md`) that a missing key is never a quiet failure.
 *
 * Idempotent by design, not just by intent: every offer this issues goes
 * through `issueMemberOffer`'s `period_key` dedup
 * (`uq_member_offers_program_member_period`), so a retried or
 * accidentally-doubled cron invocation on the same day issues nothing
 * extra — safe to re-run, safe to also trigger by hand (the owner "run
 * now" button hits the same underlying function, not a copy of it).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: 'STUBBED — needs CRON_SECRET set in the environment' },
      { status: 503 }
    )
  }

  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()
  const results = await runBirthdayAnniversaryForAllVenues(admin)

  return NextResponse.json({
    ok: true,
    venuesProcessed: results.length,
    birthdayIssued: results.reduce((sum, r) => sum + r.birthdayIssued, 0),
    anniversaryIssued: results.reduce((sum, r) => sum + r.anniversaryIssued, 0),
  })
}
