'use client'

import { useState } from 'react'

const STRINGS = {
  title: 'Bring a friend',
  subtitle: 'You both get closer to a reward when they visit for the first time.',
  shareLabel: 'Share your link',
  copyLabel: 'Copy link',
  copied: 'Copied!',
  copyFailed: 'Copy it manually — your browser blocked the clipboard.',
} as const

/**
 * PLAN-15 member loop — Web Share API where available (mobile), clipboard
 * fallback everywhere else. Works pre-hydration in the sense that nothing
 * above this component depends on JS — this block itself is inert (but
 * present, not hidden) until hydrated, same tradeoff the rest of this
 * pass page already makes for its one other client island.
 */
export function ShareReferral({ url, venueName }: { url: string; venueName: string }) {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  async function share() {
    setError(null)
    if (canShare) {
      try {
        await navigator.share({ title: `Join me at ${venueName}`, url })
        return
      } catch {
        // User canceled the share sheet, or it's unsupported at runtime
        // despite feature-detecting — fall through to clipboard.
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError(STRINGS.copyFailed)
    }
  }

  return (
    <div className="mt-6 pt-5 border-t border-aro-hairline text-left">
      <p className="text-sm font-semibold text-aro-ink mb-1">{STRINGS.title}</p>
      <p className="text-xs text-aro-muted mb-3">{STRINGS.subtitle}</p>
      <button
        type="button"
        onClick={share}
        className="w-full rounded-lg border border-aro-hairline px-4 py-2.5 text-sm font-medium text-aro-terra hover:bg-aro-sand/40"
      >
        {copied ? STRINGS.copied : canShare ? STRINGS.shareLabel : STRINGS.copyLabel}
      </button>
      {error && <p className="text-xs text-aro-rose mt-2">{error}</p>}
    </div>
  )
}
