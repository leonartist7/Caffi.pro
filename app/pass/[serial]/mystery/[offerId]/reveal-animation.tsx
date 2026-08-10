'use client'

import { useEffect, useState } from 'react'

/**
 * PLAN-17 — the reveal is purely decorative: the prize prop is already
 * final (drawn and persisted server-side before this component ever
 * mounts). This animates *disclosing* it, never *deciding* it.
 * `prefers-reduced-motion` skips straight to the revealed state — the
 * prize is identical either way, only the transition is optional.
 */
export function RevealAnimation({ prizeLabel }: { prizeLabel: string }) {
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      setRevealed(true)
      return
    }
    const timer = window.setTimeout(() => setRevealed(true), 900)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <div className="my-6 flex flex-col items-center">
      <div
        className={`w-32 h-32 rounded-2xl bg-aro-terra flex items-center justify-center transition-transform duration-700 motion-reduce:transition-none ${
          revealed ? 'scale-100 rotate-0' : 'scale-90 rotate-3'
        }`}
      >
        <span className="text-5xl" aria-hidden="true">
          {revealed ? '🎉' : '?'}
        </span>
      </div>
      <p
        className={`mt-4 font-display text-2xl font-bold text-aro-ink text-center transition-opacity duration-500 motion-reduce:transition-none ${
          revealed ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {prizeLabel}
      </p>
    </div>
  )
}
