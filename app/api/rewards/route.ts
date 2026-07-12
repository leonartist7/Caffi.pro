import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireVenueRole } from '@/lib/authz'
import { emitEvent } from '@/lib/events'

/**
 * HQ rewards API — server-side replacement for the old browser-direct
 * `rewards_catalog` queries in /rewards. That name is now a read-only
 * compat view (SELECT-only grant); writes go through the underlying
 * `rewards` table here instead, service-role, so aro_admin can manage a
 * client's catalog on their behalf (rewards' own RLS write policies only
 * cover the venue's own owner/manager, not platform staff).
 */

const REWARD_COLUMNS =
  'reward_id, tenant_id, name, description, points_required, image_url, reward_type, reward_value, stock_limit, stock_remaining, is_active, created_at'

export async function GET(request: NextRequest) {
  const venueId = request.nextUrl.searchParams.get('venue_id')
  const authz = await requireVenueRole(venueId, ['owner', 'manager'])
  if (!authz.ok) return authz.response

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('rewards')
    .select(REWARD_COLUMNS)
    .eq('tenant_id', authz.ctx.venueId)
    .order('points_required', { ascending: true })

  if (error) {
    console.error('[rewards] list failed:', error)
    return NextResponse.json({ error: 'Failed to load rewards' }, { status: 500 })
  }
  return NextResponse.json({ rewards: data ?? [] })
}

export async function POST(request: NextRequest) {
  let body: {
    venue_id?: string
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

  const authz = await requireVenueRole(body.venue_id, ['owner', 'manager'])
  if (!authz.ok) return authz.response

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }
  if (!Number.isFinite(body.points_required) || (body.points_required as number) <= 0) {
    return NextResponse.json(
      { error: 'points_required must be a positive number' },
      { status: 400 }
    )
  }
  const rewardType = body.reward_type ?? 'free_item'
  if (!['coupon', 'free_item', 'discount'].includes(rewardType)) {
    return NextResponse.json(
      { error: 'reward_type must be coupon, free_item or discount' },
      { status: 400 }
    )
  }

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('rewards')
    .insert({
      tenant_id: authz.ctx.venueId,
      name: body.name.trim(),
      description: body.description || null,
      points_required: body.points_required,
      image_url: body.image_url || null,
      reward_type: rewardType,
      reward_value: {},
      stock_limit: body.stock_limit ?? null,
      stock_remaining: body.stock_remaining ?? null,
      is_active: body.is_active ?? true,
    })
    .select(REWARD_COLUMNS)
    .single()

  if (error || !data) {
    console.error('[rewards] insert failed:', error)
    return NextResponse.json({ error: 'Failed to create reward' }, { status: 500 })
  }

  void emitEvent({
    type: 'reward.created',
    actor: `user:${authz.ctx.user.id}`,
    venueId: authz.ctx.venueId,
    payload: { reward_id: data.reward_id, name: data.name },
  })

  return NextResponse.json({ reward: data }, { status: 201 })
}
