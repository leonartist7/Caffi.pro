import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { isAroAdminUser } from '@/lib/authz'
import DashboardShell from './layout-client'

// Server-side auth gate: no session cookie → /login. Rendering of the
// dashboard shell never happens for anonymous requests.
//
// Uses getSession() (cookie-local, no network) rather than getUser() —
// middleware.ts already called getUser() against Supabase Auth earlier in
// this same request and refreshed the session cookie, so that's the
// authoritative per-request check. This is just a UX gate for rendering
// the shell; every actual data access is separately authorized in its own
// API route or server component (requireVenueRole/requireAroAdmin), which
// never trust this layout's check alone.
export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let userId: string | null = null
  try {
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()
    userId = session?.user?.id ?? null
  } catch (err) {
    // Missing env or unreachable Supabase — fail CLOSED, never open.
    console.error('[dashboard layout] auth check failed:', err)
    userId = null
  }

  if (!userId) {
    redirect('/login')
  }

  // Nav-only role check (which sidebar items to render, not an authz
  // decision — every page/route under here re-checks its own access).
  // isAroAdminUser is React-cache()'d per request, so dashboard/page.tsx's
  // own role dispatch reuses this result instead of querying again.
  let isAroAdmin = false
  try {
    isAroAdmin = await isAroAdminUser(userId)
  } catch (err) {
    console.error('[dashboard layout] role check failed:', err)
  }

  return <DashboardShell isAroAdmin={isAroAdmin}>{children}</DashboardShell>
}
