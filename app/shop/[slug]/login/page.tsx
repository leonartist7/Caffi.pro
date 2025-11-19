'use client'

import React from 'react'
import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Coffee, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react'
import { signInWithEmail } from '@/lib/auth-customer'

export default function LoginPage() {
  const router = useRouter()
  const params = useParams()
  const tenantSlug = params.slug as string

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { user, error } = await signInWithEmail(email, password)

      if (error) {
        setError(error.message || 'Failed to sign in')
        setLoading(false)
        return
      }

      if (user) {
        // Redirect to shop home or previous page
        router.push(`/shop/${tenantSlug}`)
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-coffee-700 to-coffee-800 rounded-full mb-4">
            <Coffee className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-coffee-900 dark:text-white mb-2">Welcome Back</h1>
          <p className="text-coffee-600 dark:text-coffee-300">
            Sign in to your account to continue
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-lg rounded-2xl shadow-xl border border-coffee-200/50 dark:border-dark-700 p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Alert */}
            {error && (
              <div className="flex items-start gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-coffee-900 dark:text-white mb-2"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-coffee-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-coffee-200 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-900 text-coffee-900 dark:text-white placeholder-coffee-400 dark:placeholder-dark-500 focus:border-coffee-700 dark:focus:border-coffee-500 focus:outline-none focus:ring-2 focus:ring-coffee-700/20"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-coffee-900 dark:text-white mb-2"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-coffee-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-coffee-200 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-900 text-coffee-900 dark:text-white placeholder-coffee-400 dark:placeholder-dark-500 focus:border-coffee-700 dark:focus:border-coffee-500 focus:outline-none focus:ring-2 focus:ring-coffee-700/20"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <Link
                href={`/shop/${tenantSlug}/forgot-password`}
                className="text-sm text-coffee-700 dark:text-coffee-300 hover:text-coffee-800 dark:hover:text-coffee-200 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-coffee-700 hover:bg-coffee-800 disabled:bg-coffee-400 text-white py-3 rounded-lg font-bold text-lg transition-colors shadow-lg disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-coffee-200 dark:border-dark-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white dark:bg-dark-800 text-coffee-500 dark:text-coffee-400">
                Don't have an account?
              </span>
            </div>
          </div>

          {/* Sign Up Link */}
          <Link
            href={`/shop/${tenantSlug}/signup`}
            className="block w-full text-center py-3 border-2 border-coffee-700 dark:border-coffee-600 text-coffee-700 dark:text-coffee-300 rounded-lg font-bold hover:bg-coffee-50 dark:hover:bg-dark-700 transition-colors"
          >
            Create Account
          </Link>
        </div>

        {/* Back to Home Link */}
        <div className="text-center mt-6">
          <Link
            href={`/shop/${tenantSlug}`}
            className="text-sm text-coffee-600 dark:text-coffee-300 hover:text-coffee-800 dark:hover:text-coffee-100 transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
