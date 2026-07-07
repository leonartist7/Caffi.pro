import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireVenueRole } from '@/lib/authz'

// GET all categories for a venue (any accepted member of the venue)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const tenantId = searchParams.get('tenant_id')

    const authz = await requireVenueRole(tenantId, ['owner', 'manager', 'staff'])
    if (!authz.ok) return authz.response

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching categories:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ categories: data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST create a new category (owner/manager only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenant_id, name, description, display_order, is_active } = body

    if (!tenant_id || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const authz = await requireVenueRole(tenant_id, ['owner', 'manager'])
    if (!authz.ok) return authz.response

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('categories')
      .insert({
        tenant_id,
        name,
        description,
        display_order,
        is_active,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating category:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ category: data }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
