import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { generateOfferCode } from './offers'

/**
 * PLAN-13 — the automated-issuance counterpart to
 * `app/api/loyalty/offers/route.ts`'s owner-driven POST. Shared by every
 * program type that issues offers on its own trigger (bounce-back on a
 * paid order today; birthday/anniversary/survey/mystery later) rather
 * than an owner clicking "issue" — same code-retry-on-collision loop, plus
 * the one thing manual issuance doesn't need: period-scoped dedup, so a
 * retried webhook or a re-run batch can call this again for the same
 * member/program/period and get back "already issued" instead of a
 * second offer.
 */

const MAX_CODE_ATTEMPTS = 3

export interface IssueMemberOfferInput {
  venueId: string
  memberId: string
  programId: string
  valueCents?: number | null
  pointsValue?: number | null
  expiresAt?: Date | null
  validFrom?: Date | null
  /** Scopes the "at most once per member per program per period" DB
   * guarantee (`uq_member_offers_program_member_period`). Omit for a
   * one-off issuance with no periodic identity. */
  periodKey?: string | null
  /** PLAN-17 — the human-readable prize name for a mystery-draw offer
   * ("Free Pastry"); unused by every other program type. */
  prizeLabel?: string | null
}

export interface IssuedMemberOffer {
  offerId: string
  code: string
  memberId: string
  programId: string
}

export type IssueMemberOfferResult =
  | { issued: true; offer: IssuedMemberOffer }
  | { issued: false; reason: 'duplicate_period' }
  | { issued: false; reason: 'error'; message: string }

/** Distinguishes the two kinds of 23505 this insert can hit: the offer
 * `code` colliding (retry with a fresh random code) vs. the period-key
 * guarantee firing (a real duplicate — stop, don't retry, it isn't
 * transient). Postgres includes the constraint/index name in the error
 * detail, which is the only reliable way to tell them apart from here. */
function isPeriodKeyConflict(error: { message?: string; details?: string } | null): boolean {
  const text = `${error?.message ?? ''} ${error?.details ?? ''}`
  return text.includes('uq_member_offers_program_member_period')
}

export async function issueMemberOffer(
  admin: SupabaseClient,
  input: IssueMemberOfferInput
): Promise<IssueMemberOfferResult> {
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const { data, error } = await admin
      .from('member_offers')
      .insert({
        venue_id: input.venueId,
        member_id: input.memberId,
        program_id: input.programId,
        code: generateOfferCode(),
        value_cents: input.valueCents ?? null,
        points_value: input.pointsValue ?? null,
        expires_at: input.expiresAt ? input.expiresAt.toISOString() : null,
        valid_from: input.validFrom ? input.validFrom.toISOString() : null,
        period_key: input.periodKey ?? null,
        prize_label: input.prizeLabel ?? null,
      })
      .select('offer_id, code, member_id, program_id')
      .single()

    if (!error && data) {
      return {
        issued: true,
        offer: {
          offerId: data.offer_id,
          code: data.code,
          memberId: data.member_id,
          programId: data.program_id,
        },
      }
    }

    if (error?.code === '23505') {
      if (isPeriodKeyConflict(error)) {
        return { issued: false, reason: 'duplicate_period' }
      }
      // Any other 23505 on this insert is the offer `code` colliding
      // (vanishingly rare at 7 chars over a venue-scoped namespace) — a
      // fresh random code fixes it, so retry rather than fail loudly.
      continue
    }

    return { issued: false, reason: 'error', message: error?.message ?? 'insert failed' }
  }

  return { issued: false, reason: 'error', message: 'code generation exhausted retries' }
}
