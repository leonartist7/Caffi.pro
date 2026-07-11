import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireAroAdmin } from '@/lib/authz'
import { emitEvent } from '@/lib/events'

/**
 * HQ clients API — server-side replacement for the old browser-direct
 * `tenants` queries in /clients and TenantSelector. The rebuilt schema
 * grants venue data to server code only (service role); the browser gets
 * it through this route, gated to aro_admin (platform staff) because
 * "all clients" is a cross-venue surface no single café owner should see.
 *
 * Responses keep the legacy tenant field names (tenant_id,
 * subscription_status, logo_url, primary_color) so the existing HQ UI
 * doesn't need reshaping — only its fetch layer changed.
 */

interface ClientRow {
  venue_id: string
  business_name: string
  slug: string
  owner_email: string
  owner_phone: string | null
  app_name: string
  bundle_id: string
  subscription_status: string
  created_at: string
  brand_kit: Record<string, unknown> | null
}

function toTenantShape(v: ClientRow) {
  const kit = v.brand_kit ?? {}
  return {
    tenant_id: v.venue_id,
    business_name: v.business_name,
    slug: v.slug,
    owner_email: v.owner_email,
    owner_phone: v.owner_phone,
    app_name: v.app_name,
    bundle_id: v.bundle_id,
    subscription_status: v.subscription_status ?? 'trial',
    created_at: v.created_at,
    logo_url: (kit.logo_url as string | undefined) ?? null,
    primary_color: (kit.primary as string | undefined) ?? null,
  }
}

const CLIENT_COLUMNS =
  'venue_id, business_name, slug, owner_email, owner_phone, app_name, bundle_id, subscription_status, created_at, brand_kit'

export async function GET() {
  const gate = await requireAroAdmin()
  if (!gate.ok) return gate.response

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('venues')
    .select(CLIENT_COLUMNS)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[clients] list failed:', error)
    return NextResponse.json({ error: 'Failed to load clients' }, { status: 500 })
  }
  return NextResponse.json({ clients: (data ?? []).map(toTenantShape) })
}

export async function POST(request: NextRequest) {
  const gate = await requireAroAdmin()
  if (!gate.ok) return gate.response

  let body: {
    business_name?: string
    slug?: string
    logo_url?: string
    primary_color?: string
    contact_email?: string
    contact_phone?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const businessName = body.business_name?.trim()
  if (!businessName) {
    return NextResponse.json({ error: 'business_name is required' }, { status: 400 })
  }
  const slug = (body.slug || businessName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (!slug) {
    return NextResponse.json({ error: 'slug could not be derived' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  // Org first (MVP: 1 org per venue) so the venue's NOT NULL org_id is
  // satisfiable; rolled back below if the venue insert fails.
  const { data: org, error: orgError } = await admin
    .from('organizations')
    .insert({ name: businessName, billing_email: body.contact_email || null })
    .select('org_id')
    .single()
  if (orgError || !org) {
    console.error('[clients] org insert failed:', orgError)
    return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 })
  }

  const { data: venue, error: venueError } = await admin
    .from('venues')
    .insert({
      org_id: org.org_id,
      business_name: businessName,
      slug,
      owner_email: body.contact_email || `owner@${slug}.aro.club`,
      owner_phone: body.contact_phone || null,
      app_name: businessName,
      bundle_id: `club.aro.${slug.replace(/-/g, '')}`,
      brand_kit: {
        primary: body.primary_color || '#6b3410',
        logo_url: body.logo_url || null,
      },
    })
    .select(CLIENT_COLUMNS)
    .single()

  if (venueError || !venue) {
    await admin.from('organizations').delete().eq('org_id', org.org_id)
    if (venueError?.code === '23505') {
      const field = venueError.message.includes('owner_email')
        ? `contact email is already used by another client`
        : `slug "${slug}" is already taken`
      return NextResponse.json({ error: field }, { status: 409 })
    }
    console.error('[clients] venue insert failed:', venueError)
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })
  }

  void emitEvent({
    type: 'client.created',
    actor: `user:${gate.ctx.user.id}`,
    venueId: venue.venue_id,
    payload: { slug, business_name: businessName },
  })

  return NextResponse.json({ client: toTenantShape(venue) }, { status: 201 })
}
