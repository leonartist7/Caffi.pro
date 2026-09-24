import { NextResponse } from 'next/server'
import { requireRowVenueRole } from '@/lib/authz'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const gate = await requireRowVenueRole('pos_submissions','id',params.id,['owner','manager'],'venue_id')
  if (!gate.ok) return gate.response
  let body: { reason?: string }
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const reason = body.reason?.trim()
  if (!reason || reason.length > 120)
    return NextResponse.json({ error: 'A short reason is required' }, { status: 400 })
  const { data, error } = await getSupabaseAdmin().rpc('pos_request_lookup', {
    p_submission_id: params.id, p_user_id: gate.ctx.user.id, p_reason: reason,
  })
  if (error)
    return NextResponse.json({ error: 'POS reconciliation unavailable' }, { status: 409 })
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
}
