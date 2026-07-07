import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import DashboardShell from './layout-client'

// Server-side auth gate: no session cookie → /login. Rendering of the
// dashboard shell never happens for anonymous requests.
export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let authenticated = false
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    authenticated = Boolean(user)
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
