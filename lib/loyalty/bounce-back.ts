/**
 * PLAN-13 — bounce-back window arithmetic. Pure, zero imports: given the
 * instant an order was paid and a program's configured delay/window (in
 * whole days), returns the offer's valid_from/expires_at instants. Kept
 * separate from the issuance call site so the "day 3 through day 14"
 * boundary math is unit-testable without a database.
 */

export interface BounceBackConfig {
  /** Days after payment before the offer becomes redeemable. Minimum 1 —
   * a delay of 0 is a same-visit discount, not a bounce-back. */
  delayDays: number
  /** How many days the redemption window stays open once it opens. */
  windowDays: number
}

export const DEFAULT_BOUNCE_BACK_CONFIG: BounceBackConfig = {
  delayDays: 3,
  windowDays: 11, // day 3 through day 14, inclusive of both boundaries
}

const DAY_MS = 24 * 60 * 60 * 1000

export interface BounceBackWindow {
  validFrom: Date
  expiresAt: Date
}

/** Reads delayDays/windowDays out of a loosely-typed config blob (JSONB
 * off loyalty_programs.config), falling back to the default window for
 * any missing or non-positive value rather than producing a same-day or
 * infinite offer silently. */
export function parseBounceBackConfig(
  config: Record<string, unknown> | null | undefined
): BounceBackConfig {
  const rawDelay = config?.delay_days
  const rawWindow = config?.window_days
  const delayDays =
    typeof rawDelay === 'number' && Number.isFinite(rawDelay) && rawDelay >= 1
      ? Math.floor(rawDelay)
      : DEFAULT_BOUNCE_BACK_CONFIG.delayDays
  const windowDays =
    typeof rawWindow === 'number' && Number.isFinite(rawWindow) && rawWindow >= 1
      ? Math.floor(rawWindow)
      : DEFAULT_BOUNCE_BACK_CONFIG.windowDays
  return { delayDays, windowDays }
}

/** paidAt + delayDays opens the window; it stays open for windowDays more. */
export function computeBounceBackWindow(paidAt: Date, config: BounceBackConfig): BounceBackWindow {
  const validFrom = new Date(paidAt.getTime() + config.delayDays * DAY_MS)
  const expiresAt = new Date(validFrom.getTime() + config.windowDays * DAY_MS)
  return { validFrom, expiresAt }
}
