'use client'

import { useEffect, useState } from 'react'
import { hasSupabaseEnv } from '@/utils/supabase/client'
import { KitchenScreen } from './kitchen-screen'

const STRINGS = {
  title: 'Kitchen display',
  subtitle: 'Shared-PIN staff login',
  venueLabel: 'Venue',
  venuePlaceholder: 'the-roastery',
  pinLabel: 'Staff PIN',
  submit: 'Open kitchen display',
  submitting: 'Checking…',
  checking: 'Checking session…',
  stubbedTitle: 'STUBBED — needs live Supabase',
  stubbedBody:
    'PIN login verifies against the venue’s staff memberships. Set the Supabase env keys (see .env.example) to enable it.',
}

interface KitchenSession {
  authenticated: boolean
  venue_id?: string
}

export default function KitchenPage() {
  const [session, setSession] = useState<KitchenSession | null>(null)
  const [venueSlug, setVenueSlug] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

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
          device: `kitchen-display:${navigator.userAgent.slice(0, 48)}`,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')
      setSession({ authenticated: true, venue_id: data.venue.venue_id })
      setPin('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleSessionExpired() {
    await fetch('/api/counter/logout', { method: 'POST' })
    setSession({ authenticated: false })
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-aro-espresso">
        <p className="font-display text-2xl text-aro-cream/60">{STRINGS.checking}</p>
      </div>
    )
  }

  if (session?.authenticated) {
    return <KitchenScreen onSessionExpired={() => void handleSessionExpired()} />
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-aro-espresso p-8">
      <div className="w-full max-w-md rounded-[32px] bg-aro-cream p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <h1 className="font-display text-3xl font-bold text-aro-espresso">{STRINGS.title}</h1>
          <p className="mt-1 text-sm text-aro-muted">{STRINGS.subtitle}</p>
        </div>

        {!envReady ? (
          <div className="mb-6 rounded-2xl border border-aro-saffron/50 bg-aro-saffron/15 p-4">
            <p className="font-mono text-xs font-bold uppercase tracking-wide text-aro-saffron">
              {STRINGS.stubbedTitle}
            </p>
            <p className="mt-1 text-xs text-aro-ink">{STRINGS.stubbedBody}</p>
          </div>
        ) : null}

        <form onSubmit={doLogin} className="space-y-4">
          {error ? (
            <div className="rounded-2xl border border-aro-rose/40 bg-aro-rose/15 p-3 text-sm text-aro-ink">
              {error}
            </div>
          ) : null}
          <label className="block text-sm font-semibold text-aro-ink">
            {STRINGS.venueLabel}
            <input
              required
              value={venueSlug}
              onChange={e => setVenueSlug(e.target.value)}
              placeholder={STRINGS.venuePlaceholder}
              className="mt-2 min-h-[44px] w-full rounded-2xl border border-aro-hairline bg-white px-4 py-3 outline-none focus:border-aro-terra"
            />
          </label>
          <label className="block text-sm font-semibold text-aro-ink">
            {STRINGS.pinLabel}
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]{4,8}"
              required
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
              placeholder="••••"
              className="mt-2 min-h-[44px] w-full rounded-2xl border border-aro-hairline bg-white px-4 py-3 text-center text-2xl tracking-[0.5em] outline-none focus:border-aro-terra"
            />
          </label>
          <button
            type="submit"
            disabled={loading || !envReady}
            className="min-h-[44px] w-full rounded-full bg-aro-terra px-5 py-4 text-sm font-bold text-white disabled:opacity-50"
          >
            {loading ? STRINGS.submitting : STRINGS.submit}
          </button>
        </form>
      </div>
    </div>
  )
}
