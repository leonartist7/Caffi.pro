import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getProvider, PaymentProviderConfigurationError } from '@/lib/payments/provider'
import { requireVenueRole } from '@/lib/authz'
import { getTipConfig } from '@/lib/storefront'
import { isVenueOpenForOrdering, parseOrderingHours } from '@/lib/orders/opening-hours'
import { recoverCheckout } from '@/lib/orders/checkout-recovery'

interface CreatedOrder {
  order_id: string
  venue_id: string
  status: string
  subtotal_cents: number
  delivery_fee_cents: number
  tax_cents: number
  tip_cents: number
  total_cents: number
  currency: string
  replayed: boolean
}

function confirmationPath(slug: string, orderId: string, trackingToken: string): string {
  const query = new URLSearchParams({ tracking: trackingToken })
  return `/shop/${encodeURIComponent(slug)}/order-confirmation/${orderId}?${query}`
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
  INVALID_TIP: 'That tip amount is not valid.',
  CHECKOUT_CART_CHANGED: 'Your cart changed since checkout started. Review it and start checkout again.',
}

function orderError(message: string): string {
  const code = Object.keys(FRIENDLY_ERRORS).find(key => message.includes(key))
  if (code) return FRIENDLY_ERRORS[code]
  if (message.includes('MODIFIER_SELECTION_INVALID:')) {
    return `Check your choices for ${message.split('MODIFIER_SELECTION_INVALID:')[1].split(/[\n"]/, 1)[0]}.`
  }
  if (message.includes('ITEM_86ED:')) {
    return `Sorry — ${message.split('ITEM_86ED:')[1].split(/[\n"]/, 1)[0]} just sold out. Please remove it from your cart and refresh the menu.`
  }
  return 'We could not validate this order. Refresh the menu and try again.'
}

function orderErrorCode(message: string): string | undefined {
  return Object.keys(FRIENDLY_ERRORS).find(key => message.includes(key))
}

/**
 * The checkout operation is keyed by a client UUID, so its immutable request
 * fingerprint must include every guest-controlled field that can change the
 * price, fulfilment, or customer record. Arrays are sorted only for hashing;
 * the original item order still flows into the database RPC.
 */
