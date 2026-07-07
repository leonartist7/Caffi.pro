'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, hasSupabaseEnv } from '@/utils/supabase/client'

type Mode = 'password' | 'magic'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [magicSent, setMagicSent] = useState(false)

  const envReady = hasSupabaseEnv()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()

      if (mode === 'password') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (signInError) throw signInError
        router.push('/dashboard')
        router.refresh()
      } else {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/confirm?next=/dashboard`,
          },
        })
        if (otpError) throw otpError
        setMagicSent(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-accent flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Logo */}
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold text-primary mb-2">
              aro<span className="font-serif italic">.club</span>
            </h1>
            <p className="text-gray-600">Sign in to your venue</p>
          </div>

          {/* Stub state: env missing — never fake a connection */}
          {!envReady && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-xl">
              <p className="text-sm font-semibold text-amber-800">STUBBED — needs live Supabase</p>
              <p className="text-xs text-amber-700 mt-1">
                Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example) to
                enable sign-in.
              </p>
            </div>
          )}

          {/* Mode toggle */}
          <div className="flex rounded-xl bg-gray-100 p-1 mb-6" role="tablist">
            {(['password', 'magic'] as Mode[]).map(m => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => {
                  setMode(m)
                  setError('')
                  setMagicSent(false)
                }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                  mode === m ? 'bg-white shadow text-primary' : 'text-gray-500'
                }`}
              >
                {m === 'password' ? 'Password' : 'Magic link'}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {magicSent ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-center">
              <p className="text-sm text-green-700">
                Check <span className="font-semibold">{email}</span> for your sign-in link.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  placeholder="you@yourcafe.com"
                />
              </div>

              {mode === 'password' && (
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !envReady}
                className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Working…' : mode === 'password' ? 'Sign in' : 'Email me a sign-in link'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Staff at the counter?{' '}
              <a href="/counter" className="text-primary hover:underline">
                Use the PIN screen
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
