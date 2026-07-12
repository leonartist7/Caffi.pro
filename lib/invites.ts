import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase-admin'
import type { VenueAuthz } from '@/lib/authz'

/**
 * Shared by /api/invites and /api/staff (POST) — one place that creates a
 * pending membership invite so both routes stay in lock-step with the
 * memberships schema. Caller has already passed requireVenueRole.
 */

export interface CreateInviteInput {
  venueId: string
  email: string
  role: 'owner' | 'manager' | 'staff'
  fullName?: string | null
}

export type CreateInviteResult =
  | {
      ok: true
      invite: { membership_id: string; email: string; role: string; invite_token: string }
    }
  | { ok: false; status: number; error: string }

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export async function createInvite(
  authz: VenueAuthz,
  input: CreateInviteInput
): Promise<CreateInviteResult> {
  if (!input.venueId || !input.email || !input.role) {
    return { ok: false, status: 400, error: 'venue_id, email and role are required' }
  }
  if (!['owner', 'manager', 'staff'].includes(input.role)) {
    return { ok: false, status: 400, error: 'role must be owner, manager or staff' }
  }
  if (typeof input.email !== 'string' || !EMAIL_RE.test(input.email)) {
    return { ok: false, status: 400, error: 'invalid email' }
  }
  if (authz.role === 'manager' && input.role !== 'staff') {
    return { ok: false, status: 403, error: 'Managers can only invite staff' }
  }

  const admin = getSupabaseAdmin()
  const { data: venue } = await admin
    .from('venues')
    .select('org_id')
    .eq('venue_id', input.venueId)
    .single()
  if (!venue) {
    return { ok: false, status: 404, error: 'Venue not found' }
  }

  const { data: invite, error } = await admin
    .from('memberships')
    .insert({
      org_id: venue.org_id,
      venue_id: input.venueId,
      role: input.role,
      full_name: input.fullName ?? null,
      invite_email: input.email.toLowerCase(),
      invited_by: authz.user.id,
    })
    .select('membership_id, invite_token, role, invite_email')
    .single()

  if (error || !invite) {
    console.error('[invites] insert failed:', error)
    return { ok: false, status: 500, error: error?.message ?? 'Failed to create invite' }
  }

  return {
    ok: true,
    invite: {
      membership_id: invite.membership_id,
      email: invite.invite_email,
      role: invite.role,
      invite_token: invite.invite_token,
    },
  }
}
