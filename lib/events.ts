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
  | 'reward.created'
  | 'reward.updated'
  | 'reward.deleted'
  | 'points.adjusted'
  | 'campaign.created'
  | 'campaign.autopilot_toggled'
  | 'message.sent'
  | 'ai_draft.created'
  | 'ai_draft.approved'
  | 'invite.created'
  | 'invite.accepted'
  | 'counter.login'
  | 'client.created'
  | 'client.updated'
  | 'client.deleted'
  | 'staff.updated'
  | 'staff.deactivated'
  | 'staff.pin_set'
  | 'menu.item_created'
  | 'menu.item_updated'
  | 'menu.item_deleted'
  | 'menu.category_created'
  | 'menu.category_updated'
  | 'menu.category_deleted'
  | 'order.placed'
  | 'order.paid'
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
 * Human-friendly label per event type — the one place both the HQ
 * dashboard's recent-activity feed and /api/activity's response build
 * their display text, so they can never drift apart.
 */
export const EVENT_LABELS: Record<string, string> = {
  'member.joined': 'New member joined',
  'visit.recorded': 'Visit recorded',
  'reward.redeemed': 'Reward redeemed',
  'reward.created': 'Reward created',
  'reward.updated': 'Reward updated',
  'reward.deleted': 'Reward deleted',
  'points.adjusted': 'Points adjusted',
  'campaign.created': 'Campaign created',
  'campaign.autopilot_toggled': 'Campaign autopilot toggled',
  'message.sent': 'Message sent',
  'ai_draft.created': 'AI draft created',
  'ai_draft.approved': 'AI draft approved',
  'invite.created': 'Staff invited',
  'invite.accepted': 'Staff invite accepted',
  'counter.login': 'Counter login',
  'client.created': 'Client created',
  'client.updated': 'Client updated',
  'client.deleted': 'Client deleted',
  'staff.updated': 'Staff member updated',
  'staff.deactivated': 'Staff member deactivated',
  'staff.pin_set': 'Counter PIN set',
  'menu.item_created': 'Menu item created',
  'menu.item_updated': 'Menu item updated',
  'menu.item_deleted': 'Menu item deleted',
  'menu.category_created': 'Menu category created',
  'menu.category_updated': 'Menu category updated',
  'menu.category_deleted': 'Menu category deleted',
  'order.placed': 'Order placed',
  'order.paid': 'Order paid',
  'lead.received': 'New lead received',
  'seed.applied': 'Seed data applied',
  'sentry.test': 'Sentry test event',
}

export function eventLabel(type: string): string {
  return EVENT_LABELS[type] ?? type
}

/**
 * Coarse action bucket derived from an event type's suffix — powers the
 * Activity page's action filter/stats, which predate the events table and
 * expect a small fixed vocabulary rather than the full dot-namespaced
 * AroEventType list.
 */
export type ActivityAction = 'create' | 'update' | 'delete' | 'approve' | 'send' | 'other'

export function activityAction(type: string): ActivityAction {
  if (/\.(created|joined|received|recorded|applied)$/.test(type)) return 'create'
  if (/\.(updated|adjusted|toggled|set)$/.test(type)) return 'update'
  if (/\.(deleted|deactivated)$/.test(type)) return 'delete'
  if (/\.(approved|accepted|redeemed)$/.test(type)) return 'approve'
  if (/\.sent$/.test(type)) return 'send'
  return 'other'
}

/** The part of the event type before the dot — 'member.joined' -> 'member'. */
export function activityResourceType(type: string): string {
  return type.split('.')[0] ?? type
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
