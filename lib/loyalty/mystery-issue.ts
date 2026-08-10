import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { isValidMysteryConfig, drawPrize, type MysteryPrize } from './mystery'
import { issueMemberOffer } from './issue'
import { emitEvent } from '@/lib/events'

const DEFAULT_VISIT_THRESHOLD = 5

/**
 * PLAN-17 — called from `app/api/counter/visit/route.ts` exactly when a
 * genuinely new visit lands (`wasNew`), for every visit count, not just
 * the first. Fires a reveal-eligible offer each time the member's visit
 * count crosses a multiple of the venue's configured threshold — a
 * recurring mechanic ("every 5th visit"), not a one-time bonus.
 *
 * The prize is drawn HERE, server-side, once, before any reveal UI has
 * been requested — `drawPrize` (pure) takes the one real `Math.random()`
 * call this whole feature makes. `period_key = 'mystery:<visitCount>'`
 * makes a specific threshold-crossing idempotent (a replayed visit insert
 * — impossible per `/api/counter/visit`'s own `client_uuid` dedup, but
 * defense in depth matching this module's siblings — can't draw twice
 * for the same crossing).
 */
export async function issueMysteryPrizeOnVisit(
  admin: SupabaseClient,
  venueId: string,
  memberId: string,
  visitCount: number
): Promise<void> {
  const { data: program } = await admin
    .from('loyalty_programs')
    .select('program_id, config')
    .eq('venue_id', venueId)
    .eq('type', 'mystery')
    .eq('status', 'active')
    .maybeSingle()
  if (!program) return

  const config = (program.config ?? {}) as { prizes?: unknown; visit_threshold?: number }
  if (!isValidMysteryConfig(config.prizes)) return
  const prizes = config.prizes as MysteryPrize[]

  const threshold =
    typeof config.visit_threshold === 'number' && config.visit_threshold > 0
      ? Math.floor(config.visit_threshold)
      : DEFAULT_VISIT_THRESHOLD
  if (visitCount % threshold !== 0) return

  const prize = drawPrize(prizes, Math.random())

  const result = await issueMemberOffer(admin, {
    venueId,
    memberId,
    programId: program.program_id,
    pointsValue: prize.pointsValue ?? null,
    valueCents: prize.valueCents ?? null,
    prizeLabel: prize.label,
    periodKey: `mystery:${visitCount}`,
  })

  if (result.issued) {
    void emitEvent({
      type: 'offer.issued',
      actor: 'system:mystery',
      venueId,
      payload: {
        offer_id: result.offer.offerId,
        member_id: memberId,
        program_id: program.program_id,
        visit_count: visitCount,
      },
    })
  } else if (result.reason === 'error') {
    console.error('[mystery-issue] failed:', result.message)
  }
}
