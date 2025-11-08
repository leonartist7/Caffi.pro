import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // Use admin client to bypass RLS for admin operations
    const supabase = createAdminClient()
    const body = await request.json()

    // Calculate trial end date (30 days from now)
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 30)

    // Create tenant
    const { data: tenant, error } = await supabase
      .from('tenants')
      .insert({
        business_name: body.business_name,
        slug: body.slug,
        owner_email: body.owner_email,
        owner_phone: body.owner_phone || null,
        app_name: body.app_name,
        bundle_id: body.bundle_id,
        subscription_plan: body.subscription_plan,
        subscription_status: body.subscription_status,
        trial_ends_at: body.subscription_status === 'trial' ? trialEndsAt.toISOString() : null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating tenant:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    // Create tenant manifest (design tokens)
    await supabase
      .from('tenant_manifests')
      .insert({
        tenant_id: tenant.tenant_id,
      })

    return NextResponse.json(tenant, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/tenants:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    // Use admin client to bypass RLS
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    
    const status = searchParams.get('status')
    const plan = searchParams.get('plan')
    const search = searchParams.get('search')

    let query = supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('subscription_status', status)
    }

    if (plan) {
      query = query.eq('subscription_plan', plan)
    }

    if (search) {
      query = query.or(`business_name.ilike.%${search}%,slug.ilike.%${search}%,owner_email.ilike.%${search}%`)
    }

    const { data: tenants, error } = await query

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(tenants)
  } catch (error) {
    console.error('Error in GET /api/tenants:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

