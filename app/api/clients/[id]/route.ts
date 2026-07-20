import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireAroAdmin, requireRowVenueRole } from '@/lib/authz'
import { emitEvent } from '@/lib/events'
import { CLIENT_COLUMNS, toTenantShape } from '@/lib/clients'
import { parseSiteProfile, type SiteProfile } from '@/lib/site-profile'

/**
 * GET/PATCH for a single client (venue) — venue's own owner/manager or
 * aro_admin, since Settings' General tab uses this to let a real café
 * owner manage their own brand profile, not just HQ operators managing
 * clients on their behalf. DELETE stays aro_admin-only: removing a whole
 * venue is a platform-operator action, not something an owner triggers
 * via a single API call.
 */

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireRowVenueRole(
    'venues',
    'venue_id',
    params.id,
    ['owner', 'manager'],
    'venue_id'
  )
  if (!gate.ok) return gate.response

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('venues')
    .select(CLIENT_COLUMNS)
    .eq('venue_id', params.id)
    .single()
  if (error || !data) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }
  return NextResponse.json({ client: toTenantShape(data) })
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireRowVenueRole(
    'venues',
    'venue_id',
    params.id,
    ['owner', 'manager'],
    'venue_id'
  )
  if (!gate.ok) return gate.response

  let body: {
    business_name?: string
    slug?: string
    logo_url?: string
    primary_color?: string
    contact_phone?: string
    reservation_config?: Record<string, unknown>
    site_profile?: Partial<SiteProfile>
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const { data: existing, error: fetchError } = await admin
    .from('venues')
    .select('venue_id, brand_kit, reservation_config')
    .eq('venue_id', params.id)
    .single()
  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  const update: Record<string, unknown> = {}
  if (body.business_name?.trim()) update.business_name = body.business_name.trim()
  if (body.slug) {
    update.slug = body.slug
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }
  if (body.contact_phone !== undefined) update.owner_phone = body.contact_phone || null
  const existingBrandKit = (existing.brand_kit as Record<string, unknown>) ?? {}
  let nextBrandKit = existingBrandKit
  let brandKitChanged = false
  let siteEventType: 'site.published' | 'site.updated' | null = null
  let nextSiteProfile: SiteProfile | null = null

  if (body.primary_color !== undefined || body.logo_url !== undefined) {
    nextBrandKit = {
      ...nextBrandKit,
      ...(body.primary_color !== undefined ? { primary: body.primary_color } : {}),
      ...(body.logo_url !== undefined ? { logo_url: body.logo_url || null } : {}),
    }
    brandKitChanged = true
  }
  if (body.site_profile !== undefined) {
    if (
      !body.site_profile ||
      typeof body.site_profile !== 'object' ||
      Array.isArray(body.site_profile)
    ) {
      return NextResponse.json({ error: 'site_profile must be an object' }, { status: 400 })
    }
    const previousSiteProfile = parseSiteProfile(existingBrandKit)
    const existingSiteProfile =
      existingBrandKit.site_profile &&
      typeof existingBrandKit.site_profile === 'object' &&
      !Array.isArray(existingBrandKit.site_profile)
        ? (existingBrandKit.site_profile as Record<string, unknown>)
        : {}
    nextSiteProfile = parseSiteProfile({
      site_profile: { ...existingSiteProfile, ...body.site_profile },
    })
    nextBrandKit = { ...nextBrandKit, site_profile: nextSiteProfile }
    brandKitChanged = true
    siteEventType =
      !previousSiteProfile.site_enabled && nextSiteProfile.site_enabled
        ? 'site.published'
        : 'site.updated'
  }
  if (brandKitChanged) update.brand_kit = nextBrandKit
  if (body.reservation_config !== undefined && body.reservation_config !== null) {
    // Merge into existing config so partial UI writes don't wipe defaults.
    update.reservation_config = {
      ...((existing.reservation_config as Record<string, unknown>) ?? {}),
      ...body.reservation_config,
    }
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { error: updateError } = await admin.from('venues').update(update).eq('venue_id', params.id)
  if (updateError) {
    if (updateError.code === '23505') {
      return NextResponse.json({ error: 'That slug is already taken' }, { status: 409 })
    }
    console.error('[clients] update failed:', updateError)
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 })
  }

  void emitEvent({
    type: 'client.updated',
    actor: `user:${gate.ctx.user.id}`,
    venueId: params.id,
    payload: { fields: Object.keys(update) },
  })
  if (siteEventType && nextSiteProfile) {
    void emitEvent({
      type: siteEventType,
      actor: `user:${gate.ctx.user.id}`,
      venueId: params.id,
      payload: { site_enabled: nextSiteProfile.site_enabled },
    })
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireAroAdmin()
  if (!gate.ok) return gate.response

  const admin = getSupabaseAdmin()
  const { data: venue, error: fetchError } = await admin
    .from('venues')
    .select('venue_id, org_id, slug')
    .eq('venue_id', params.id)
    .single()
  if (fetchError || !venue) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  // Venue first (org_id FK is ON DELETE RESTRICT), then the org — but only
  // if this was its last venue (MVP is 1:1; don't orphan a multi-venue org).
  const { error: venueError } = await admin.from('venues').delete().eq('venue_id', params.id)
  if (venueError) {
    console.error('[clients] delete failed:', venueError)
    return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 })
  }

  const { count } = await admin
    .from('venues')
    .select('venue_id', { count: 'exact', head: true })
    .eq('org_id', venue.org_id)
  if ((count ?? 0) === 0) {
    await admin.from('organizations').delete().eq('org_id', venue.org_id)
  }

  void emitEvent({
    type: 'client.deleted',
    actor: `user:${gate.ctx.user.id}`,
    payload: { venue_id: params.id, slug: venue.slug },
  })
  return NextResponse.json({ ok: true })
}
