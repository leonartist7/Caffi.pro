import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET a single menu item
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { data, error } = await supabase
      .from('menu_items')
      .select('*, categories(name)')
      .eq('item_id', id)
      .single();

    if (error) {
      console.error('Error fetching menu item:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Menu item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ menu_item: data });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH update a menu item
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {const { id } = params;
    const body = await request.json();

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
    } = body;

    const updateData: any = {};
    if (category_id !== undefined) updateData.category_id = category_id;
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (image_url !== undefined) updateData.image_url = image_url;
    if (tags !== undefined) updateData.tags = tags;
    if (allergens !== undefined) updateData.allergens = allergens;
    if (calories !== undefined) updateData.calories = calories;
    if (is_available !== undefined) updateData.is_available = is_available;

    const { data, error } = await supabase
      .from('menu_items')
      .update(updateData)
      .eq('item_id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating menu item:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ menu_item: data });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE a menu item
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('item_id', id);

    if (error) {
      console.error('Error deleting menu item:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

