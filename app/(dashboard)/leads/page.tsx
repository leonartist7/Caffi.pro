import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { LeadsInbox, type LeadRow } from './leads-inbox'

/**
 * HQ lead inbox (Plan 5) — aro_admin ONLY. The (dashboard) layout gates
 * login; this page adds the platform-staff role check (a venue owner who
 * is logged in must NOT see other cafés' prospects).
 */
export const dynamic = 'force-dynamic'

export default async function LeadsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: adminRows } = await admin
    .from('memberships')
    .select('membership_id')
    .eq('user_id', user.id)
    .eq('role', 'aro_admin')
    .eq('is_active', true)
    .limit(1)
  if (!adminRows || adminRows.length === 0) redirect('/dashboard')

  const { data: leads } = await admin
    .from('leads')
    .select(
      'lead_id, source, name, email, phone, venue_name, city, score, answers, status, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(200)

  return <LeadsInbox initialLeads={(leads ?? []) as LeadRow[]} />
}
