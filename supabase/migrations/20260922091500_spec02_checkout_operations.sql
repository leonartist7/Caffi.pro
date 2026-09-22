-- SPEC-02 checkout operation fingerprint and terminal-safe payment success.

CREATE TABLE IF NOT EXISTS public.order_checkout_operations (
  venue_id UUID NOT NULL REFERENCES public.venues(venue_id) ON DELETE CASCADE,
  client_uuid UUID NOT NULL,
  order_id UUID NOT NULL REFERENCES public.orders(order_id) ON DELETE RESTRICT,
  request_fingerprint TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (venue_id, client_uuid),
  UNIQUE (order_id)
);

ALTER TABLE public.order_checkout_operations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.order_checkout_operations FROM anon, authenticated;
GRANT ALL ON public.order_checkout_operations TO service_role;

-- Locking this operation key before the inherited order RPC means two submits
-- cannot make different carts share one client UUID. The existing RPC still
-- calculates all current menu/tax/fulfillment amounts server-side.
CREATE OR REPLACE FUNCTION public.create_storefront_order_checked(
  p_venue_slug TEXT,
  p_client_uuid UUID,
  p_order_type TEXT,
  p_items JSONB,
  p_guest JSONB,
  p_table_token UUID,
  p_zone_id UUID,
  p_delivery_address TEXT,
  p_delivery_postal_code TEXT,
  p_notes TEXT,
  p_member_pass_serial UUID,
  p_tip_cents INTEGER,
  p_request_fingerprint TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_venue_id UUID;
  v_existing_fingerprint TEXT;
  v_result JSONB;
BEGIN
  SELECT venue_id INTO v_venue_id
  FROM public.venues
  WHERE slug = p_venue_slug AND COALESCE(kill_switch, false) = false;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'VENUE_NOT_FOUND';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('checkout:' || v_venue_id::TEXT || ':' || p_client_uuid::TEXT));
  SELECT request_fingerprint INTO v_existing_fingerprint
  FROM public.order_checkout_operations
  WHERE venue_id = v_venue_id AND client_uuid = p_client_uuid;
  IF FOUND AND v_existing_fingerprint <> p_request_fingerprint THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CHECKOUT_CART_CHANGED';
  END IF;

  v_result := public.create_storefront_order(
    p_venue_slug, p_client_uuid, p_order_type, p_items, p_guest, p_table_token,
    p_zone_id, p_delivery_address, p_delivery_postal_code, p_notes,
    p_member_pass_serial, p_tip_cents
  );

  INSERT INTO public.order_checkout_operations (venue_id, client_uuid, order_id, request_fingerprint)
  VALUES (v_venue_id, p_client_uuid, (v_result->>'order_id')::UUID, p_request_fingerprint)
  ON CONFLICT (venue_id, client_uuid) DO NOTHING;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.create_storefront_order_checked(
  TEXT, UUID, TEXT, JSONB, JSONB, UUID, UUID, TEXT, TEXT, TEXT, UUID, INTEGER, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_storefront_order_checked(
  TEXT, UUID, TEXT, JSONB, JSONB, UUID, UUID, TEXT, TEXT, TEXT, UUID, INTEGER, TEXT
) TO service_role;

-- Serialize all pending provider attempts on the order row. In particular, a
-- simultaneous retry after a failed attempt receives the same new pending
-- attempt and therefore the same external idempotency key.
CREATE OR REPLACE FUNCTION public.reserve_storefront_payment_attempt(
  p_order_id UUID,
  p_venue_id UUID,
  p_provider TEXT,
  p_amount_cents INTEGER,
  p_currency TEXT,
  p_proposed_attempt_key UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_pending public.payments%ROWTYPE;
  v_operation_key TEXT;
BEGIN
  SELECT * INTO v_order FROM public.orders AS o
  WHERE o.order_id = p_order_id AND o.venue_id = p_venue_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ORDER_NOT_FOUND';
  END IF;
  IF v_order.status <> 'pending' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'PAYMENT_NOT_PENDING';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.payments AS p
    WHERE p.order_id = p_order_id
      AND p.venue_id = p_venue_id
      AND p.status IN ('succeeded', 'reconciliation_required')
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'PAYMENT_NOT_RETRYABLE';
  END IF;

  SELECT * INTO v_pending FROM public.payments AS p
  WHERE p.order_id = p_order_id AND p.venue_id = p_venue_id AND p.status = 'pending'
  ORDER BY p.created_at DESC
  LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'payment_id', v_pending.payment_id,
      'status', v_pending.status,
      'provider', v_pending.provider,
      'idempotency_key', v_pending.idempotency_key,
      'raw', v_pending.raw
    );
  END IF;

  v_operation_key := 'order:' || p_order_id::TEXT || ':checkout:' || p_proposed_attempt_key::TEXT;
  INSERT INTO public.payments (
    venue_id, order_id, provider, amount_cents, currency, status, idempotency_key, raw
  ) VALUES (
    p_venue_id, p_order_id, p_provider, p_amount_cents, p_currency, 'pending',
    p_proposed_attempt_key, jsonb_build_object('provider_operation_key', v_operation_key)
  ) RETURNING * INTO v_pending;

  RETURN jsonb_build_object(
    'payment_id', v_pending.payment_id,
    'status', v_pending.status,
    'provider', v_pending.provider,
    'idempotency_key', v_pending.idempotency_key,
    'raw', v_pending.raw
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_storefront_payment_attempt(UUID, UUID, TEXT, INTEGER, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_storefront_payment_attempt(UUID, UUID, TEXT, INTEGER, TEXT, UUID)
  TO service_role;

-- A verified provider success after cancellation must not award points,
-- deplete stock, or emit order.paid. Preserve it for manual reconciliation.
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded', 'reconciliation_required'));

-- PostgreSQL cannot change a function's OUT-column signature with CREATE OR
-- REPLACE. This exact, service-only function has no SQL dependants in this
-- repository; recreate it with an explicit reconciliation outcome.
DROP FUNCTION IF EXISTS public.record_order_payment_success(TEXT, TEXT, INTEGER, JSONB);

CREATE OR REPLACE FUNCTION public.record_order_payment_success(
  p_provider TEXT,
  p_provider_ref TEXT,
  p_amount_cents INTEGER,
  p_raw JSONB DEFAULT '{}'::JSONB
)
RETURNS TABLE (
  order_id UUID,
  venue_id UUID,
  applied BOOLEAN,
  amount_mismatch BOOLEAN,
  reconciliation_required BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_order public.orders%ROWTYPE;
BEGIN
  SELECT * INTO v_payment FROM public.payments
  WHERE provider = p_provider AND provider_ref = p_provider_ref
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment_not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_order FROM public.orders AS o
  WHERE o.order_id = v_payment.order_id AND o.venue_id = v_payment.venue_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment_order_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_payment.amount_cents <> p_amount_cents THEN
    UPDATE public.payments SET status = 'reconciliation_required', raw = COALESCE(raw, '{}'::JSONB) || p_raw
    WHERE payment_id = v_payment.payment_id AND status = 'pending';
    RETURN QUERY SELECT v_payment.order_id, v_payment.venue_id, false, true, true;
    RETURN;
  END IF;
  IF v_payment.status <> 'pending' THEN
    IF v_payment.status <> 'succeeded' THEN
      -- The order row is already locked. Quarantine a retry that may have
      -- been reserved while this verified success was in flight.
      UPDATE public.payments AS p
      SET status = 'reconciliation_required', raw = COALESCE(p.raw, '{}'::JSONB) || p_raw
      WHERE p.order_id = v_payment.order_id
        AND p.venue_id = v_payment.venue_id
        AND p.status IN ('pending', 'failed');
    END IF;
    RETURN QUERY SELECT v_payment.order_id, v_payment.venue_id, false, false, v_payment.status <> 'succeeded';
    RETURN;
  END IF;
  IF v_order.status <> 'pending' THEN
    UPDATE public.payments SET status = 'reconciliation_required', raw = COALESCE(raw, '{}'::JSONB) || p_raw
    WHERE payment_id = v_payment.payment_id;
    INSERT INTO public.events (actor, venue_id, type, payload) VALUES (
      'provider:' || p_provider, v_payment.venue_id, 'payment.reconciliation_required',
      jsonb_build_object('order_id', v_payment.order_id, 'provider_ref', p_provider_ref, 'order_status', v_order.status)
    );
    RETURN QUERY SELECT v_payment.order_id, v_payment.venue_id, false, false, true;
    RETURN;
  END IF;

  UPDATE public.payments SET status = 'succeeded', raw = COALESCE(raw, '{}'::JSONB) || p_raw WHERE payment_id = v_payment.payment_id;
  UPDATE public.orders AS o SET status = 'paid', updated_at = NOW() WHERE o.order_id = v_order.order_id;
  INSERT INTO public.events (actor, venue_id, type, payload) VALUES (
    'provider:' || p_provider, v_payment.venue_id, 'order.paid',
    jsonb_build_object('order_id', v_payment.order_id, 'provider_ref', p_provider_ref, 'provider_event_id', p_raw->>'provider_event_id')
  );
  BEGIN
    PERFORM public.deplete_order_stock(v_payment.order_id);
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      INSERT INTO public.events (actor, venue_id, type, payload) VALUES (
        'system', v_payment.venue_id, 'inventory.depletion_failed',
        jsonb_build_object('order_id', v_payment.order_id, 'phase', 'depletion', 'sqlstate', SQLSTATE, 'message', SQLERRM)
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'depletion failure event unwritable for order %', v_payment.order_id;
    END;
  END;
  RETURN QUERY SELECT v_payment.order_id, v_payment.venue_id, true, false, false;
END;
$$;

REVOKE ALL ON FUNCTION public.record_order_payment_success(TEXT, TEXT, INTEGER, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_order_payment_success(TEXT, TEXT, INTEGER, JSONB)
  TO service_role;
