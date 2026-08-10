import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireVenueRole } from '@/lib/authz'
import { emitEvent } from '@/lib/events'

/**
 * PLAN-12 — loyalty program CRUD. `loyalty_programs.type` is a fixed enum
 * (accrual/bounce_back/birthday/anniversary/appreciation/winback/mystery/
 * survey/referral, from PLAN-10) — every later Lane A program type is
 * configuration on this same table, not a new one.
 */

const PROGRAM_TYPES = [
  'accrual',
  'bounce_back',
  'birthday',
  'anniversary',
  'appreciation',
  'winback',
  'mystery',
  'survey',
  'referral',
] as const

const PROGRAM_COLUMNS = 'program_id, venue_id, type, name, status, config, created_at, updated_at'

export async function GET(request: NextRequest) {
  const venueId = request.nextUrl.searchParams.get('venue_id')
  const authz = await requireVenueRole(venueId, ['owner', 'manager'])
  if (!authz.ok) return authz.response

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('loyalty_programs')
    .select(PROGRAM_COLUMNS)
    .eq('venue_id', authz.ctx.venueId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[loyalty/programs] list failed:', error)
    return NextResponse.json({ error: 'Failed to load programs' }, { status: 500 })
  }
  return NextResponse.json({ programs: data ?? [] })
}

export async function POST(request: NextRequest) {
  let body: {
    venue_id?: string
    type?: string
    name?: string
    config?: Record<string, unknown>
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const authz = await requireVenueRole(body.venue_id, ['owner', 'manager'])
  if (!authz.ok) return authz.response

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }
  if (!body.type || !PROGRAM_TYPES.includes(body.type as (typeof PROGRAM_TYPES)[number])) {
    return NextResponse.json(
      { error: `type must be one of: ${PROGRAM_TYPES.join(', ')}` },
      { status: 400 }
    )
  }

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('loyalty_programs')
    .insert({
      venue_id: authz.ctx.venueId,
      type: body.type,
      name: body.name.trim(),
      status: 'draft',
      config: body.config ?? {},
    })
    .select(PROGRAM_COLUMNS)
    .single()

  if (error || !data) {
    // UNIQUE (venue_id, type, name) — a program by that exact name+type
    // already exists for this venue.
    if (error?.code === '23505') {
      return NextResponse.json(
        { error: 'A program with this name and type already exists' },
        { status: 409 }
      )
    }
    console.error('[loyalty/programs] insert failed:', error)
    return NextResponse.json({ error: 'Failed to create program' }, { status: 500 })
  }

  void emitEvent({
    type: 'program.created',
    actor: `user:${authz.ctx.user.id}`,
    venueId: authz.ctx.venueId,
    payload: { program_id: data.program_id, type: data.type, name: data.name },
  })

  return NextResponse.json({ program: data }, { status: 201 })
}
