import InviteClient from './invite-client'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

interface InviteInfo {
  valid: boolean
  reason?: string
  email?: string
  role?: string
  venueName?: string
}

async function loadInvite(token: string): Promise<InviteInfo> {
  // UUID shape check before hitting the DB
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
    return { valid: false, reason: 'That invite link is malformed.' }
  }
  try {
    const admin = getSupabaseAdmin()
    const { data: invite } = await admin
      .from('memberships')
      .select('invite_email, role, venue_id, invite_accepted_at, user_id')
      .eq('invite_token', token)
      .single()

    if (!invite) return { valid: false, reason: 'This invite does not exist.' }
    if (invite.invite_accepted_at || invite.user_id) {
      return { valid: false, reason: 'This invite has already been used.' }
    }

    let venueName: string | undefined
    if (invite.venue_id) {
      const { data: venue } = await admin
        .from('venues')
        .select('business_name')
        .eq('venue_id', invite.venue_id)
        .single()
      venueName = venue?.business_name
    }

    return {
      valid: true,
      email: invite.invite_email ?? undefined,
      role: invite.role,
      venueName,
    }
  } catch (err) {
    console.error('[join-team] invite lookup failed:', err)
    return {
      valid: false,
      reason: 'STUBBED — needs live Supabase: invite lookup requires database access.',
    }
  }
}

export default async function JoinTeamPage({ params }: { params: { invite: string } }) {
  const info = await loadInvite(params.invite)
  return <InviteClient token={params.invite} info={info} />
}
