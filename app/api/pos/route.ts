import { NextResponse } from 'next/server'
import { requireVenueRole } from '@/lib/authz'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: Request) {
  const venueId = new URL(request.url).searchParams.get('venue_id')
  const gate = await requireVenueRole(venueId,['owner','manager'])
  if (!gate.ok) return gate.response
  const admin = getSupabaseAdmin()
  const [connections, submissions] = await Promise.all([
    admin.from('pos_connections')
      .select('id,provider,environment,enabled,health,menu_version,last_sync_at')
      .eq('venue_id',gate.ctx.venueId).order('created_at'),
    admin.from('pos_submissions')
      .select('id,order_id,state,external_ref,safe_error,created_at,updated_at')
      .eq('venue_id',gate.ctx.venueId).order('created_at',{ ascending:false }).limit(100),
  ])
  if (connections.error || submissions.error)
    return NextResponse.json({ error: 'POS queue unavailable' }, { status: 503 })
  return NextResponse.json(
    { connections: connections.data ?? [], submissions: submissions.data ?? [] },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
