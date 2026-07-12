import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireRowVenueRole } from '@/lib/authz'
import { emitEvent } from '@/lib/events'

const REWARD_COLUMNS =
  'reward_id, tenant_id, name, description, points_required, image_url, reward_type, reward_value, stock_limit, stock_remaining, is_active, created_at'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireRowVenueRole('rewards', 'reward_id', params.id, ['owner', 'manager'])
  if (!gate.ok) return gate.response

  let body: {
    name?: string
    description?: string
    points_required?: number
    image_url?: string
    reward_type?: string
    stock_limit?: number | null
    stock_remaining?: number | null
    is_active?: boolean
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}
  if (body.name !== undefined) {
    if (!body.name.trim()) {
      return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 })
    }
    update.name = body.name.trim()
  }
  if (body.description !== undefined) update.description = body.description || null
  if (body.points_required !== undefined) {
    if (!Number.isFinite(body.points_required) || body.points_required <= 0) {
      return NextResponse.json(
        { error: 'points_required must be a positive number' },
        { status: 400 }
      )
    }
    update.points_required = body.points_required
  }
  if (body.image_url !== undefined) update.image_url = body.image_url || null
  if (body.reward_type !== undefined) {
    if (!['coupon', 'free_item', 'discount'].includes(body.reward_type)) {
      return NextResponse.json(
        { error: 'reward_type must be coupon, free_item or discount' },
        { status: 400 }
      )
    }
    update.reward_type = body.reward_type
  }
  if (body.stock_limit !== undefined) update.stock_limit = body.stock_limit
  if (body.stock_remaining !== undefined) update.stock_remaining = body.stock_remaining
  if (body.is_active !== undefined) update.is_active = Boolean(body.is_active)

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('rewards')
    .update(update)
    .eq('reward_id', params.id)
    .select(REWARD_COLUMNS)
    .single()

  if (error || !data) {
    console.error('[rewards] update failed:', error)
    return NextResponse.json({ error: 'Failed to update reward' }, { status: 500 })
  }

  void emitEvent({
    type: 'reward.updated',
    actor: `user:${gate.ctx.user.id}`,
    venueId: gate.ctx.venueId,
    payload: { reward_id: params.id, fields: Object.keys(update) },
  })

  return NextResponse.json({ reward: data })
}

/**
 * DELETE is a hard delete, but only when the reward has never been
 * redeemed — redemptions.reward_id is ON DELETE RESTRICT, so the DB
 * itself would reject this anyway; this check exists to return a clear
 * 409 instead of a raw foreign-key-violation error. A redeemed reward
 * should be deactivated (PATCH { is_active: false }) instead.
 */
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireRowVenueRole('rewards', 'reward_id', params.id, ['owner', 'manager'])
  if (!gate.ok) return gate.response

  const admin = getSupabaseAdmin()
  const { count } = await admin
    .from('redemptions')
    .select('redemption_id', { count: 'exact', head: true })
    .eq('reward_id', params.id)

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: 'This reward has been redeemed before — deactivate instead of deleting.' },
      { status: 409 }
    )
  }

  const { error } = await admin.from('rewards').delete().eq('reward_id', params.id)
  if (error) {
    console.error('[rewards] delete failed:', error)
    return NextResponse.json({ error: 'Failed to delete reward' }, { status: 500 })
  }

  void emitEvent({
    type: 'reward.deleted',
    actor: `user:${gate.ctx.user.id}`,
    venueId: gate.ctx.venueId,
    payload: { reward_id: params.id },
  })
  return NextResponse.json({ ok: true })
}
