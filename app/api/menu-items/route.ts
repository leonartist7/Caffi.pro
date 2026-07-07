import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireVenueRole } from '@/lib/authz'

// GET all menu items for a venue (any accepted member of the venue)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const tenantId = searchParams.get('tenant_id')
    const categoryId = searchParams.get('category_id')

    const authz = await requireVenueRole(tenantId, ['owner', 'manager', 'staff'])
    if (!authz.ok) return authz.response

    const supabase = getSupabaseAdmin()
    let query = supabase.from('menu_items').select('*, categories(name)').eq('tenant_id', tenantId)

    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    const { data, error } = await query.order('display_order', {
      ascending: true,
    })

    if (error) {
      console.error('Error fetching menu items:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ menu_items: data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST create a new menu item (owner/manager only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      tenant_id,
      category_id,
      name,
      description,
      price,
      image_url,
      tags,
      allergens,
      calories,
      is_available,
    } = body

    // Validate required fields
    if (!tenant_id || !category_id || !name || price === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: 'price must be a non-negative number' }, { status: 400 })
    }

    const authz = await requireVenueRole(tenant_id, ['owner', 'manager'])
    if (!authz.ok) return authz.response

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('menu_items')
      .insert({
        tenant_id,
        category_id,
        name,
        description,
        price,
        image_url,
        tags,
        allergens,
        calories,
        is_available,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating menu item:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ menu_item: data }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
