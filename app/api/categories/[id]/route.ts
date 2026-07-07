import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireRowVenueRole } from '@/lib/authz'

// GET a single category (any accepted member of the owning venue)
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    const authz = await requireRowVenueRole('categories', 'category_id', id, [
      'owner',
      'manager',
      'staff',
    ])
    if (!authz.ok) return authz.response

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('category_id', id)
      .single()

    if (error) {
      console.error('Error fetching category:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    return NextResponse.json({ category: data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH update a category (owner/manager only)
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    const authz = await requireRowVenueRole('categories', 'category_id', id, ['owner', 'manager'])
    if (!authz.ok) return authz.response

    const body = await request.json()
    const { name, description, display_order, is_active } = body

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (display_order !== undefined) updateData.display_order = display_order
    if (is_active !== undefined) updateData.is_active = is_active

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('categories')
      .update(updateData)
      .eq('category_id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating category:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ category: data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE a category (owner/manager only)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    const authz = await requireRowVenueRole('categories', 'category_id', id, ['owner', 'manager'])
    if (!authz.ok) return authz.response

    const supabase = getSupabaseAdmin()
    const { error } = await supabase.from('categories').delete().eq('category_id', id)

    if (error) {
      console.error('Error deleting category:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
