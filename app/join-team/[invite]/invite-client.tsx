'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, hasSupabaseEnv } from '@/utils/supabase/client'

interface InviteInfo {
  valid: boolean
  reason?: string
  email?: string
  role?: string
  venueName?: string
}

/**
 * Invite acceptance: sign up (or sign in) with the invited email, then
 * bind the pending membership via /api/invites/accept.
 */
export default function InviteClient({ token, info }: { token: string; info: InviteInfo }) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const envReady = hasSupabaseEnv()

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!info.email) return
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()

      // Try sign-in first (existing account), fall back to sign-up.
      let authed = false
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: info.email,
        password,
      })
      if (!signInError) {
        authed = true
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email: info.email,
          password,
        })
        if (signUpError) throw signUpError
        authed = true
      }

      if (authed) {
        const res = await fetch('/api/invites/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Could not accept invite')
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not accept invite')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-accent flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-primary mb-1">Join the team</h1>
            {info.valid && (
              <p className="text-gray-600 text-sm">
                You&apos;re invited as <span className="font-semibold">{info.role}</span>
                {info.venueName ? (
                  <>
                    {' '}
                    at <span className="font-semibold">{info.venueName}</span>
                  </>
                ) : null}
              </p>
            )}
          </div>

          {!info.valid ? (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl">
              <p className="text-sm text-amber-800">{info.reason}</p>
            </div>
          ) : (
            <form onSubmit={handleAccept} className="space-y-4">
              {!envReady && (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl">
                  <p className="text-sm font-semibold text-amber-800">
                    STUBBED — needs live Supabase
                  </p>
                </div>
              )}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  disabled
                  value={info.email}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Choose a password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  placeholder="At least 8 characters"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !envReady}
                className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Joining…' : 'Accept invite'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
