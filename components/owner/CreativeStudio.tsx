'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { DraftCard, type Draft } from '@/components/owner/DraftCard'

/**
 * Creative Studio (PLAN-07 Phase 4). Every user-visible string lives here as
 * a named constant rather than inline in JSX, per the i18n-non-retrofit
 * discipline in MASTER-PLAN-v2 §R3 — someday-i18n becomes an extraction, not
 * a rewrite.
 */
const STRINGS = {
  eyebrow: 'Creative Studio',
  heading: 'Your voice, drafted',
  subheading:
    'aro writes from what your café already knows. Nothing leaves this page until you say so.',

  digestTitle: 'This week, in a sentence',
  digestLoading: 'Reading your week…',
  digestEmpty:
    'Once this week has a few visits in it, aro will summarise what moved and what slipped.',
  digestFailed: "Couldn't put this week into words just now.",

  composerTitle: 'Ask aro for a caption',
  composerHint: 'What is the post about? A special, a closure, a new bean — your words are enough.',
  composerPlaceholder: "Today's special is a maple oat latte…",
  composerAction: 'Ask aro',
  composerBusy: 'Drafting…',
  composerTooShort: 'Tell aro what the post is about first.',

  draftsTitle: 'Drafts',
  draftsEmpty: 'Your first caption will appear here the moment you ask for one.',

  imageTitle: 'Post images',
  imageBody: 'Image generation is coming. For now, captions are ready.',
  imageBadge: 'Soon',

  retry: 'Try again',
  stubbedBadge: 'STUBBED',
  stubbedBody: 'Drafting needs an API key before aro can write anything.',
}

/** Mirrors BRIEF_MAX_LENGTH in lib/ai/drafts.ts — the server is authoritative. */
const BRIEF_MAX_LENGTH = 280
const BRIEF_MIN_LENGTH = 3

type GenerateResponse = {
  draft?: Draft
  reused?: boolean
  stubbed?: boolean
  message?: string
  error?: string
  empty?: boolean
}

type DigestState =
  | { phase: 'loading' }
  | { phase: 'ready'; draft: Draft }
  | { phase: 'empty' }
  | { phase: 'stubbed'; message: string }
  | { phase: 'failed'; message: string }

