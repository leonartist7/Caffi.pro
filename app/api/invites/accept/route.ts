import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * Accept a team invite. Body: { token }
 * Requires a signed-in session whose email matches the invite email;
 * binds the auth user to the pending membership.
 */
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'token is required' }, { status: 400 })
    }

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Sign in first, then accept the invite' }, { status: 401 })
    }

    const admin = getSupabaseAdmin()
    const { data: invite, error } = await admin
      .from('memberships')
      .select('membership_id, invite_email, invite_accepted_at, user_id, role, venue_id, org_id')
      .eq('invite_token', token)
      .single()

    if (error || !invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }
    if (invite.invite_accepted_at || invite.user_id) {
      return NextResponse.json({ error: 'Invite already used' }, { status: 409 })
    }
    if (
      !user.email ||
      !invite.invite_email ||
      user.email.toLowerCase() !== invite.invite_email.toLowerCase()
    ) {
      return NextResponse.json(
        { error: `This invite is for ${invite.invite_email}; you are signed in as ${user.email}` },
        { status: 403 }
      )
    }

    const { error: updateError } = await admin
      .from('memberships')
      .update({ user_id: user.id, invite_accepted_at: new Date().toISOString() })
      .eq('membership_id', invite.membership_id)

    if (updateError) {
      console.error('[invites/accept] update failed:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      role: invite.role,
      venue_id: invite.venue_id,
      org_id: invite.org_id,
    })
  } catch (error) {
    console.error('[invites/accept] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
