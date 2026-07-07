import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireRowVenueRole } from '@/lib/authz'

// GET a single location (any accepted member of the owning venue)
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    const authz = await requireRowVenueRole('locations', 'location_id', id, [
      'owner',
      'manager',
      'staff',
    ])
    if (!authz.ok) return authz.response

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('location_id', id)
      .single()

    if (error) {
      console.error('Error fetching location:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    return NextResponse.json({ location: data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH update a location (owner/manager only)
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    const authz = await requireRowVenueRole('locations', 'location_id', id, ['owner', 'manager'])
    if (!authz.ok) return authz.response

    const body = await request.json()
    const {
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

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (address !== undefined) updateData.address = address
    if (city !== undefined) updateData.city = city
    if (postal_code !== undefined) updateData.postal_code = postal_code
    if (country !== undefined) updateData.country = country
    if (phone !== undefined) updateData.phone = phone
    if (email !== undefined) updateData.email = email
    if (hours !== undefined) updateData.hours = hours
    if (is_active !== undefined) updateData.is_active = is_active
    if (accepts_mobile_orders !== undefined)
      updateData.accepts_mobile_orders = accepts_mobile_orders
    if (accepts_dine_in_orders !== undefined)
      updateData.accepts_dine_in_orders = accepts_dine_in_orders
    if (estimated_prep_time !== undefined) updateData.estimated_prep_time = estimated_prep_time

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('locations')
      .update(updateData)
      .eq('location_id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating location:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ location: data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE a location (owner/manager only)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    const authz = await requireRowVenueRole('locations', 'location_id', id, ['owner', 'manager'])
    if (!authz.ok) return authz.response

    const supabase = getSupabaseAdmin()
    const { error } = await supabase.from('locations').delete().eq('location_id', id)

    if (error) {
      console.error('Error deleting location:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
