import { notFound, redirect } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export default async function TableEntryPage({ params }: { params: { token: string } }) {
  const admin = getSupabaseAdmin()
  const { data: table } = await admin
    .from('venue_tables')
    .select('venue_id')
    .eq('qr_token', params.token)
    .eq('is_active', true)
    .maybeSingle()
  if (!table) notFound()
  const { data: venue } = await admin
    .from('venues')
    .select('slug')
    .eq('venue_id', table.venue_id)
    .maybeSingle()
  if (!venue) notFound()
  redirect(`/shop/${venue.slug}/menu?table=${encodeURIComponent(params.token)}`)
}
