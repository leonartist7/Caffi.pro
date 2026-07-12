import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireVenueRole } from '@/lib/authz'
import { createInvite } from '@/lib/invites'
import { emitEvent } from '@/lib/events'

/**
 * HQ staff API — server-side replacement for the old browser-direct
 * `staff_users` queries in /staff. That table was migrated into
 * `memberships` (roles owner|manager|staff, PK membership_id, org_id
 * required); this route is the only write path for it besides the
 * counter PIN flow. A membership with user_id IS NULL is a pending
 * invite — surfaced as status "invited", never blank.
 */

interface MembershipRow {
  membership_id: string
  role: string
  full_name: string | null
  invite_email: string | null
  user_id: string | null
  is_active: boolean
  invite_accepted_at: string | null
  pin_updated_at: string | null
  invite_token: string | null
}

function toStaffShape(m: MembershipRow, siteUrl: string) {
  return {
    staff_id: m.membership_id,
    email: m.invite_email,
    full_name: m.full_name,
    role: m.role,
    is_active: m.is_active,
    status: m.user_id ? 'active' : 'invited',
    has_pin: Boolean(m.pin_updated_at),
    invite_url: m.user_id || !m.invite_token ? undefined : `${siteUrl}/join-team/${m.invite_token}`,
  }
}

export async function GET(request: NextRequest) {
  const venueId = request.nextUrl.searchParams.get('venue_id')
  const authz = await requireVenueRole(venueId, ['owner', 'manager'])
  if (!authz.ok) return authz.response

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('memberships')
    .select(
      'membership_id, role, full_name, invite_email, user_id, is_active, invite_accepted_at, pin_updated_at, invite_token'
    )
    .eq('venue_id', authz.ctx.venueId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[staff] list failed:', error)
    return NextResponse.json({ error: 'Failed to load staff' }, { status: 500 })
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
  return NextResponse.json({ staff: (data ?? []).map(member => toStaffShape(member, siteUrl)) })
}

export async function POST(request: NextRequest) {
  let body: { venue_id?: string; email?: string; role?: string; full_name?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const authz = await requireVenueRole(body.venue_id, ['owner', 'manager'])
  if (!authz.ok) return authz.response

  const result = await createInvite(authz.ctx, {
    venueId: authz.ctx.venueId,
    email: body.email ?? '',
    role: (body.role as 'owner' | 'manager' | 'staff') ?? 'staff',
    fullName: body.full_name,
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  void emitEvent({
    type: 'invite.created',
    actor: `user:${authz.ctx.user.id}`,
    venueId: authz.ctx.venueId,
    payload: { membership_id: result.invite.membership_id, role: result.invite.role },
  })

  return NextResponse.json(
    {
      staff: {
        staff_id: result.invite.membership_id,
        email: result.invite.email,
        full_name: body.full_name ?? null,
        role: result.invite.role,
        is_active: true,
        status: 'invited',
        has_pin: false,
        invite_url: `${process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin}/join-team/${result.invite.invite_token}`,
      },
    },
    { status: 201 }
  )
}