export function CreativeStudio({
  venueId,
  initialDrafts,
  initialDigest,
}: {
  venueId: string
  initialDrafts: Draft[]
  initialDigest: Draft | null
}) {
  const [drafts, setDrafts] = useState<Draft[]>(initialDrafts)
  const [brief, setBrief] = useState('')
  const [generating, setGenerating] = useState(false)
  const [composerError, setComposerError] = useState<string | null>(null)
  const [composerStub, setComposerStub] = useState<string | null>(null)
  const [digest, setDigest] = useState<DigestState>(
    initialDigest ? { phase: 'ready', draft: initialDigest } : { phase: 'loading' }
  )

  // Guards the auto-generate effect against React's double-invoked effects in
  // development. The route's own venue-local-week reuse check is the real
  // protection against a duplicate row; this just avoids a wasted round trip.
  const digestRequested = useRef(initialDigest !== null)

  const generate = useCallback(
    async (kind: 'social_caption' | 'digest', text?: string): Promise<GenerateResponse | null> => {
      try {
        const res = await fetch('/api/ai-drafts/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ venue_id: venueId, kind, brief: text }),
        })
        return (await res.json()) as GenerateResponse
      } catch {
        return null
      }
    },
    [venueId]
  )

  // The digest is generated on first open of the venue-local week rather than
  // by a cron, so no background job produces summaries nobody reads.
  useEffect(() => {
    if (digestRequested.current) return
    digestRequested.current = true

    let cancelled = false
    void (async () => {
      const data = await generate('digest')
      if (cancelled) return
      if (!data) {
        setDigest({ phase: 'failed', message: STRINGS.digestFailed })
      } else if (data.stubbed) {
        setDigest({ phase: 'stubbed', message: data.message ?? STRINGS.stubbedBody })
      } else if (data.empty) {
        setDigest({ phase: 'empty' })
      } else if (data.draft) {
        setDigest({ phase: 'ready', draft: data.draft })
      } else {
        setDigest({ phase: 'failed', message: data.error ?? STRINGS.digestFailed })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [generate])

  async function askForCaption() {
    const text = brief.trim()
    if (text.length < BRIEF_MIN_LENGTH) {
      setComposerError(STRINGS.composerTooShort)
      return
    }
    setGenerating(true)
    setComposerError(null)
    setComposerStub(null)

    const data = await generate('social_caption', text)
    setGenerating(false)

    if (!data) {
      setComposerError(STRINGS.digestFailed)
      return
    }
    if (data.stubbed) {
      setComposerStub(data.message ?? STRINGS.stubbedBody)
      return
    }
    if (!data.draft) {
      setComposerError(data.error ?? STRINGS.digestFailed)
      return
    }
    setDrafts(current => [data.draft as Draft, ...current])
    setBrief('')
  }

  function onDraftResolved(draftId: string, next: Draft | null) {
    setDrafts(current =>
      next === null
        ? current.filter(d => d.draft_id !== draftId)
        : current.map(d => (d.draft_id === draftId ? next : d))
    )
  }

  const remaining = BRIEF_MAX_LENGTH - brief.length

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8 md:px-8 md:py-10">
      <header className="mb-8 md:mb-10">
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.14em] text-aro-muted">
          {STRINGS.eyebrow}
        </p>
        <h1 className="font-display text-3xl font-bold leading-tight text-aro-ink md:text-4xl">
          {STRINGS.heading}
        </h1>
        <p className="mt-3 max-w-xl text-[0.95rem] leading-relaxed text-aro-ink-soft">
          {STRINGS.subheading}
        </p>
      </header>

      <DigestPanel state={digest} />

      <section className="mb-10 rounded-2xl border border-aro-hairline bg-white p-5 md:p-6">
        <h2 className="font-display text-lg font-bold text-aro-ink">{STRINGS.composerTitle}</h2>
        <p className="mt-1 text-sm leading-relaxed text-aro-ink-soft">{STRINGS.composerHint}</p>

        <label className="mt-4 block">
          <span className="sr-only">{STRINGS.composerHint}</span>
          <textarea
            value={brief}
            onChange={e => {
              setBrief(e.target.value.slice(0, BRIEF_MAX_LENGTH))
              if (composerError) setComposerError(null)
            }}
            rows={3}
            maxLength={BRIEF_MAX_LENGTH}
            placeholder={STRINGS.composerPlaceholder}
            disabled={generating}
            className="w-full resize-y rounded-xl border border-aro-hairline bg-aro-cream-warm p-4 text-[0.95rem] leading-relaxed text-aro-ink outline-none transition placeholder:text-aro-muted/70 focus:border-aro-terra disabled:opacity-60"
          />
        </label>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={askForCaption}
            disabled={generating || brief.trim().length < BRIEF_MIN_LENGTH}
            className="rounded-xl bg-aro-terra px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
          >
            {generating ? STRINGS.composerBusy : STRINGS.composerAction}
          </button>
          {remaining <= 80 && <span className="font-mono text-xs text-aro-muted">{remaining}</span>}
        </div>

        <div aria-live="polite">
          {composerError && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p className="text-sm text-aro-rose">{composerError}</p>
              <button
                onClick={askForCaption}
                className="rounded-lg border border-aro-hairline px-3 py-1.5 text-xs font-medium text-aro-ink-soft transition hover:bg-aro-sand/50"
              >
                {STRINGS.retry}
              </button>
            </div>
          )}
          {composerStub && <StubbedNotice message={composerStub} />}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-display text-lg font-bold text-aro-ink">{STRINGS.draftsTitle}</h2>
        {drafts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-aro-hairline bg-aro-cream-warm px-6 py-10 text-center">
            <p className="text-sm text-aro-ink-soft">{STRINGS.draftsEmpty}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {drafts.map(d => (
              <DraftCard key={d.draft_id} draft={d} onResolved={onDraftResolved} />
            ))}
          </div>
        )}
      </section>

      {/* Visible stub, never omitted and never a dead button (§7.6). */}
      <section
        aria-disabled="true"
        className="rounded-2xl border border-dashed border-aro-hairline bg-aro-cream-warm/60 p-5 md:p-6"
      >
        <div className="flex items-center gap-3">
          <h2 className="font-display text-base font-bold text-aro-muted">{STRINGS.imageTitle}</h2>
          <span className="rounded-full bg-aro-sand px-2.5 py-0.5 font-mono text-[0.65rem] uppercase tracking-[0.1em] text-aro-muted">
            {STRINGS.imageBadge}
          </span>
        </div>
        <p className="mt-2 text-sm text-aro-muted">{STRINGS.imageBody}</p>
      </section>
    </div>
  )
}

function DigestPanel({ state }: { state: DigestState }) {
  return (
    <section className="mb-10 overflow-hidden rounded-2xl border border-aro-hairline bg-gradient-to-br from-aro-cream-warm to-aro-sand/50 p-6 md:p-8">
      <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.14em] text-aro-muted">
        {STRINGS.digestTitle}
      </h2>
      <div aria-live="polite">
        {state.phase === 'loading' && (
          <p className="animate-pulse text-[0.95rem] text-aro-muted">{STRINGS.digestLoading}</p>
        )}
        {state.phase === 'ready' && (
          <p className="max-w-2xl whitespace-pre-wrap font-serif text-xl italic leading-relaxed text-aro-ink md:text-2xl">
            {state.draft.output}
          </p>
        )}
        {state.phase === 'empty' && (
          <p className="max-w-xl text-[0.95rem] leading-relaxed text-aro-ink-soft">
            {STRINGS.digestEmpty}
          </p>
        )}
        {state.phase === 'failed' && (
          <p className="text-[0.95rem] text-aro-ink-soft">{state.message}</p>
        )}
        {state.phase === 'stubbed' && <StubbedNotice message={state.message} />}
      </div>
    </section>
  )
}

function StubbedNotice({ message }: { message: string }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-aro-saffron/50 bg-aro-saffron/10 px-4 py-3">
      <span className="rounded-full bg-aro-saffron/30 px-2.5 py-0.5 font-mono text-[0.65rem] uppercase tracking-[0.1em] text-aro-ink">
        {STRINGS.stubbedBadge}
      </span>
      <p className="text-sm text-aro-ink-soft">{message}</p>
    </div>
  )
}
