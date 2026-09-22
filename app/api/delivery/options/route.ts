import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { simulationEnabled } from '@/lib/delivery/provider'
import { handled, json } from '@/lib/delivery/http'

export async function GET(request: Request) {
  return handled(async () => {
    const slug = new URL(request.url).searchParams.get('venue_slug')
    if (!slug || slug.length > 100) return json({ modes: [] })
    const { data } = await getSupabaseAdmin()
      .from('venues')
      .select('venue_id')
      .eq('slug', slug)
      .eq('kill_switch', false)
      .maybeSingle()
    if (!data || !simulationEnabled(data.venue_id)) return json({ modes: [] })
    const connections = await getSupabaseAdmin()
      .from('delivery_connections')
      .select('provider')
      .eq('venue_id', data.venue_id)
      .eq('environment', 'simulation')
      .eq('enabled', true)
    return json({
      modes: (connections.data ?? [])
        .map(c => c.provider)
        .filter(p => ['simulator', 'own_driver'].includes(p)),
    })
  })
}
