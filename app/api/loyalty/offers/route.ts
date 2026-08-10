import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireVenueRole } from '@/lib/authz'
import { emitEvent } from '@/lib/events'
import { generateOfferCode } from '@/lib/loyalty/offers'

const OFFER_COLUMNS =
  'offer_id, venue_id, member_id, program_id, code, value_cents, points_value, issued_at, expires_at, redeemed_at, status'

const MAX_CODE_ATTEMPTS = 3

export async function GET(request: NextRequest) {
  const venueId = request.nextUrl.searchParams.get('venue_id')
  const authz = await requireVenueRole(venueId, ['owner', 'manager'])
  if (!authz.ok) return authz.response

  const programId = request.nextUrl.searchParams.get('program_id')

  let query = getSupabaseAdmin()
    .from('member_offers')
    .select(OFFER_COLUMNS)
    .eq('venue_id', authz.ctx.venueId)
    .order('issued_at', { ascending: false })
  if (programId) query = query.eq('program_id', programId)

  const { data, error } = await query
  if (error) {
    console.error('[loyalty/offers] list failed:', error)
    return NextResponse.json({ error: 'Failed to load offers' }, { status: 500 })
  }
  return NextResponse.json({ offers: data ?? [] })
}

export async function POST(request: NextRequest) {
  let body: {
    venue_id?: string
    member_id?: string
    program_id?: string
    value_cents?: number | null
    points_value?: number | null
    expires_at?: string | null
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const authz = await requireVenueRole(body.venue_id, ['owner', 'manager'])
  if (!authz.ok) return authz.response

  if (!body.member_id || !body.program_id) {
    return NextResponse.json({ error: 'member_id and program_id are required' }, { status: 400 })
  }
  if (
    (body.value_cents == null || body.value_cents < 0) &&
    (body.points_value == null || body.points_value < 0)
  ) {
    return NextResponse.json(
      {
        error:
          'At least one of value_cents or points_value is required, and neither may be negative',
      },
      { status: 400 }
    )
  }

  const admin = getSupabaseAdmin()

  const [{ data: member }, { data: program }] = await Promise.all([
    admin
      .from('members')
      .select('member_id')
      .eq('member_id', body.member_id)
      .eq('tenant_id', authz.ctx.venueId)
      .maybeSingle(),
    admin
      .from('loyalty_programs')
      .select('program_id, name, status')
      .eq('program_id', body.program_id)
      .eq('venue_id', authz.ctx.venueId)
      .maybeSingle(),
  ])

  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }
  if (!program) {
    return NextResponse.json({ error: 'Program not found' }, { status: 404 })
  }
  if (program.status !== 'active') {
    return NextResponse.json({ error: 'Program is not active' }, { status: 409 })
  }

  let lastError: { code?: string; message: string } | null = null
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const { data, error } = await admin
      .from('member_offers')
      .insert({
        venue_id: authz.ctx.venueId,
        member_id: body.member_id,
        program_id: body.program_id,
        code: generateOfferCode(),
        value_cents: body.value_cents ?? null,
        points_value: body.points_value ?? null,
        expires_at: body.expires_at ?? null,
      })
      .select(OFFER_COLUMNS)
      .single()

    if (!error && data) {
      void emitEvent({
        type: 'offer.issued',
        actor: `user:${authz.ctx.user.id}`,
        venueId: authz.ctx.venueId,
        payload: {
          offer_id: data.offer_id,
          member_id: data.member_id,
          program_id: data.program_id,
        },
      })
      return NextResponse.json({ offer: data }, { status: 201 })
    }

    // 23505 on the code itself (not some other constraint) is the only
    // case worth retrying — a fresh random code fixes it. Anything else
    // is a real failure.
    if (error?.code === '23505' && error.message?.includes('code')) {
      lastError = error
      continue
    }
    console.error('[loyalty/offers] insert failed:', error)
    return NextResponse.json({ error: 'Failed to issue offer' }, { status: 500 })
  }

  console.error('[loyalty/offers] code generation exhausted retries:', lastError)
  return NextResponse.json({ error: 'Failed to issue offer — try again' }, { status: 500 })
}
