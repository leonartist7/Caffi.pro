/**
 * Venue-level tip settings, namespaced inside `venues.brand_kit` (PLAN-20),
 * mirroring `lib/site-profile.ts`'s `brand_kit.site_profile` pattern so no
 * migration is needed for owner-configurable tip behaviour.
 *
 * Pure functions, no Supabase import — safe to import from a client
 * component (the checkout form needs `shouldPromptTip`).
 */

export type OrderType = 'pickup' | 'dine_in' | 'delivery'

export interface TipConfig {
  /** Delivery orders default to no tip prompt unless the venue opts in. */
  delivery_enabled: boolean
  /** Percentages of subtotal offered as one-tap presets. */
  presets_pct: number[]
}

export const DEFAULT_TIP_CONFIG: TipConfig = {
  delivery_enabled: false,
  presets_pct: [15, 18, 20],
}

/**
 * Fat-finger sanity ceiling, not a business decision — generous enough for
 * a genuine 100%+ tip, tight enough to catch a dollars-entered-as-cents
 * mistake. Mirrors the SQL guard in `create_storefront_order` exactly; the
 * SQL check is the source of truth, this is only for a friendly inline
 * message before the network round trip.
 */
export function maxTipCents(subtotalCents: number): number {
  return Math.max(subtotalCents * 3, 5000)
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function parseTipConfig(brandKit: unknown): TipConfig {
  const kit = (brandKit && typeof brandKit === 'object' ? brandKit : {}) as Record<string, unknown>
  const raw = (
    kit.tip_config && typeof kit.tip_config === 'object' ? kit.tip_config : {}
  ) as Record<string, unknown>

  const presets = Array.isArray(raw.presets_pct)
    ? raw.presets_pct
        .map(value => num(value))
        .filter((value): value is number => value !== null && value > 0 && value <= 100)
    : null

  return {
    delivery_enabled: raw.delivery_enabled === true,
    presets_pct: presets && presets.length ? presets : DEFAULT_TIP_CONFIG.presets_pct,
  }
}

/** Dine-in and pickup always prompt; delivery only if the venue opts in. */
export function shouldPromptTip(orderType: OrderType, config: TipConfig): boolean {
  if (orderType === 'delivery') return config.delivery_enabled
  return true
}
