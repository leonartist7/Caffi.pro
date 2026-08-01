'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Star } from 'lucide-react'
import { toast } from 'sonner'
import { isHttpsUrl, looksLikeReviewHost } from '@/lib/orders/review-config'

const STRINGS = {
  heading: 'Review prompt',
  subheading:
    'Paste your Google, Yelp, or Facebook review link. Guests see a "leave a review" tap after a successful payment — never a private rating first.',
  placeholder: 'https://g.page/r/your-cafe/review',
  save: 'Save',
  saving: 'Saving…',
  httpsError: 'The review link must start with https://',
  hostWarning: "This doesn't look like a review-platform link — double check it before saving.",
  cleared: 'Review prompt turned off — no URL configured.',
  saved: 'Review link saved.',
}

export function ReviewSettings({ venueId }: { venueId: string }) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // A tenant switch while a request is in flight must not let the
    // previous tenant's slower response land after the new one's, and
    // must not leave Save enabled against a value that isn't this
    // venue's yet — both `cancelled` and re-arming `loading` guard that.
    let cancelled = false
    setLoading(true)
    async function load() {
      try {
        const res = await fetch(`/api/orders/review-settings?venue_id=${venueId}`)
        if (cancelled) return
        if (res.ok) {
          const body = await res.json()
          setUrl(body.review_config?.url ?? '')
        } else {
          toast.error('Could not load review settings')
        }
      } catch {
        if (!cancelled) toast.error('Could not load review settings')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [venueId])

  const trimmed = url.trim()
  const httpsInvalid = trimmed.length > 0 && !isHttpsUrl(trimmed)
  const hostWarning = trimmed.length > 0 && !httpsInvalid && !looksLikeReviewHost(trimmed)

  async function save() {
    if (httpsInvalid) {
      toast.error(STRINGS.httpsError)
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/orders/review-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venue_id: venueId, url: trimmed || null }),
      })
      if (res.ok) {
        toast.success(trimmed ? STRINGS.saved : STRINGS.cleared)
      } else {
        const body = await res.json().catch(() => ({}))
        toast.error(body.error || 'Could not save review settings')
      }
    } catch {
      toast.error('Could not save review settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mt-7 rounded-[26px] border border-aro-hairline bg-aro-cream-warm p-5">
      <div className="flex items-center gap-2">
        <Star className="h-5 w-5 text-aro-terra" />
        <h2 className="font-display text-2xl text-aro-espresso">{STRINGS.heading}</h2>
      </div>
      <p className="mt-1 text-sm text-aro-muted">{STRINGS.subheading}</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="url"
          value={url}
          disabled={loading}
          onChange={event => setUrl(event.target.value)}
          placeholder={STRINGS.placeholder}
          className="min-h-[44px] flex-1 rounded-2xl border border-aro-hairline bg-white/60 px-4 py-3 font-mono text-sm outline-none focus:border-aro-terra disabled:opacity-50"
        />
        <button
          type="button"
          disabled={loading || saving || httpsInvalid}
          onClick={() => void save()}
          className="min-h-[44px] shrink-0 rounded-2xl bg-aro-terra px-5 text-sm font-bold text-white disabled:opacity-50"
        >
          {saving ? STRINGS.saving : STRINGS.save}
        </button>
      </div>
      {httpsInvalid ? (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-aro-rose">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {STRINGS.httpsError}
        </p>
      ) : hostWarning ? (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-aro-saffron">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {STRINGS.hostWarning}
        </p>
      ) : null}
    </section>
  )
}
