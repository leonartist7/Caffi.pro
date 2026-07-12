import { NextRequest, NextResponse } from 'next/server'
import { requireVenueRole } from '@/lib/authz'
import { createInvite } from '@/lib/invites'

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

    const authz = await requireVenueRole(venue_id, ['owner', 'manager'])
    if (!authz.ok) return authz.response

    const result = await createInvite(authz.ctx, {
      venueId: venue_id,
      email,
      role,
      fullName: full_name,
    })
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
    return NextResponse.json(
      {
        invite: {
          membership_id: result.invite.membership_id,
          email: result.invite.email,
          role: result.invite.role,
          // Phase 4 sends this by email (Resend). Until then: share manually.
          invite_url: `${siteUrl}/join-team/${result.invite.invite_token}`,
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
