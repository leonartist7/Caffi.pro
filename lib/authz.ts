import 'server-only'

import { cache } from 'react'
import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export type Role = 'owner' | 'manager' | 'staff' | 'aro_admin'

/**
 * Per-request-memoized aro_admin check — the (dashboard) layout calls this
 * to decide which nav items to render, and dashboard/page.tsx calls it
 * again for its own role dispatch; React's cache() dedupes the two into
 * one membership query per request instead of two, the same "don't pay
 * twice for the same check" principle as the getSession() fix in the
 * layout. Nav-only: never treat this as an authorization decision on its
 * own — every route/page re-checks access independently.
 */
export const isAroAdminUser = cache(async (userId: string): Promise<boolean> => {
  const admin = getSupabaseAdmin()
  const { data } = await admin
    .from('memberships')
    .select('membership_id')
    .eq('user_id', userId)
    .eq('role', 'aro_admin')
    .eq('is_active', true)
    .limit(1)
  return (data?.length ?? 0) > 0
})

export interface VenueAuthz {
  user: User
  role: Role
  venueId: string
}

type AuthzResult = { ok: true; ctx: VenueAuthz } | { ok: false; response: NextResponse }

/**
 * Session + role gate for API routes.
 *
 * 1. Reads the caller's cookie session (401 if none / invalid).
 * 2. Confirms the caller holds a membership on the target venue — either
 *    venue-scoped or org-wide (venue_id IS NULL) — with an allowed role.
 *    `aro_admin` (platform staff) passes for any venue. 403 otherwise.
 *
 * The membership lookup runs on the service-role client so it cannot be
 * spoofed from the browser; the check itself is what authorizes use of
 * that client in the calling route.
 */
/**
 * Same gate for /[id] routes: resolves the row's venue first so a caller
 * can never operate on another venue's row by guessing IDs.
 *
 * `venueColumn` defaults to 'tenant_id' because most legacy-renamed tables
 * (members, rewards, points_ledger) kept that column name through the
 * tenants->venues rename. Tables created fresh in the aro schema use
 * `venue_id` instead (ai_drafts, memberships, visits, campaigns, events,
 * redemptions) — pass `'venue_id'` explicitly for those, or the lookup
 * below will throw a "column does not exist" error and this always 404s.
 */
export async function requireRowVenueRole(
  table: string,
  pkColumn: string,
  id: string,
  allowedRoles: Role[] = ['owner', 'manager'],
  venueColumn: 'tenant_id' | 'venue_id' = 'tenant_id'
): Promise<AuthzResult> {
  // Authenticate before touching the service-role client. Besides avoiding
  // unnecessary privileged reads, this keeps anonymous responses at 401
  // instead of revealing whether a guessed row exists.
  try {
    const supabase = createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()
    if (error || !user) {
      return {
        ok: false,
        response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
      }
    }
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
    }
  }

  try {
    const admin = getSupabaseAdmin()
    const { data: row, error } = await admin
      .from(table)
      .select(venueColumn)
      .eq(pkColumn, id)
      .single()

    if (error || !row) {
      return {
        ok: false,
        response: NextResponse.json({ error: 'Not found' }, { status: 404 }),
      }
    }
    return requireVenueRole((row as Record<string, string>)[venueColumn], allowedRoles)
  } catch (err) {
    console.error('[authz] row lookup failed:', err)
    return {
      ok: false,
      response: NextResponse.json({ error: 'Authorization check failed' }, { status: 500 }),
    }
  }
}

export async function requireVenueRole(
  venueId: string | null | undefined,
  allowedRoles: Role[] = ['owner', 'manager']
): Promise<AuthzResult> {
  if (!venueId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'venue_id (tenant_id) is required' }, { status: 400 }),
    }
  }

  let user: User | null = null
  try {
    const supabase = createClient()
    const {
      data: { user: sessionUser },
      error,
    } = await supabase.auth.getUser()
    if (error || !sessionUser) {
      return {
        ok: false,
        response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
      }
    }
    user = sessionUser
  } catch (err) {
    console.error('[authz] session check failed:', err)
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
    }
  }

  try {
    const admin = getSupabaseAdmin()

    // Venue → org (needed for org-wide memberships)
    const { data: venue, error: venueError } = await admin
      .from('venues')
      .select('venue_id, org_id')
      .eq('venue_id', venueId)
      .single()

    if (venueError || !venue) {
      return {
        ok: false,
        response: NextResponse.json({ error: 'Venue not found' }, { status: 404 }),
      }
    }

    // Pending invites carry user_id = NULL until accepted, so matching on
    // user_id already restricts this to accepted memberships.
    const { data: memberships, error: membershipError } = await admin
      .from('memberships')
      .select('role, venue_id, org_id')
      .eq('user_id', user.id)

    const rows = memberships ?? []

    if (membershipError) {
      console.error('[authz] membership lookup failed:', membershipError)
      return {
        ok: false,
        response: NextResponse.json({ error: 'Authorization check failed' }, { status: 500 }),
      }
    }

    const match = rows.find(
      m =>
        (m.role === 'aro_admin' ||
          m.venue_id === venue.venue_id ||
          (m.venue_id === null && m.org_id === venue.org_id)) &&
        (m.role === 'aro_admin' || allowedRoles.includes(m.role as Role))
    )

    if (!match) {
      return {
        ok: false,
        response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      }
    }

    return { ok: true, ctx: { user, role: match.role as Role, venueId: venue.venue_id } }
  } catch (err) {
    console.error('[authz] authorization failed:', err)
    return {
      ok: false,
      response: NextResponse.json({ error: 'Authorization check failed' }, { status: 500 }),
    }
  }
}

/**
 * Platform-staff gate (no venue in scope): 401 without a session, 403
 * unless the caller holds an active aro_admin membership. Used by HQ
 * surfaces (lead inbox) that exist above the venue level.
 */
export async function requireAroAdmin(): Promise<AuthzResult> {
  let user: User | null = null
  try {
    const supabase = createClient()
    const {
      data: { user: sessionUser },
      error,
    } = await supabase.auth.getUser()
    if (error || !sessionUser) {
      return {
        ok: false,
        response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
      }
    }
    user = sessionUser
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
    }
  }

  try {
    const admin = getSupabaseAdmin()
    const { data: rows, error } = await admin
      .from('memberships')
      .select('membership_id, role, is_active')
      .eq('user_id', user.id)
      .eq('role', 'aro_admin')
      .eq('is_active', true)
      .limit(1)
    if (error) {
      console.error('[authz] aro_admin lookup failed:', error)
      return {
        ok: false,
        response: NextResponse.json({ error: 'Authorization check failed' }, { status: 500 }),
      }
    }
    if (!rows || rows.length === 0) {
      return {
        ok: false,
        response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      }
    }
    // venueId is meaningless at HQ level; empty string keeps the shape.
    return { ok: true, ctx: { user, role: 'aro_admin', venueId: '' } }
  } catch (err) {
    console.error('[authz] aro_admin check failed:', err)
    return {
      ok: false,
      response: NextResponse.json({ error: 'Authorization check failed' }, { status: 500 }),
    }
  }
}
