import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * Analytics/event spine (Phase 2.3): every meaningful action lands one row
 * in the `events` table. Server-side only. Fire-and-forget by default —
 * an events failure must never break the user action that emitted it.
 */

export type AroEventType =
  | 'member.joined'
  | 'visit.recorded'
  | 'reward.redeemed'
  | 'points.adjusted'
  | 'campaign.created'
  | 'campaign.autopilot_toggled'
  | 'message.sent'
  | 'ai_draft.created'
  | 'ai_draft.approved'
  | 'invite.created'
  | 'invite.accepted'
  | 'counter.login'
  | 'lead.received'
  | 'seed.applied'
  | 'sentry.test'

export interface AroEvent {
  type: AroEventType
  /** e.g. 'membership:<uuid>', 'member:<uuid>', 'system' */
  actor?: string
  venueId?: string | null
  payload?: Record<string, unknown>
}

/**
 * Insert an event row. Await it if the caller needs certainty (crons);
 * otherwise call `void emitEvent(...)`.
 */
export async function emitEvent(event: AroEvent): Promise<void> {
  try {
    const admin = getSupabaseAdmin()
    const { error } = await admin.from('events').insert({
      type: event.type,
      actor: event.actor ?? 'system',
      venue_id: event.venueId ?? null,
      payload: event.payload ?? {},
    })
    if (error) {
      console.error('[events] insert failed:', event.type, error.message)
    }
  } catch (err) {
    // Missing env / unreachable DB: log loudly, never throw.
    console.error('[events] emit failed:', event.type, err)
  }
}
