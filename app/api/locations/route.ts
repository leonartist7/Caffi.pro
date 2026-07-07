import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireVenueRole } from '@/lib/authz'

// GET all locations for a venue (any accepted member of the venue)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const tenantId = searchParams.get('tenant_id')

    const authz = await requireVenueRole(tenantId, ['owner', 'manager', 'staff'])
    if (!authz.ok) return authz.response

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching locations:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ locations: data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST create a new location (owner/manager only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      tenant_id,
      name,
      address,
      city,
      postal_code,
      country,
      phone,
      email,
      hours,
      is_active,
      accepts_mobile_orders,
      accepts_dine_in_orders,
      estimated_prep_time,
    } = body

    if (!tenant_id || !name || !address || !city || !country) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const authz = await requireVenueRole(tenant_id, ['owner', 'manager'])
    if (!authz.ok) return authz.response

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('locations')
      .insert({
        tenant_id,
        name,
        address,
        city,
        postal_code,
        country,
        phone,
        email,
        hours,
        is_active,
        accepts_mobile_orders,
        accepts_dine_in_orders,
        estimated_prep_time,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating location:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ location: data }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
