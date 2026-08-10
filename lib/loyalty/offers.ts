/**
 * Pure offer-engine helpers (PLAN-12). Zero Supabase imports — the DB is
 * the source of truth for redemption state; this file only generates
 * codes and answers "is this expired" from data already in hand.
 * Design: docs/plans/PLAN-12-offer-engine-core.md.
 */

// Uppercase alphanumeric minus visually-ambiguous characters (0/O, 1/I/L)
// — a barista reads this off a phone screen or hears it spoken, so the
// alphabet itself rules out the most common transcription mistakes rather
// than relying on a human to get it right.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 7

/** Short, human-readable, spoken-at-the-counter offer code. */
export function generateOfferCode(): string {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  }
  return code
}

export interface OfferExpiryInput {
  status: string
  expires_at: string | null
}

/** An offer counts as expired once past its own expires_at, regardless of
 * whether the DB row has caught up to status = 'expired' yet — redemption
 * and display both need this same lazy check, not a background sweep. */
export function isOfferExpired(offer: OfferExpiryInput): boolean {
  if (offer.status !== 'issued') return offer.status === 'expired'
  if (!offer.expires_at) return false
  return new Date(offer.expires_at).getTime() < Date.now()
}
