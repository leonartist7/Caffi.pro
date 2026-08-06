import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { isAroAdminUser } from '@/lib/authz'
import { StaffPageClient } from './staff-client'

/**
 * Server-gated wrapper (PLAN-34): a staff-only member (no owner/manager
 * membership anywhere) has no business on the team-management surface —
 * wrong-door redirect to /counter, not a 403 wall after the page shell
 * has already rendered. owner/manager/aro_admin all pass through
 * unchanged; the client component below still does its own per-request
 * data fetch scoped to whatever tenant is selected.
 */
export const dynamic = 'force-dynamic'

export default async function StaffPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const isAroAdmin = await isAroAdminUser(user.id)
  if (!isAroAdmin) {
    const admin = getSupabaseAdmin()
    const { data: memberships } = await admin
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('is_active', true)
    const roles = new Set((memberships ?? []).map(m => m.role))
    if (!roles.has('owner') && !roles.has('manager')) {
      redirect('/counter')
    }
  }

  return <StaffPageClient />
}
