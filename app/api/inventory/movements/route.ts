import { NextRequest, NextResponse } from 'next/server'
import { requireVenueRole } from '@/lib/authz'
import { emitEvent } from '@/lib/events'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

type ManualReason = 'receive' | 'waste' | 'adjust' | 'count'
const MANUAL_REASONS: ManualReason[] = ['receive', 'waste', 'adjust', 'count']

/**
 * Sign convention lives here, server-side, so the UI never has to reason
 * about negative numbers for receive/waste. `count` is special: the caller
 * sends the *observed physical total*, not a delta — the server derives
 * on-hand and computes the reconciling delta itself.
 */
async function resolveQtyAndNote(
  reason: ManualReason,
  amount: number,
  venueId: string,
  itemId: string
): Promise<{ qty: number; note: string | null } | { error: string }> {
  if (!Number.isFinite(amount)) return { error: 'amount must be a number' }

  if (reason === 'receive') return { qty: Math.abs(amount), note: null }
  if (reason === 'waste') return { qty: -Math.abs(amount), note: null }
  if (reason === 'adjust') return { qty: amount, note: null }

  // reason === 'count'
  const { data: movements, error } = await getSupabaseAdmin()
    .from('inventory_movements')
    .select('qty')
    .eq('venue_id', venueId)
    .eq('item_id', itemId)
  if (error) return { error: 'Failed to read current stock for count' }
  const currentOnHand = (movements ?? []).reduce((sum, m) => sum + m.qty, 0)
  const delta = amount - currentOnHand
  return {
    qty: delta,
    note: `Physical count: ${amount} (was ${currentOnHand})`,
  }
}

export async function POST(request: NextRequest) {
  let body: {
    venue_id?: string
    item_id?: string
    reason?: string
    amount?: number
    note?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const gate = await requireVenueRole(body.venue_id, ['owner', 'manager'])
  if (!gate.ok) return gate.response
  if (!body.item_id) return NextResponse.json({ error: 'item_id is required' }, { status: 400 })
  if (!body.reason || !MANUAL_REASONS.includes(body.reason as ManualReason)) {
    return NextResponse.json(
      { error: `reason must be one of ${MANUAL_REASONS.join(', ')}` },
      { status: 400 }
    )
  }
  if (typeof body.amount !== 'number') {
    return NextResponse.json({ error: 'amount is required' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const { data: item } = await admin
    .from('inventory_items')
    .select('item_id')
    .eq('item_id', body.item_id)
    .eq('venue_id', gate.ctx.venueId)
    .maybeSingle()
  if (!item) return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 })

  const resolved = await resolveQtyAndNote(
    body.reason as ManualReason,
    body.amount,
    gate.ctx.venueId,
    body.item_id
  )
  if ('error' in resolved) return NextResponse.json({ error: resolved.error }, { status: 400 })

  const { data, error } = await admin
    .from('inventory_movements')
    .insert({
      venue_id: gate.ctx.venueId,
      item_id: body.item_id,
      qty: resolved.qty,
      reason: body.reason,
      note: resolved.note ?? body.note?.trim() ?? null,
      membership_id: null,
    })
    .select('movement_id, qty, reason, note, created_at')
    .single()
  if (error || !data) {
    console.error('[inventory/movements] insert failed:', error)
    return NextResponse.json({ error: 'Failed to record movement' }, { status: 500 })
  }

  await emitEvent({
    type: 'inventory.movement_recorded',
    actor: `user:${gate.ctx.user.id}`,
    venueId: gate.ctx.venueId,
    payload: { item_id: body.item_id, reason: body.reason, qty: data.qty },
  })
  return NextResponse.json({ movement: data }, { status: 201 })
}
