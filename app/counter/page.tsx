'use client'

import { useEffect, useState } from 'react'
import { hasSupabaseEnv } from '@/utils/supabase/client'
import { CounterScreen } from './counter-screen'

interface CounterState {
  authenticated: boolean
  venue_id?: string
  staff_name?: string | null
  device?: string
  expires_at?: string
}

/**
 * Staff counter mode. PIN login (Phase 2) → two-tap visit/redeem screen
 * (Plan 3). On session expiry mid-shift, an overlay asks for the PIN again
 * WITHOUT unmounting CounterScreen — the offline queue and current search
 * must survive re-auth (Plan 3 step 8).
 */
export default function CounterPage() {
  const [session, setSession] = useState<CounterState | null>(null)
  const [venueSlug, setVenueSlug] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [reauthNeeded, setReauthNeeded] = useState(false)

  const envReady = hasSupabaseEnv()

  useEffect(() => {
    fetch('/api/counter/session')
      .then(r => (r.ok ? r.json() : { authenticated: false }))
      .then(setSession)
      .catch(() => setSession({ authenticated: false }))
      .finally(() => setChecking(false))
  }, [])

  async function doLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/counter/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venue_slug: venueSlug.trim(),
          pin,
          device: navigator.userAgent.slice(0, 64),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')
      setSession({
        authenticated: true,
        venue_id: data.venue.venue_id,
        staff_name: data.staff_name,
        expires_at: data.expires_at,
      })
      setPin('')
      setReauthNeeded(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/counter/logout', { method: 'POST' })
    setSession({ authenticated: false })
    setReauthNeeded(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-accent flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        {checking ? (
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <p className="text-center text-gray-400 py-8">Checking session…</p>
          </div>
        ) : session?.authenticated ? (
          <div className="relative">
            <CounterScreen onSessionExpired={() => setReauthNeeded(true)} />
            {reauthNeeded && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full">
                  <h2 className="text-xl font-bold text-primary mb-1 text-center">
                    Session expired
                  </h2>
                  <p className="text-sm text-gray-500 text-center mb-6">
                    Re-enter the PIN to keep going — nothing is lost.
                  </p>
                  <form onSubmit={doLogin} className="space-y-4">
                    {error && <p className="text-sm text-red-600 text-center">{error}</p>}
                    <input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]{4,8}"
                      required
                      autoFocus
                      value={pin}
                      onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary outline-none text-center text-2xl tracking-[0.5em]"
                      placeholder="••••"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-primary text-white font-semibold py-3 px-6 rounded-xl disabled:opacity-50"
                    >
                      {loading ? 'Checking…' : 'Continue'}
                    </button>
                  </form>
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="absolute top-2 right-2 text-xs text-gray-400 underline z-40"
            >
              end session
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-primary mb-1">Counter mode</h1>
              <p className="text-gray-600 text-sm">Shared-PIN staff login</p>
            </div>

            {!envReady && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-xl">
                <p className="text-sm font-semibold text-amber-800">
                  STUBBED — needs live Supabase
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  PIN login verifies against the venue&apos;s staff memberships. Set the Supabase
                  env keys (see .env.example) to enable it.
                </p>
              </div>
            )}

            <form onSubmit={doLogin} className="space-y-4">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
              <div>
                <label htmlFor="venue" className="block text-sm font-medium text-gray-700 mb-2">
                  Venue
                </label>
                <input
                  id="venue"
                  type="text"
                  required
                  value={venueSlug}
                  onChange={e => setVenueSlug(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  placeholder="the-roastery"
                />
              </div>
              <div>
                <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-2">
                  Staff PIN
                </label>
                <input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]{4,8}"
                  required
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-center text-2xl tracking-[0.5em]"
                  placeholder="••••"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !envReady}
                className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Checking…' : 'Open counter'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Owner or manager?{' '}
                <a href="/login" className="text-primary hover:underline">
                  Sign in with email
                </a>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
