import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
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
  let authenticated = false
  try {
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()
    authenticated = Boolean(session?.user)
  } catch (err) {
    // Missing env or unreachable Supabase — fail CLOSED, never open.
    console.error('[dashboard layout] auth check failed:', err)
    authenticated = false
  }

  if (!authenticated) {
    redirect('/login')
  }

  return <DashboardShell>{children}</DashboardShell>
}
