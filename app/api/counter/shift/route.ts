import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { verifyCounterToken, COUNTER_COOKIE } from '@/lib/counter-session'
import { emitEvent } from '@/lib/events'
import { computeDurationMinutes } from '@/lib/staff-shifts'

/**
 * PLAN-35 time clock, counter-session-authenticated (same pattern as
 * /api/counter/visit). GET current status, POST clock in, PATCH clock out.
 * The DB's partial unique index (`uq_staff_shifts_open_per_membership`) is
 * the actual source of truth for "at most one open shift" — these routes
 * just react to it, never reimplement it.
 */

interface OpenShift {
  shift_id: string
  started_at: string
}

async function findOpenShift(membershipId: string): Promise<OpenShift | null> {
  const admin = getSupabaseAdmin()
  const { data } = await admin
    .from('staff_shifts')
    .select('shift_id, started_at')
    .eq('membership_id', membershipId)
    .is('ended_at', null)
    .maybeSingle()
  return data ?? null
}

export async function GET(request: NextRequest) {
  const session = verifyCounterToken(request.cookies.get(COUNTER_COOKIE)?.value)
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  const open = await findOpenShift(session.membershipId)
  return NextResponse.json({
    clocked_in: !!open,
    started_at: open?.started_at ?? null,
    shift_id: open?.shift_id ?? null,
  })
}

export async function POST(request: NextRequest) {
  const session = verifyCounterToken(request.cookies.get(COUNTER_COOKIE)?.value)
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()
  const startedAt = new Date().toISOString()
  const { data: inserted, error } = await admin
    .from('staff_shifts')
    .insert({
      venue_id: session.venueId,
      membership_id: session.membershipId,
      started_at: startedAt,
      source: 'counter',
    })
    .select('shift_id, started_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      // Already clocked in (double-tap, or a second device) — report the
      // existing open shift as success rather than erroring.
      const open = await findOpenShift(session.membershipId)
      if (open) {
        return NextResponse.json({ ok: true, clocked_in: true, started_at: open.started_at })
      }
    }
    console.error('[counter/shift] clock-in failed:', error.message)
    return NextResponse.json({ error: 'Could not clock in' }, { status: 500 })
  }

  void emitEvent({
    type: 'shift.started',
    actor: `membership:${session.membershipId}`,
    venueId: session.venueId,
    payload: { shift_id: inserted.shift_id },
  })

  return NextResponse.json({ ok: true, clocked_in: true, started_at: inserted.started_at })
}

export async function PATCH(request: NextRequest) {
  const session = verifyCounterToken(request.cookies.get(COUNTER_COOKIE)?.value)
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const open = await findOpenShift(session.membershipId)
  if (!open) {
    return NextResponse.json({ error: 'No open shift' }, { status: 404 })
  }

  const admin = getSupabaseAdmin()
  const endedAt = new Date().toISOString()
  const { error } = await admin
    .from('staff_shifts')
    .update({ ended_at: endedAt })
    .eq('shift_id', open.shift_id)
    .is('ended_at', null)

  if (error) {
    console.error('[counter/shift] clock-out failed:', error.message)
    return NextResponse.json({ error: 'Could not clock out' }, { status: 500 })
  }

  void emitEvent({
    type: 'shift.ended',
    actor: `membership:${session.membershipId}`,
    venueId: session.venueId,
    payload: {
      shift_id: open.shift_id,
      duration_minutes: computeDurationMinutes(open.started_at, endedAt),
    },
  })

  return NextResponse.json({ ok: true, clocked_in: false })
}
