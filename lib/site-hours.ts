import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { parseReservationConfig, type ReservationHours } from '@/lib/reservations'

export interface VenueHours {
  timezone: string
  hours: ReservationHours
}

/**
 * The site's Hours page needs the venue's weekly open/close window, but
 * `reservation_config` is PII-adjacent staff config with no public column
 * grant (PLAN-02) — only the derived open/close text may reach the browser,
 * same "derived, never the raw config" principle as the availability
 * endpoint (app/api/reservations/availability/route.ts). This is a
 * service-role read, never added to the public grant.
 */
export async function getVenueHours(venueId: string): Promise<VenueHours | null> {
  const admin = getSupabaseAdmin()
  const { data } = await admin
    .from('venues')
    .select('timezone, reservation_config')
    .eq('venue_id', venueId)
    .maybeSingle()
  if (!data) return null

  const config = parseReservationConfig(data.reservation_config)
  return { timezone: data.timezone || 'UTC', hours: config.hours }
}
