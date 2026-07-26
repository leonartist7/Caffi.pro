import { NextRequest, NextResponse } from 'next/server'
import { requireVenueRole } from '@/lib/authz'
import { emitEvent } from '@/lib/events'
import { getAiProvider, AiProviderConfigurationError } from '@/lib/ai/provider'
import type { GeneratableDraftKind } from '@/lib/ai/provider'
import { getVenueAiContext } from '@/lib/ai/context'
import {
  buildSocialCaptionPrompt,
  SOCIAL_CAPTION_MAX_TOKENS,
} from '@/lib/ai/prompts/social-caption'
import { buildDigestPrompt, DIGEST_MAX_TOKENS } from '@/lib/ai/prompts/digest'
import { getVenueWeekStats } from '@/lib/owner-stats'
import {
  BRIEF_MAX_LENGTH,
  BRIEF_MIN_LENGTH,
  findCurrentWeekDigest,
  insertDraft,
  isGenerationRateLimited,
} from '@/lib/ai/drafts'

/**
 * POST /api/ai-drafts/generate — the Creative Studio generation trigger
 * (PLAN-07 Phase 3). Body: { venueId, kind: 'social_caption'|'digest', brief? }
 *
 * Step order is load-bearing: authorize before reading the body, validate
 * before spending a generation call, and check the digest-already-exists case
 * before either. Nothing here writes to `campaigns` or `messages` — this
 * release generates, it does not send.
 */
const GENERATABLE_KINDS: GeneratableDraftKind[] = ['social_caption', 'digest']

export async function POST(request: NextRequest) {
  let body: { venueId?: string; kind?: string; brief?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Authorize before touching context, the provider, or the database. The
  // client-supplied venueId is authz input, never trusted (master plan §4.1).
  const gate = await requireVenueRole(body.venueId, ['owner', 'manager'])
  if (!gate.ok) return gate.response
  const venueId = gate.ctx.venueId

  const kind = body.kind as GeneratableDraftKind | undefined
  if (!kind || !GENERATABLE_KINDS.includes(kind)) {
    return NextResponse.json(
      { error: `kind must be one of: ${GENERATABLE_KINDS.join(', ')}` },
      { status: 400 }
    )
  }

  const brief = typeof body.brief === 'string' ? body.brief.trim() : ''
  if (kind === 'social_caption') {
    if (brief.length < BRIEF_MIN_LENGTH) {
      return NextResponse.json({ error: 'Tell aro what the post is about first.' }, { status: 400 })
    }
    if (brief.length > BRIEF_MAX_LENGTH) {
      return NextResponse.json(
        { error: `Keep it under ${BRIEF_MAX_LENGTH} characters.` },
        { status: 400 }
      )
    }
  }

  const context = await getVenueAiContext(venueId)
  if (!context) {
    return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
  }

  // Cheapest possible exit: a digest for this venue-local week already exists,
  // so opening Creative Studio twice in a week costs zero generation calls.
  if (kind === 'digest') {
    const existing = await findCurrentWeekDigest(venueId, context.timezone)
    if (existing) {
      return NextResponse.json({ draft: existing, reused: true })
    }
  }

  if (await isGenerationRateLimited(venueId)) {
    return NextResponse.json(
      { error: "That's a lot of drafting for one hour — try again shortly." },
      { status: 429 }
    )
  }

  // Build the prompt and the traceability record together: promptCtx is what
  // explains, weeks later, why the model said what it said (§7.5).
  let system: string
  let prompt: string
  let maxOutputTokens: number
  const promptCtx: Record<string, unknown> = {
    business_name: context.businessName,
    tagline: context.tagline,
    timezone: context.timezone,
    kind,
  }

  if (kind === 'social_caption') {
    const built = buildSocialCaptionPrompt({
      businessName: context.businessName,
      tagline: context.tagline,
      brief,
    })
    system = built.system
    prompt = built.prompt
    maxOutputTokens = SOCIAL_CAPTION_MAX_TOKENS
    promptCtx.brief = brief
  } else {
    let stats
    try {
      stats = await getVenueWeekStats(venueId, context.timezone)
    } catch (err) {
      console.error('[ai] digest stats lookup failed:', err)
      return NextResponse.json(
        { error: "Couldn't read this week's numbers just now." },
        { status: 502 }
      )
    }
    if (!stats.hasAnyData) {
      // A digest about nothing would have to invent something to say, which
      // the voice doctrine forbids outright. Say so honestly instead.
      return NextResponse.json(
        {
          error: 'No visits yet this week — a summary needs something to summarise.',
          empty: true,
        },
        { status: 409 }
      )
    }
    const built = buildDigestPrompt({
      businessName: context.businessName,
      tagline: context.tagline,
      stats,
    })
    system = built.system
    prompt = built.prompt
    maxOutputTokens = DIGEST_MAX_TOKENS
    promptCtx.stats = stats
  }

  let result
  try {
    result = await getAiProvider().generateDraft({ kind, system, prompt, maxOutputTokens })
  } catch (err) {
    // A missing API key is a deployment fault, not a transient failure: report
    // it as a visible STUBBED state and write nothing (§7.6).
    if (err instanceof AiProviderConfigurationError) {
      return NextResponse.json({ stubbed: true, message: err.message })
    }
    console.error('[ai] generation threw:', err)
    return NextResponse.json({ error: "Couldn't draft that just now." }, { status: 502 })
  }

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 })
  }

  promptCtx.model = result.model

  const draft = await insertDraft({
    venueId,
    kind,
    output: result.output,
    promptCtx,
    // Digests are owner-facing with no send path, so they are seen rather
    // than approved (D-6) and skip the approval queue entirely.
    status: kind === 'digest' ? 'approved' : 'draft',
  })

  if (!draft) {
    return NextResponse.json({ error: 'Draft could not be saved.' }, { status: 500 })
  }

  void emitEvent({
    type: 'ai_draft.created',
    actor: `user:${gate.ctx.user.id}`,
    venueId,
    payload: { draft_id: draft.draft_id, kind, model: result.model },
  })

  return NextResponse.json({ draft, reused: false })
}