function checkoutFingerprint(
  body: {
    order_type?: string
    table_token?: string | null
    zone_id?: string | null
    guest?: { name?: string; phone?: string; email?: string }
    delivery_address?: string | null
    delivery_postal_code?: string | null
    items?: Array<{ item_id?: string; quantity?: number; modifier_ids?: string[]; notes?: string }>
    notes?: string
    member_pass_serial?: string | null
  },
  tipCents: number
): string {
  const canonical = {
    order_type: body.order_type,
    table_token: body.table_token?.trim() || null,
    zone_id: body.zone_id || null,
    guest: {
      name: body.guest?.name?.trim() || '',
      phone: body.guest?.phone?.trim() || '',
      email: body.guest?.email?.trim().toLowerCase() || '',
    },
    delivery_address: body.delivery_address?.trim() || null,
    delivery_postal_code: body.delivery_postal_code?.trim().toUpperCase() || null,
    items: (body.items ?? [])
      .map(item => ({
        item_id: item.item_id || '',
        quantity: item.quantity || 0,
        modifier_ids: [...(item.modifier_ids ?? [])].sort(),
        notes: item.notes?.trim() || '',
      }))
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
    notes: body.notes?.trim() || '',
    member_pass_serial: body.member_pass_serial || null,
    tip_cents: tipCents,
  }
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex')
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
      'order_id, order_type, status, guest_name, subtotal_cents, delivery_fee_cents, tax_cents, tip_cents, total_cents, placed_at'
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
    tip_cents?: number
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body.venue_slug || !body.client_uuid || !body.order_type || !Array.isArray(body.items)) {
    return NextResponse.json({ error: 'Missing required order fields' }, { status: 400 })
  }
  if (
    body.tip_cents !== undefined &&
    (!Number.isSafeInteger(body.tip_cents) || body.tip_cents < 0)
  ) {
    return NextResponse.json({ error: FRIENDLY_ERRORS.INVALID_TIP }, { status: 400 })
  }

  let tipCents = body.tip_cents ?? 0
  if (body.order_type === 'delivery' && tipCents > 0) {
    const tipConfig = await getTipConfig(body.venue_slug)
    if (!tipConfig.delivery_enabled) tipCents = 0
  }

  const admin = getSupabaseAdmin()
  const { data: venueAvailability, error: venueAvailabilityError } = await admin
    .from('venues')
    .select('kill_switch, reservation_config, timezone')
    .eq('slug', body.venue_slug)
    .maybeSingle()
  if (venueAvailabilityError || !venueAvailability || venueAvailability.kill_switch) {
    return NextResponse.json({ error: FRIENDLY_ERRORS.VENUE_NOT_FOUND }, { status: 409 })
  }
  if (
    !isVenueOpenForOrdering(
      parseOrderingHours(
        (venueAvailability.reservation_config as { hours?: unknown } | null)?.hours
      ),
      venueAvailability.timezone
    )
  ) {
    return NextResponse.json(
      { error: 'This storefront is currently closed. Please try again during opening hours.', code: 'VENUE_CLOSED' },
      { status: 409 }
    )
  }
  const { data, error } = await admin.rpc('create_storefront_order_checked', {
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
    p_tip_cents: tipCents,
    p_request_fingerprint: checkoutFingerprint(body, tipCents),
  })
  if (error || !data) {
    console.error('[orders] atomic order creation failed:', error)
    const errorMessage = error?.message ?? ''
    return NextResponse.json(
      { error: orderError(errorMessage), code: orderErrorCode(errorMessage) },
      { status: 400 }
    )
  }
  const order = data as CreatedOrder
  const { data: trackingToken, error: trackingError } = await admin.rpc(
    'get_storefront_order_tracking_token',
    {
      p_order_id: order.order_id,
      p_venue_slug: body.venue_slug,
      p_client_uuid: body.client_uuid,
    }
  )
  if (trackingError || typeof trackingToken !== 'string') {
    console.error('[orders] tracking credential lookup failed:', trackingError?.message)
    return NextResponse.json({ error: 'We could not resume this order safely. Please try again.' }, { status: 500 })
  }
  const confirmationUrl = confirmationPath(body.venue_slug, order.order_id, trackingToken)
  let { data: existingPayment } = await admin
    .from('payments')
    .select('status, raw, idempotency_key, provider')
    .eq('order_id', order.order_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (existingPayment?.status === 'succeeded') {
    return NextResponse.json({
      order,
      redirectUrl: confirmationUrl,
      tracking_token: trackingToken,
      payment_mode: existingPayment?.provider,
    })
  }
  if (order.status !== 'pending') {
    return NextResponse.json(
      { error: 'This order can no longer start or resume payment.' },
      { status: 409 }
    )
  }

  const retryingFailedPayment = existingPayment?.status === 'failed'
  if (existingPayment && !['pending', 'failed'].includes(existingPayment.status)) {
    return NextResponse.json(
      { error: 'This payment requires reconciliation before it can continue.' },
      { status: 409 }
    )
  }
  const provider = getProvider({ venueId: order.venue_id })
  if (existingPayment && !retryingFailedPayment && existingPayment.provider !== provider.key) {
    return NextResponse.json(
      { error: 'This payment attempt must be completed in its original environment.' },
      { status: 409 }
    )
  }
  if (!existingPayment || retryingFailedPayment || existingPayment.status === 'pending') {
    const proposedAttemptKey = retryingFailedPayment
      ? crypto.randomUUID()
      : (existingPayment?.idempotency_key as string | undefined) ?? order.order_id
    const { data: reservedAttempt, error: reserveError } = await admin.rpc(
      'reserve_storefront_payment_attempt',
      {
        p_order_id: order.order_id,
        p_venue_id: order.venue_id,
        p_provider: provider.key,
        p_amount_cents: order.total_cents,
        p_currency: order.currency,
        p_proposed_attempt_key: proposedAttemptKey,
      }
    )
    if (reserveError || !reservedAttempt) {
      console.error('[orders] payment attempt reservation failed:', reserveError)
      if (
        reserveError?.message.includes('PAYMENT_NOT_PENDING') ||
        reserveError?.message.includes('PAYMENT_NOT_RETRYABLE')
      ) {
        return NextResponse.json(
          { error: 'This order can no longer start a new payment attempt.' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: 'Payment setup failed. Please try again.' }, { status: 500 })
    }
    const reservedPayment = reservedAttempt as {
      status: string
      raw: { provider_operation_key?: string } | null
      idempotency_key: string
      provider: string
    }
    if (reservedPayment.provider !== provider.key || reservedPayment.status !== 'pending') {
      return NextResponse.json({ error: 'Payment setup is still being prepared. Please retry.' }, { status: 409 })
    }
    existingPayment = reservedPayment
  }

  const attemptKey = existingPayment?.idempotency_key as string | undefined
  const providerOperationKey = (existingPayment?.raw as { provider_operation_key?: string } | null)
    ?.provider_operation_key
  if (!attemptKey || !providerOperationKey) {
    console.error('[orders] payment reservation has no stable operation key')
    return NextResponse.json({ error: 'Payment setup failed. Please try again.' }, { status: 500 })
  }
  // Resume only after the database reservation has locked the order and
  // rejected a cancellation or reconciliation quarantine.
  const recoveredRedirect = recoverCheckout({
    orderStatus: 'pending',
    paymentStatus: existingPayment?.status,
    storedCheckoutUrl: (existingPayment?.raw as { checkout_url?: string } | null)?.checkout_url,
    confirmationUrl,
  })
  if (recoveredRedirect) {
    return NextResponse.json({
      order,
      redirectUrl: recoveredRedirect,
      tracking_token: trackingToken,
      payment_mode: existingPayment?.provider,
    })
  }

  try {
    const checkout = await provider.createCheckout({
      venueId: order.venue_id,
      orderId: order.order_id,
      amountCents: order.total_cents,
      currency: order.currency,
      description: `Order from ${body.venue_slug}`,
      successUrl: `${request.nextUrl.origin}${confirmationUrl}`,
      cancelUrl: `${request.nextUrl.origin}/shop/${encodeURIComponent(body.venue_slug)}/checkout?canceled=1`,
      idempotencyKey: providerOperationKey,
      metadata: { client_uuid: body.client_uuid },
    })
    const { data: updatedPayment, error: paymentError } = await admin.rpc(
      'attach_storefront_checkout',
      {
        p_order_id: order.order_id,
        p_venue_id: order.venue_id,
        p_attempt_key: attemptKey,
        p_provider_ref: checkout.providerRef,
        p_checkout_url: checkout.redirectUrl,
        p_provider_operation_key: providerOperationKey,
      }
    )
    if (paymentError) {
      console.error('[orders] payment record failed:', paymentError)
      return NextResponse.json(
        { error: 'Payment setup failed. Please try again.' },
        { status: 500 }
      )
    }
    if (!updatedPayment) {
      const { data: racedPayment } = await admin
        .from('payments')
        .select('status, raw, provider')
        .eq('order_id', order.order_id)
        .eq('idempotency_key', attemptKey)
        .maybeSingle()
      if (racedPayment?.status === 'succeeded') {
        return NextResponse.json({
          order,
          redirectUrl: confirmationUrl,
          tracking_token: trackingToken,
          payment_mode: racedPayment?.provider,
        })
      }
      return NextResponse.json({ error: 'Payment setup is still being prepared. Please retry.' }, { status: 409 })
    }
    return NextResponse.json(
      {
        order,
        redirectUrl: checkout.redirectUrl,
        tracking_token: trackingToken,
        payment_mode: provider.key,
      },
      { status: 201 }
    )
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
