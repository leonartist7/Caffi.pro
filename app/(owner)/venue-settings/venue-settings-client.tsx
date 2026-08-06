'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

const STRINGS = {
  title: 'Settings',
  identityLabel: 'Venue',
  timezoneLabel: 'Timezone',
  tipSectionTitle: 'Tips on delivery orders',
  tipSectionDescription:
    'Dine-in and pickup always prompt for a tip. Delivery is off by default — turn it on if your couriers should be tipped too.',
  tipToggleOn: 'Prompting for a tip on delivery orders',
  tipToggleOff: 'Not prompting for a tip on delivery orders',
  reviewSectionTitle: 'Review link',
  reviewSectionDescription:
    'Paste the link to your Google, Yelp, or Facebook review page. Guests see a prompt to leave a review right after paying — nobody is asked for a rating first.',
  reviewPlaceholder: 'https://g.page/your-cafe/review',
  reviewInvalid: 'The review link must start with https://',
  save: 'Save',
  saving: 'Saving…',
  loadFailed: "Couldn't load settings — check your connection and try again.",
  tipSaveFailed: 'Failed to save tip settings.',
  reviewSaveFailed: 'Failed to save the review link.',
  saved: 'Saved.',
} as const

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

export function VenueSettingsClient({
  venueId,
  businessName,
  timezone,
}: {
  venueId: string
  businessName: string
  timezone: string
}) {
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [deliveryEnabled, setDeliveryEnabled] = useState(false)
  const [savingTip, setSavingTip] = useState(false)
  const [reviewUrl, setReviewUrl] = useState('')
  const [reviewUrlError, setReviewUrlError] = useState<string | null>(null)
  const [savingReview, setSavingReview] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setLoading(true)
      try {
        const [tipRes, reviewRes] = await Promise.all([
          fetch(`/api/orders/tip-settings?venue_id=${venueId}`, { signal: controller.signal }),
          fetch(`/api/orders/review-settings?venue_id=${venueId}`, { signal: controller.signal }),
        ])
        if (!tipRes.ok || !reviewRes.ok) throw new Error('load failed')
        const tipBody = await tipRes.json()
        const reviewBody = await reviewRes.json()
        setDeliveryEnabled(Boolean(tipBody.tip_config?.delivery_enabled))
        setReviewUrl(reviewBody.review_config?.url ?? '')
        setLoadFailed(false)
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('[venue-settings] load failed:', error)
          setLoadFailed(true)
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [venueId])

  async function saveTipToggle(next: boolean) {
    setSavingTip(true)
    const previous = deliveryEnabled
    setDeliveryEnabled(next)
    try {
      const res = await fetch('/api/orders/tip-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venue_id: venueId, delivery_enabled: next }),
      })
      if (!res.ok) throw new Error('save failed')
      toast.success(STRINGS.saved)
    } catch (error) {
      console.error('[venue-settings] tip save failed:', error)
      setDeliveryEnabled(previous)
      toast.error(STRINGS.tipSaveFailed)
    } finally {
      setSavingTip(false)
    }
  }

  async function saveReviewUrl() {
    const trimmed = reviewUrl.trim()
    if (trimmed && !isHttpsUrl(trimmed)) {
      setReviewUrlError(STRINGS.reviewInvalid)
      return
    }
    setReviewUrlError(null)
    setSavingReview(true)
    try {
      const res = await fetch('/api/orders/review-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venue_id: venueId, url: trimmed || null }),
      })
      if (!res.ok) throw new Error('save failed')
      toast.success(STRINGS.saved)
    } catch (error) {
      console.error('[venue-settings] review save failed:', error)
      toast.error(STRINGS.reviewSaveFailed)
    } finally {
      setSavingReview(false)
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl">
      <h1 className="font-display text-2xl font-bold text-aro-ink mb-6">{STRINGS.title}</h1>

      <div className="rounded-xl bg-white border border-aro-hairline p-4 mb-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-aro-muted">{STRINGS.identityLabel}</span>
          <span className="font-medium text-aro-ink">{businessName}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-aro-muted">{STRINGS.timezoneLabel}</span>
          <span className="font-medium text-aro-ink">{timezone}</span>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-aro-muted py-8 text-center">Loading…</p>
      ) : loadFailed ? (
        <p className="text-sm text-aro-rose py-8 text-center">{STRINGS.loadFailed}</p>
      ) : (
        <>
          <div className="rounded-xl bg-white border border-aro-hairline p-4 mb-4">
            <h2 className="font-display text-base font-semibold text-aro-ink mb-1">
              {STRINGS.tipSectionTitle}
            </h2>
            <p className="text-sm text-aro-muted mb-3">{STRINGS.tipSectionDescription}</p>
            <button
              type="button"
              role="switch"
              aria-checked={deliveryEnabled}
              disabled={savingTip}
              onClick={() => saveTipToggle(!deliveryEnabled)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition disabled:opacity-60 ${
                deliveryEnabled ? 'bg-aro-terra text-white' : 'bg-aro-sand/60 text-aro-ink-soft'
              }`}
            >
              <span>{deliveryEnabled ? STRINGS.tipToggleOn : STRINGS.tipToggleOff}</span>
              <span
                className={`relative h-5 w-9 shrink-0 rounded-full transition ${
                  deliveryEnabled ? 'bg-white/30' : 'bg-white'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${
                    deliveryEnabled ? 'left-4' : 'left-0.5'
                  } ${deliveryEnabled ? '' : 'border border-aro-hairline'}`}
                />
              </span>
            </button>
          </div>

          <div className="rounded-xl bg-white border border-aro-hairline p-4">
            <h2 className="font-display text-base font-semibold text-aro-ink mb-1">
              {STRINGS.reviewSectionTitle}
            </h2>
            <p className="text-sm text-aro-muted mb-3">{STRINGS.reviewSectionDescription}</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={reviewUrl}
                onChange={e => {
                  setReviewUrl(e.target.value)
                  setReviewUrlError(null)
                }}
                placeholder={STRINGS.reviewPlaceholder}
                className="flex-1 rounded-lg border border-aro-hairline px-3 py-2 text-sm bg-white"
              />
              <button
                type="button"
                onClick={saveReviewUrl}
                disabled={savingReview}
                className="rounded-lg bg-aro-terra px-4 py-2 text-sm font-medium text-white transition disabled:opacity-60"
              >
                {savingReview ? STRINGS.saving : STRINGS.save}
              </button>
            </div>
            {reviewUrlError && <p className="mt-1.5 text-xs text-aro-rose">{reviewUrlError}</p>}
          </div>
        </>
      )}
    </div>
  )
}
