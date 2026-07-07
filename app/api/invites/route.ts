import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireVenueRole } from '@/lib/authz'

/**
 * Create a team invite. Body: { venue_id, email, role, full_name? }
 * - owners can invite owner/manager/staff (multiple owners per venue is
 *   explicitly supported)
 * - managers can invite staff only
 * Email delivery arrives with Resend in Phase 4 — until then the invite
 * link is returned to the caller to share manually (visible stub, not a
 * fake send).
 */
export async function POST(request: NextRequest) {
  try {
    const { venue_id, email, role, full_name } = await request.json()

    if (!venue_id || !email || !role) {
      return NextResponse.json({ error: 'venue_id, email and role are required' }, { status: 400 })
    }
    if (!['owner', 'manager', 'staff'].includes(role)) {
      return NextResponse.json({ error: 'role must be owner, manager or staff' }, { status: 400 })
    }
    if (typeof email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: 'invalid email' }, { status: 400 })
    }

    const authz = await requireVenueRole(venue_id, ['owner', 'manager'])
    if (!authz.ok) return authz.response
    if (authz.ctx.role === 'manager' && role !== 'staff') {
      return NextResponse.json({ error: 'Managers can only invite staff' }, { status: 403 })
    }

    const admin = getSupabaseAdmin()
    const { data: venue } = await admin
      .from('venues')
      .select('org_id')
      .eq('venue_id', venue_id)
      .single()
    if (!venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
    }

    const { data: invite, error } = await admin
      .from('memberships')
      .insert({
        org_id: venue.org_id,
        venue_id,
        role,
        full_name: full_name ?? null,
        invite_email: email.toLowerCase(),
        invited_by: authz.ctx.user.id,
      })
      .select('membership_id, invite_token, role, invite_email')
      .single()

    if (error) {
      console.error('[invites] insert failed:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
    return NextResponse.json(
      {
        invite: {
          membership_id: invite.membership_id,
          email: invite.invite_email,
          role: invite.role,
          // Phase 4 sends this by email (Resend). Until then: share manually.
          invite_url: `${siteUrl}/join-team/${invite.invite_token}`,
          email_delivery: 'STUBBED — needs RESEND_API_KEY (Phase 4)',
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[invites] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
