/**
 * Kitchen display settings, namespaced inside `venues.brand_kit` (PLAN-22),
 * mirroring `lib/orders/tip-config.ts`'s pattern so no migration is needed.
 *
 * Pure functions, no Supabase import — safe to import from a client
 * component (the kitchen screen computes ticket age colour client-side).
 */

export interface KitchenConfig {
  /** Minutes until a ticket escalates sage -> saffron. */
  warnAfterMinutes: number
  /** Minutes until a ticket escalates saffron -> terra. */
  urgentAfterMinutes: number
}

export const DEFAULT_KITCHEN_CONFIG: KitchenConfig = {
  warnAfterMinutes: 5,
  urgentAfterMinutes: 12,
}

function positiveNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
}

export function parseKitchenConfig(brandKit: unknown): KitchenConfig {
  const kit = (brandKit && typeof brandKit === 'object' ? brandKit : {}) as Record<string, unknown>
  const raw = (
    kit.kitchen_config && typeof kit.kitchen_config === 'object' ? kit.kitchen_config : {}
  ) as Record<string, unknown>

  const warnAfterMinutes =
    positiveNumber(raw.warnAfterMinutes) ?? DEFAULT_KITCHEN_CONFIG.warnAfterMinutes
  const urgentAfterMinutesRaw = positiveNumber(raw.urgentAfterMinutes)
  const urgentAfterMinutes =
    urgentAfterMinutesRaw && urgentAfterMinutesRaw > warnAfterMinutes
      ? urgentAfterMinutesRaw
      : Math.max(DEFAULT_KITCHEN_CONFIG.urgentAfterMinutes, warnAfterMinutes + 1)

  return { warnAfterMinutes, urgentAfterMinutes }
}

export type TicketUrgency = 'fresh' | 'warn' | 'urgent'

/** `nowMs` is a parameter (not `Date.now()` internally) so tests can inject a clock. */
export function ticketUrgency(
  placedAt: string,
  config: KitchenConfig,
  nowMs: number = Date.now()
): TicketUrgency {
  const ageMinutes = (nowMs - new Date(placedAt).getTime()) / 60000
  if (ageMinutes >= config.urgentAfterMinutes) return 'urgent'
  if (ageMinutes >= config.warnAfterMinutes) return 'warn'
  return 'fresh'
}

export const URGENCY_CLASSES: Record<TicketUrgency, string> = {
  fresh: 'border-aro-sage bg-aro-sage/10 text-aro-ink',
  warn: 'border-aro-saffron bg-aro-saffron/15 text-aro-ink',
  urgent: 'border-aro-terra bg-aro-terra/15 text-aro-ink',
}
