import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * The old fully-mocked dashboard (fake revenue figure, a fake cafe name,
 * a fake user count — none of it real) is gone. This route now just
 * dispatches by role: owner/manager -> the real (owner)/home; aro_admin
 * (HQ) -> /leads, the one real HQ surface built so far; anyone else
 * (staff-only or no membership) -> /counter, same "wrong door" pattern as
 * the (owner) layout.
 */
export const dynamic = 'force-dynamic'

export default async function DashboardHome() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: memberships } = await admin
    .from('memberships')
    .select('role')
    .eq('user_id', user.id)
    .eq('is_active', true)

  const roles = new Set((memberships ?? []).map(m => m.role))
  // aro_admin first: the platform operator's home is the HQ control center
  // (clients), even when they also hold owner memberships on demo venues.
  if (roles.has('aro_admin')) redirect('/clients')
  if (roles.has('owner') || roles.has('manager')) redirect('/home')
  redirect('/counter')
}
