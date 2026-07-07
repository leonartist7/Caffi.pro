import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireRowVenueRole } from '@/lib/authz'

interface MenuItemUpdate {
  category_id?: string
  name?: string
  description?: string | null
  price?: number
  image_url?: string | null
  tags?: string[]
  allergens?: string[]
  calories?: number | null
  is_available?: boolean
}

// GET a single menu item (any accepted member of the owning venue)
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    const authz = await requireRowVenueRole('menu_items', 'item_id', id, [
      'owner',
      'manager',
      'staff',
    ])
    if (!authz.ok) return authz.response

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('menu_items')
      .select('*, categories(name)')
      .eq('item_id', id)
      .single()

    if (error) {
      console.error('Error fetching menu item:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
    }

    return NextResponse.json({ menu_item: data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH update a menu item (owner/manager only)
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    const authz = await requireRowVenueRole('menu_items', 'item_id', id, ['owner', 'manager'])
    if (!authz.ok) return authz.response

    const body = await request.json()
    const {
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

    const updateData: MenuItemUpdate = {}
    if (category_id !== undefined) updateData.category_id = category_id
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (price !== undefined) updateData.price = price
    if (image_url !== undefined) updateData.image_url = image_url
    if (tags !== undefined) updateData.tags = tags
    if (allergens !== undefined) updateData.allergens = allergens
    if (calories !== undefined) updateData.calories = calories
    if (is_available !== undefined) updateData.is_available = is_available

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('menu_items')
      .update(updateData)
      .eq('item_id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating menu item:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ menu_item: data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE a menu item (owner/manager only)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    const authz = await requireRowVenueRole('menu_items', 'item_id', id, ['owner', 'manager'])
    if (!authz.ok) return authz.response

    const supabase = getSupabaseAdmin()
    const { error } = await supabase.from('menu_items').delete().eq('item_id', id)

    if (error) {
      console.error('Error deleting menu item:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
