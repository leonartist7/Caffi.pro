import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireVenueRole } from '@/lib/authz'
import { issueMemberOffer } from '@/lib/loyalty/issue'
import { emitEvent } from '@/lib/events'

/**
 * PLAN-13 — appreciation batch issue. Owner-only (higher blast radius
 * than the single-member issue panel PLAN-12 already gates to
 * owner+manager): an owner picks a `member_status` cohort
 * (`regular`/`fading`) and a hand-approved batch of offers goes out.
 *
 * Two-phase, mirroring the fat-finger guard `MASTER-PLAN-v2R-remastered.md`
 * §6 requires above 50 recipients: `confirm: false` (or omitted) is a dry
 * run that returns the exact recipient count and issues nothing;
 * `confirm: true` actually issues, and is REQUIRED once that count is
 * above 50 — the route itself enforces this, not just the UI, so a
 * scripted call can't skip the guard.
 *
 * "Re-running the same batch does not double-issue to a member who
 * already holds an unredeemed offer from that program": this is an
 * application-level exclusion (query member_offers for
 * status = 'issued' rows on this program, subtract those member_ids from
 * the cohort), not a DB constraint — unlike redemption idempotency, this
 * is a duplicate-offer convenience for an infrequent, owner-supervised
 * action, not a money-correctness guarantee, so it doesn't need the same
 * structural bar. Stated explicitly rather than implied.
 */

const COHORT_STATUSES = ['regular', 'fading'] as const
type CohortStatus = (typeof COHORT_STATUSES)[number]
const CONFIRMATION_THRESHOLD = 50
const PAGE_SIZE = 1000

async function fetchCohortMemberIds(
  admin: ReturnType<typeof getSupabaseAdmin>,
  venueId: string,
  status: CohortStatus
): Promise<string[]> {
  const ids: string[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await admin
      .from('member_status')
      .select('member_id')
      .eq('venue_id', venueId)
      .eq('status', status)
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(`cohort lookup failed: ${error.message}`)
    for (const row of (data ?? []) as { member_id: string }[]) ids.push(row.member_id)
    if (!data || data.length < PAGE_SIZE) break
  }
  return ids
}

async function fetchMembersWithActiveOffer(
  admin: ReturnType<typeof getSupabaseAdmin>,
  programId: string
): Promise<Set<string>> {
  const ids = new Set<string>()
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await admin
      .from('member_offers')
      .select('member_id')
      .eq('program_id', programId)
      .eq('status', 'issued')
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(`active-offer lookup failed: ${error.message}`)
    for (const row of (data ?? []) as { member_id: string }[]) ids.add(row.member_id)
    if (!data || data.length < PAGE_SIZE) break
  }
  return ids
}

export async function POST(request: NextRequest) {
  let body: {
    venue_id?: string
    program_id?: string
    status?: string
    confirm?: boolean
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const authz = await requireVenueRole(body.venue_id, ['owner'])
  if (!authz.ok) return authz.response

  if (!body.program_id) {
    return NextResponse.json({ error: 'program_id is required' }, { status: 400 })
  }
  if (!body.status || !COHORT_STATUSES.includes(body.status as CohortStatus)) {
    return NextResponse.json(
      { error: `status must be one of: ${COHORT_STATUSES.join(', ')}` },
      { status: 400 }
    )
  }
  const cohortStatus = body.status as CohortStatus

  const admin = getSupabaseAdmin()
  const { data: program } = await admin
    .from('loyalty_programs')
    .select('program_id, type, status, config')
    .eq('program_id', body.program_id)
    .eq('venue_id', authz.ctx.venueId)
    .maybeSingle()

  if (!program) {
    return NextResponse.json({ error: 'Program not found' }, { status: 404 })
  }
  if (program.type !== 'appreciation') {
    return NextResponse.json(
      { error: 'Batch issue is only available for appreciation programs' },
      { status: 409 }
    )
  }
  if (program.status !== 'active') {
    return NextResponse.json({ error: 'Program is not active' }, { status: 409 })
  }

  const config = (program.config ?? {}) as {
    default_points_value?: number
    default_value_cents?: number
  }
  const pointsValue =
    typeof config.default_points_value === 'number' ? config.default_points_value : null
  const valueCents =
    typeof config.default_value_cents === 'number' ? config.default_value_cents : null
  if (pointsValue == null && valueCents == null) {
    return NextResponse.json(
      { error: 'This program has no configured points or dollar value to issue' },
      { status: 409 }
    )
  }

  let cohortIds: string[]
  let alreadyHolding: Set<string>
  try {
    ;[cohortIds, alreadyHolding] = await Promise.all([
      fetchCohortMemberIds(admin, authz.ctx.venueId, cohortStatus),
      fetchMembersWithActiveOffer(admin, program.program_id),
    ])
  } catch (err) {
    console.error('[appreciation-batch] cohort lookup failed:', err)
    return NextResponse.json({ error: 'Failed to compute the recipient list' }, { status: 500 })
  }

  const recipientIds = cohortIds.filter(id => !alreadyHolding.has(id))
  const skippedCount = cohortIds.length - recipientIds.length

  const requiresConfirmation = recipientIds.length > CONFIRMATION_THRESHOLD
  if (!body.confirm || (requiresConfirmation && !body.confirm)) {
    return NextResponse.json({
      preview: true,
      recipientCount: recipientIds.length,
      skippedCount,
      requiresConfirmation,
    })
  }

  let issuedCount = 0
  let errorCount = 0
  for (const memberId of recipientIds) {
    const result = await issueMemberOffer(admin, {
      venueId: authz.ctx.venueId,
      memberId,
      programId: program.program_id,
      valueCents,
      pointsValue,
    })
    if (result.issued) {
      issuedCount++
      void emitEvent({
        type: 'offer.issued',
        actor: `user:${authz.ctx.user.id}`,
        venueId: authz.ctx.venueId,
        payload: {
          offer_id: result.offer.offerId,
          member_id: memberId,
          program_id: program.program_id,
          batch: true,
        },
      })
    } else if (result.reason === 'error') {
      errorCount++
      console.error('[appreciation-batch] issue failed for member', memberId, result.message)
    }
  }

  return NextResponse.json({
    preview: false,
    issuedCount,
    skippedCount,
    errorCount,
    recipientCount: recipientIds.length,
  })
}
