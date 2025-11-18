'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Coffee, Mail, Lock, User, AlertCircle, Loader2, CheckCircle } from 'lucide-react'
import { signUpWithEmail } from '@/lib/auth-customer'

export default function SignUpPage() {
  const router = useRouter()
  const params = useParams()
  const tenantSlug = params.slug as string

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    // Validate password strength
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      const { user, error } = await signUpWithEmail(email, password, fullName)

      if (error) {
        setError(error.message || 'Failed to create account')
        setLoading(false)
        return
      }

      if (user) {
        // Show success message
        setSuccess(true)
        setLoading(false)

        // Redirect after a short delay
        setTimeout(() => {
          router.push(`/shop/${tenantSlug}`)
          router.refresh()
        }, 2000)
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-lg rounded-2xl shadow-xl border border-coffee-200/50 dark:border-dark-700 p-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-coffee-900 dark:text-white mb-2">
              Account Created!
            </h2>
            <p className="text-coffee-600 dark:text-coffee-300 mb-4">
              Welcome! Redirecting you to the shop...
            </p>
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-coffee-600" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-coffee-700 to-coffee-800 rounded-full mb-4">
            <Coffee className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-coffee-900 dark:text-white mb-2">
            Create Account
          </h1>
          <p className="text-coffee-600 dark:text-coffee-300">Join us and start earning rewards</p>
        </div>

        {/* Sign Up Form */}
        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-lg rounded-2xl shadow-xl border border-coffee-200/50 dark:border-dark-700 p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Alert */}
            {error && (
              <div className="flex items-start gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
              </div>
            )}

            {/* Full Name Field */}
            <div>
              <label
                htmlFor="fullName"
                className="block text-sm font-medium text-coffee-900 dark:text-white mb-2"
              >
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-coffee-400" />
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-coffee-200 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-900 text-coffee-900 dark:text-white placeholder-coffee-400 dark:placeholder-dark-500 focus:border-coffee-700 dark:focus:border-coffee-500 focus:outline-none focus:ring-2 focus:ring-coffee-700/20"
                  placeholder="John Doe"
                />
              </div>
            </div>

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
                  minLength={6}
                  className="w-full pl-10 pr-4 py-3 border border-coffee-200 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-900 text-coffee-900 dark:text-white placeholder-coffee-400 dark:placeholder-dark-500 focus:border-coffee-700 dark:focus:border-coffee-500 focus:outline-none focus:ring-2 focus:ring-coffee-700/20"
                  placeholder="••••••••"
                />
              </div>
              <p className="mt-1 text-xs text-coffee-500 dark:text-coffee-400">
                Must be at least 6 characters
              </p>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-coffee-900 dark:text-white mb-2"
              >
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-coffee-400" />
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-coffee-200 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-900 text-coffee-900 dark:text-white placeholder-coffee-400 dark:placeholder-dark-500 focus:border-coffee-700 dark:focus:border-coffee-500 focus:outline-none focus:ring-2 focus:ring-coffee-700/20"
                  placeholder="••••••••"
                />
              </div>
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
                  Creating account...
                </>
              ) : (
                'Create Account'
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
                Already have an account?
              </span>
            </div>
          </div>

          {/* Sign In Link */}
          <Link
            href={`/shop/${tenantSlug}/login`}
            className="block w-full text-center py-3 border-2 border-coffee-700 dark:border-coffee-600 text-coffee-700 dark:text-coffee-300 rounded-lg font-bold hover:bg-coffee-50 dark:hover:bg-dark-700 transition-colors"
          >
            Sign In
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
