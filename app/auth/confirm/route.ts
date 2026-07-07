import { NextRequest, NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/server'

/**
 * Magic-link / OTP landing. Supabase redirects here with either a
 * `token_hash` (+ `type`) or a PKCE `code`; we exchange it for a cookie
 * session and forward to `next` (default: dashboard).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  const redirectTo = (path: string) => NextResponse.redirect(new URL(path, origin))

  try {
    const supabase = createClient()

    if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
      if (!error) return redirectTo(next)
      console.error('[auth/confirm] verifyOtp failed:', error.message)
    } else if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) return redirectTo(next)
      console.error('[auth/confirm] code exchange failed:', error.message)
    }
  } catch (err) {
    console.error('[auth/confirm] error:', err)
  }

  return redirectTo('/login?error=confirm')
}
