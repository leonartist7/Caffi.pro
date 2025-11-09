import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET all menu items for a tenant
export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get('tenant_id');
    const categoryId = searchParams.get('category_id');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenant_id is required' },
        { status: 400 }
      );
    }

    let query = supabaseAdmin
      .from('menu_items')
      .select('*, categories(name)')
      .eq('tenant_id', tenantId);

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query.order('display_order', {
      ascending: true,
    });

    if (error) {
      console.error('Error fetching menu items:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ menu_items: data });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create a new menu item
export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
    const body = await request.json();
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
    } = body;

    // Validate required fields
    if (!tenant_id || !category_id || !name || price === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
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
      .single();

    if (error) {
      console.error('Error creating menu item:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ menu_item: data }, { status: 201 });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

