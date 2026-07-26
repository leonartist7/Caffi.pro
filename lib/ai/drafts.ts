import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { mondayStartInTz } from '@/lib/owner-stats'
import type { GeneratableDraftKind } from '@/lib/ai/provider'

/**
 * Draft persistence and the two guards around generation. Lives in lib/
 * because `app/api/**\/route.ts` may only export HTTP method handlers —
 * shared helpers cannot live beside the route that uses them.
 */

export interface StoredDraft {
  draft_id: string
  kind: string
  output: string | null
  status: string
  created_at: string
}

const DRAFT_COLUMNS = 'draft_id, kind, output, status, created_at'

/** A brief shorter than this is not a creative brief, it is a typo. */
export const BRIEF_MIN_LENGTH = 3
/** Long enough for real context, short enough to stay a brief and not an essay. */
export const BRIEF_MAX_LENGTH = 280

/** Generations per venue per rolling hour before the endpoint says no. */
export const GENERATION_RATE_LIMIT = 20
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000

/**
 * Counts this venue's recent generations from the events table rather than
 * memory — serverless instances do not share memory, so an in-process counter
 * would reset on every cold start. Same shape as app/api/join/route.ts's
 * limiter.
 *
 * Fails open: if the events table cannot be counted, a generation is allowed
 * through. The limiter exists to catch a runaway client or a bored staff
 * member, not to be a security control, and blocking real work because an
 * analytics table hiccuped is the worse failure.
 */
export async function isGenerationRateLimited(venueId: string): Promise<boolean> {
  const admin = getSupabaseAdmin()
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString()
  const { count, error } = await admin
    .from('events')
    .select('event_id', { count: 'exact', head: true })
    .eq('type', 'ai_draft.created')
    .eq('venue_id', venueId)
    .gte('ts', windowStart)

  if (error) {
    console.error('[ai] rate-limit count failed, allowing through:', error.message)
    return false
  }
  return (count ?? 0) >= GENERATION_RATE_LIMIT
}

/**
 * The current venue-local week's digest, if one already exists.
 *
 * The week boundary must be the venue's own Monday, not the server's — a café
 * in Edmonton opening its digest on Sunday evening UTC-time is still in last
 * week locally, and generating a second digest for it would both waste a call
 * and put two "this week" summaries in front of the owner.
 */
export async function findCurrentWeekDigest(
  venueId: string,
  timezone: string
): Promise<StoredDraft | null> {
  const admin = getSupabaseAdmin()
  const weekStart = mondayStartInTz(new Date(), timezone).toISOString()

  const { data } = await admin
    .from('ai_drafts')
    .select(DRAFT_COLUMNS)
    .eq('venue_id', venueId)
    .eq('kind', 'digest')
    .gte('created_at', weekStart)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data ?? null
}

/** Pending drafts for the studio list. Digests are excluded — they render separately. */
export async function listOpenDrafts(venueId: string, limit = 20): Promise<StoredDraft[]> {
  const admin = getSupabaseAdmin()
  const { data } = await admin
    .from('ai_drafts')
    .select(DRAFT_COLUMNS)
    .eq('venue_id', venueId)
    .eq('status', 'draft')
    .neq('kind', 'digest')
    .order('created_at', { ascending: false })
    .limit(limit)
  return data ?? []
}

export async function insertDraft(input: {
  venueId: string
  kind: GeneratableDraftKind
  output: string
  promptCtx: Record<string, unknown>
  /** Digests are seen-not-approved (D-6), so they land already approved. */
  status?: 'draft' | 'approved'
}): Promise<StoredDraft | null> {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('ai_drafts')
    .insert({
      venue_id: input.venueId,
      kind: input.kind,
      output: input.output,
      prompt_ctx: input.promptCtx,
      status: input.status ?? 'draft',
    })
    .select(DRAFT_COLUMNS)
    .single()

  if (error) {
    console.error('[ai] draft insert failed:', error.message)
    return null
  }
  return data
}
