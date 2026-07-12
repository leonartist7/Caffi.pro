import { NextRequest, NextResponse } from 'next/server'
import { requireRowVenueRole } from '@/lib/authz'
import { getMemberProfile } from '@/lib/owner-stats'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { emitEvent } from '@/lib/events'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireRowVenueRole('members', 'member_id', params.id, ['owner', 'manager'])
  if (!gate.ok) return gate.response
  const member = await getMemberProfile(gate.ctx.venueId, params.id)
  return member
    ? NextResponse.json({ member })
    : NextResponse.json({ error: 'Not found' }, { status: 404 })
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireRowVenueRole('members', 'member_id', params.id, ['owner', 'manager'])
  if (!gate.ok) return gate.response
  const body = (await request.json().catch(() => null)) as {
    points_delta?: unknown
    note?: unknown
  } | null
  const pointsDelta = body?.points_delta
  if (
    !Number.isInteger(pointsDelta) ||
    pointsDelta === 0 ||
    Math.abs(pointsDelta as number) > 10000
  )
    return NextResponse.json(
      { error: 'points_delta must be a non-zero integer between -10000 and 10000' },
      { status: 400 }
    )
  const admin = getSupabaseAdmin()
  const { data: balanceRow, error: balanceError } = await admin
    .from('member_balances')
    .select('balance')
    .eq('member_id', params.id)
    .maybeSingle()
  if (balanceError) return NextResponse.json({ error: 'Failed to read balance' }, { status: 500 })
  if ((balanceRow?.balance ?? 0) + (pointsDelta as number) < 0)
    return NextResponse.json(
      { error: 'Adjustment would make the balance negative' },
      { status: 409 }
    )
  const note =
    typeof body?.note === 'string' && body.note.trim()
      ? body.note.trim().slice(0, 200)
      : 'Manual adjustment'
  const { error } = await admin.from('points_ledger').insert({
    tenant_id: gate.ctx.venueId,
    member_id: params.id,
    points_change: pointsDelta,
    reason: 'adjustment',
    description: note,
  })
  if (error) return NextResponse.json({ error: 'Failed to adjust points' }, { status: 500 })
  void emitEvent({
    type: 'points.adjusted',
    actor: `user:${gate.ctx.user.id}`,
    venueId: gate.ctx.venueId,
    payload: { member_id: params.id, points_delta: pointsDelta },
  })
  const { data: updated } = await admin
    .from('member_balances')
    .select('balance')
    .eq('member_id', params.id)
    .maybeSingle()
  return NextResponse.json({ ok: true, balance: updated?.balance ?? 0 })
}
