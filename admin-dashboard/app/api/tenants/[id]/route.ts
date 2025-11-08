import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

// PATCH - Update tenant
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createAdminClient()
    
    const body = await request.json()

    const { data: tenant, error } = await supabase
      .from('tenants')
      .update({
        business_name: body.business_name,
        slug: body.slug,
        owner_email: body.owner_email,
        owner_phone: body.owner_phone || null,
        app_name: body.app_name,
        bundle_id: body.bundle_id,
        subscription_plan: body.subscription_plan,
        subscription_status: body.subscription_status,
      })
      .eq('tenant_id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating tenant:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(tenant)
  } catch (error) {
    console.error('Error in PATCH /api/tenants/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete tenant
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

    // Delete tenant (cascade will handle related records)
    const { error } = await supabase
      .from('tenants')
      .delete()
      .eq('tenant_id', id)

    if (error) {
      console.error('Error deleting tenant:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/tenants/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - Get single tenant
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

    const { data: tenant, error } = await supabase
      .from('tenants')
      .select(`
        *,
        locations:locations(count),
        users:users(count),
        orders:orders(count)
      `)
      .eq('tenant_id', id)
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }

    return NextResponse.json(tenant)
  } catch (error) {
    console.error('Error in GET /api/tenants/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

