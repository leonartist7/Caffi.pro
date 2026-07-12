import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

// Server component: authenticated users go to the dashboard, everyone
// else goes to /login. The old "DEVELOPMENT MODE: skip login" client
// redirect is gone — there is no auth bypass.
export const dynamic = 'force-dynamic'

export default async function Home() {
  let authenticated = false
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    authenticated = Boolean(user)
  } catch {
    authenticated = false
  }

  redirect(authenticated ? '/dashboard' : '/login')
}
