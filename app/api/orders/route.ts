import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getProvider, PaymentProviderConfigurationError } from '@/lib/payments/provider'
import { requireVenueRole } from '@/lib/authz'

interface CreatedOrder {
  order_id: string
  venue_id: string
  status: string
  subtotal_cents: number
  delivery_fee_cents: number
  tax_cents: number
  total_cents: number
  currency: string
  replayed: boolean
}

const FRIENDLY_ERRORS: Record<string, string> = {
  VENUE_NOT_FOUND: 'This storefront is not accepting orders.',
  GUEST_NAME_REQUIRED: 'Please enter your name.',
  INVALID_CART: 'Your cart is empty or too large.',
  INVALID_QUANTITY: 'Check the quantity for each item.',
  ITEM_UNAVAILABLE: 'An item in your cart is no longer available. Refresh the menu.',
  INVALID_MODIFIERS: 'One of your selected options is no longer available.',
  INVALID_TABLE: 'This table QR code is no longer active.',
  DELIVERY_ZONE_REQUIRED: 'Choose an available delivery zone.',
  DELIVERY_ADDRESS_REQUIRED: 'Enter a delivery address.',
  OUTSIDE_DELIVERY_ZONE: 'That postal code is outside this delivery area.',
  DELIVERY_MINIMUM_NOT_MET: 'Your cart does not meet this delivery zone minimum.',
}

function orderError(message: string): string {
  const code = Object.keys(FRIENDLY_ERRORS).find(key => message.includes(key))
  if (code) return FRIENDLY_ERRORS[code]
  if (message.includes('MODIFIER_SELECTION_INVALID:')) {
    return `Check your choices for ${message.split('MODIFIER_SELECTION_INVALID:')[1].split(/[\n"]/, 1)[0]}.`
  }
  return 'We could not validate this order. Refresh the menu and try again.'
}

export async function GET(request: NextRequest) {
  const gate = await requireVenueRole(request.nextUrl.searchParams.get('venue_id'), [
    'owner',
    'manager',
  ])
  if (!gate.ok) return gate.response
  const status = request.nextUrl.searchParams.get('status')
  let query = getSupabaseAdmin()
    .from('orders')
    .select(
      'order_id, order_type, status, guest_name, subtotal_cents, delivery_fee_cents, tax_cents, total_cents, placed_at'
    )
    .eq('venue_id', gate.ctx.venueId)
    .order('placed_at', { ascending: false })
    .limit(250)
  if (status && status !== 'all') query = query.eq('status', status)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Failed to load orders' }, { status: 500 })
  return NextResponse.json({ orders: data ?? [] })
}

export async function POST(request: NextRequest) {
  let body: {
    venue_slug?: string
    client_uuid?: string
    order_type?: 'dine_in' | 'pickup' | 'delivery'
    table_token?: string | null
    zone_id?: string | null
    guest?: { name?: string; phone?: string; email?: string }
    delivery_address?: string | null
    delivery_postal_code?: string | null
    items?: Array<{ item_id?: string; quantity?: number; modifier_ids?: string[]; notes?: string }>
    notes?: string
    member_pass_serial?: string | null
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body.venue_slug || !body.client_uuid || !body.order_type || !Array.isArray(body.items)) {
    return NextResponse.json({ error: 'Missing required order fields' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const { data, error } = await admin.rpc('create_storefront_order', {
    p_venue_slug: body.venue_slug,
    p_client_uuid: body.client_uuid,
    p_order_type: body.order_type,
    p_items: body.items,
    p_guest: body.guest ?? {},
    p_table_token: body.table_token || null,
    p_zone_id: body.zone_id || null,
    p_delivery_address: body.delivery_address || null,
    p_delivery_postal_code: body.delivery_postal_code || null,
    p_notes: body.notes || null,
    p_member_pass_serial: body.member_pass_serial || null,
  })
  if (error || !data) {
    console.error('[orders] atomic order creation failed:', error)
    return NextResponse.json({ error: orderError(error?.message ?? '') }, { status: 400 })
  }
  const order = data as CreatedOrder
  const confirmationUrl = `/shop/${encodeURIComponent(body.venue_slug)}/order-confirmation/${order.order_id}`
  const { data: existingPayment } = await admin
    .from('payments')
    .select('status, raw')
    .eq('order_id', order.order_id)
    .in('status', ['pending', 'succeeded'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (existingPayment?.status === 'succeeded') {
    return NextResponse.json({ order, redirectUrl: confirmationUrl })
  }
  const storedCheckout = (existingPayment?.raw as { checkout_url?: string } | null)?.checkout_url
  if (storedCheckout) return NextResponse.json({ order, redirectUrl: storedCheckout })

  try {
    const provider = getProvider()
    const checkout = await provider.createCheckout({
      venueId: order.venue_id,
      orderId: order.order_id,
      amountCents: order.total_cents,
      currency: order.currency,
      description: `Order from ${body.venue_slug}`,
      successUrl: `${request.nextUrl.origin}${confirmationUrl}`,
      cancelUrl: `${request.nextUrl.origin}/shop/${encodeURIComponent(body.venue_slug)}/checkout?canceled=1`,
      metadata: { client_uuid: body.client_uuid },
    })
    const { error: paymentError } = await admin.from('payments').upsert(
      {
        venue_id: order.venue_id,
        order_id: order.order_id,
        provider: provider.key,
        provider_ref: checkout.providerRef,
        amount_cents: order.total_cents,
        currency: order.currency,
        status: 'pending',
        idempotency_key: body.client_uuid,
        raw: { checkout_url: checkout.redirectUrl },
      },
      { onConflict: 'idempotency_key' }
    )
    if (paymentError) {
      console.error('[orders] payment record failed:', paymentError)
      return NextResponse.json(
        { error: 'Payment setup failed. Please try again.' },
        { status: 500 }
      )
    }
    return NextResponse.json({ order, redirectUrl: checkout.redirectUrl }, { status: 201 })
  } catch (error) {
    if (error instanceof PaymentProviderConfigurationError) {
      return NextResponse.json(
        {
          error: 'Online payment is not connected yet.',
          code: 'PAYMENTS_STUBBED',
          order_id: order.order_id,
        },
        { status: 503 }
      )
    }
    console.error('[orders] checkout creation failed:', error)
    return NextResponse.json({ error: 'Payment setup failed. Please try again.' }, { status: 502 })
  }
}
