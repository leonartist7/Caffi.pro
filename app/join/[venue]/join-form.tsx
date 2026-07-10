'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CONSENT_TEXT } from '@/lib/consent'

/**
 * Join form (Plan 2): ONE contact input, optional name, CASL checkbox
 * (unchecked by default — consent is never required to join).
 *
 * Progressive enhancement: a plain <form action> POST to /api/join works
 * with zero JS (the route 303-redirects form posts to the pass page).
 * When hydrated, onSubmit upgrades to fetch for inline error handling.
 */
export function JoinForm({ venueSlug }: { venueSlug: string }) {
  const router = useRouter()
  const search = useSearchParams()
  const [error, setError] = useState<string | null>(
    search.get('error') === 'contact' ? 'Enter a valid phone number or email' : null
  )
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (submitting) return
    setError(null)
    setSubmitting(true)
    const form = new FormData(e.currentTarget)
    try {
      const res = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venue_slug: venueSlug,
          contact: form.get('contact')?.toString() ?? '',
          name: form.get('name')?.toString() || undefined,
          consent: form.get('consent') === 'on',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong — try again')
        setSubmitting(false)
        return
      }
      router.push(`/pass/${data.serial}`)
    } catch {
      setError('Connection hiccup — try again')
      setSubmitting(false)
    }
  }

  return (
    <form method="POST" action="/api/join" onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="venue_slug" value={venueSlug} />

      <div>
        <label htmlFor="contact" className="sr-only">
          Phone number or email
        </label>
        <input
          id="contact"
          name="contact"
          type="text"
          inputMode="tel"
          autoComplete="tel"
          autoFocus
          required
          placeholder="Phone number or email"
          className="w-full rounded-xl border border-aro-hairline bg-white/60 px-4 py-3.5 text-aro-ink placeholder:text-aro-muted focus:outline-none focus:ring-2 focus:ring-aro-terra text-base"
        />
      </div>

      <div>
        <label htmlFor="name" className="sr-only">
          First name (optional)
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="given-name"
          placeholder="First name (optional)"
          className="w-full rounded-xl border border-aro-hairline bg-white/60 px-4 py-3.5 text-aro-ink placeholder:text-aro-muted focus:outline-none focus:ring-2 focus:ring-aro-terra text-base"
        />
      </div>

      <label className="flex items-start gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          name="consent"
          className="mt-1 h-4 w-4 rounded border-aro-hairline accent-[#D67A45]"
        />
        <span className="text-sm text-aro-ink-soft leading-snug">{CONSENT_TEXT}</span>
      </label>

      {error && (
        <p role="alert" className="text-sm text-aro-rose font-medium">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-aro-terra text-white font-display font-bold text-lg py-3.5 hover:opacity-90 active:scale-[0.99] transition disabled:opacity-60"
      >
        {submitting ? 'Joining…' : 'Join the club'}
      </button>
    </form>
  )
}
