import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireAroAdmin } from '@/lib/authz'
import { emitEvent } from '@/lib/events'

/** PATCH/DELETE for a single HQ client (venue). aro_admin only. */

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireAroAdmin()
  if (!gate.ok) return gate.response

  let body: {
    business_name?: string
    slug?: string
    logo_url?: string
    primary_color?: string
    contact_phone?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const { data: existing, error: fetchError } = await admin
    .from('venues')
    .select('venue_id, brand_kit')
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
  if (body.primary_color !== undefined || body.logo_url !== undefined) {
    update.brand_kit = {
      ...((existing.brand_kit as Record<string, unknown>) ?? {}),
      ...(body.primary_color !== undefined ? { primary: body.primary_color } : {}),
      ...(body.logo_url !== undefined ? { logo_url: body.logo_url || null } : {}),
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
