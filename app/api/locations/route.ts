import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET all locations for a tenant
export async function GET(request: NextRequest) {
  try {
=======
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
>>>>>>> origin/main
    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get('tenant_id');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenant_id is required' },
        { status: 400 }
      );
    }

<<<<<<< HEAD    const { data, error } = await supabaseAdmin
      .from('locations')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching locations:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ locations: data });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create a new location
export async function POST(request: NextRequest) {
  try {
=======
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
>>>>>>> origin/main
    const body = await request.json();
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
    } = body;

    // Validate required fields
    if (!tenant_id || !name || !address || !city || !country) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

<<<<<<< HEAD    const { data, error } = await supabaseAdmin
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
      .single();

    if (error) {
      console.error('Error creating location:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ location: data }, { status: 201 });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
<<<<<<< HEAD
=======

>>>>>>> origin/main
