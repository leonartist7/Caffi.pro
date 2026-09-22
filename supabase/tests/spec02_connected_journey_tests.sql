-- SPEC-02 local-fixture checks. All writes roll back. Run only through
-- `npm run test:db`, which refuses non-loopback database URLs.

BEGIN;

DO $$
DECLARE
  v_client UUID := '1b000000-0000-4000-8000-000000000001';
  v_result JSONB;
  v_order UUID;
  v_tracking UUID;
  v_payment_result RECORD;
BEGIN
  -- The RPC receives only IDs and quantities: it calculates the selected
  -- modifier price and rejects data owned by another tenant.
  SELECT public.create_storefront_order_checked(
    'spec01-north-one',
    v_client,
    'pickup',
    jsonb_build_array(jsonb_build_object(
      'item_id', '16000000-0000-4000-8000-000000000001',
      'quantity', 1,
      'modifier_ids', jsonb_build_array('18000000-0000-4000-8000-000000000002')
    )),
    jsonb_build_object('name', 'SPEC-02 Guest'),
    NULL, NULL, NULL, NULL, NULL, NULL, 0, 'spec02-fingerprint-a'
  ) INTO v_result;

  IF (v_result->>'subtotal_cents')::INTEGER <> 550 THEN
    RAISE EXCEPTION 'Server did not calculate expected modifier total';
  END IF;
  IF COALESCE((v_result->>'replayed')::BOOLEAN, true) THEN
    RAISE EXCEPTION 'First checkout operation was unexpectedly replayed';
  END IF;
  v_order := (v_result->>'order_id')::UUID;
  SELECT guest_tracking_token INTO v_tracking FROM public.orders WHERE order_id = v_order;
  IF v_tracking IS NULL THEN
    RAISE EXCEPTION 'Guest tracking credential was not generated';
  END IF;

  -- A signed provider success that arrives after the restaurant has canceled
  -- the order is retained for reconciliation and cannot mark it paid.
  INSERT INTO public.payments (
    venue_id, order_id, provider, provider_ref, amount_cents, currency, status, idempotency_key
  ) VALUES (
    '13000000-0000-4000-8000-000000000001', v_order, 'test', 'test_late_success',
    (v_result->>'total_cents')::INTEGER, 'CAD', 'pending', '1b000000-0000-4000-8000-000000000099'
  );
  UPDATE public.orders SET status = 'canceled' WHERE order_id = v_order;
  SELECT * INTO v_payment_result FROM public.record_order_payment_success(
    'test', 'test_late_success', (v_result->>'total_cents')::INTEGER, '{"provider_event_id":"late-success"}'::JSONB
  );
  IF v_payment_result.applied OR v_payment_result.amount_mismatch THEN
    RAISE EXCEPTION 'Late payment success changed a canceled order';
  END IF;
  IF (SELECT status FROM public.payments WHERE provider_ref = 'test_late_success') <> 'reconciliation_required' THEN
    RAISE EXCEPTION 'Late payment success was not marked for reconciliation';
  END IF;

  SELECT public.create_storefront_order_checked(
    'spec01-north-one', v_client, 'pickup',
    jsonb_build_array(jsonb_build_object('item_id', '16000000-0000-4000-8000-000000000001', 'quantity', 1, 'modifier_ids', jsonb_build_array('18000000-0000-4000-8000-000000000002'))),
    jsonb_build_object('name', 'SPEC-02 Guest'), NULL, NULL, NULL, NULL, NULL, NULL, 0, 'spec02-fingerprint-a'
  ) INTO v_result;
  IF NOT COALESCE((v_result->>'replayed')::BOOLEAN, false) OR (v_result->>'order_id')::UUID <> v_order THEN
    RAISE EXCEPTION 'Duplicate checkout operation did not replay one order';
  END IF;

  BEGIN
    PERFORM public.create_storefront_order_checked(
      'spec01-north-one', v_client, 'pickup',
      jsonb_build_array(jsonb_build_object('item_id', '16000000-0000-4000-8000-000000000001', 'quantity', 2)),
      jsonb_build_object('name', 'SPEC-02 Guest'), NULL, NULL, NULL, NULL, NULL, NULL, 0, 'spec02-fingerprint-changed'
    );
    RAISE EXCEPTION 'Changed checkout cart reused the first operation';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    IF SQLERRM NOT LIKE '%CHECKOUT_CART_CHANGED%' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.create_storefront_order(
      'spec01-north-one', '1b000000-0000-4000-8000-000000000002', 'pickup',
      jsonb_build_array(jsonb_build_object('item_id', '16000000-0000-4000-8000-000000000001', 'quantity', 1, 'modifier_ids', jsonb_build_array('18000000-0000-4000-8000-000000000003'))),
      jsonb_build_object('name', 'SPEC-02 Guest'), NULL, NULL, NULL, NULL, NULL, NULL, 0
    );
    RAISE EXCEPTION 'Inactive modifier was accepted';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    IF SQLERRM NOT LIKE '%INVALID_MODIFIERS%' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.create_storefront_order(
      'spec01-north-one', '1b000000-0000-4000-8000-000000000003', 'pickup',
      jsonb_build_array(jsonb_build_object('item_id', '16000000-0000-4000-8000-000000000004', 'quantity', 1)),
      jsonb_build_object('name', 'SPEC-02 Guest'), NULL, NULL, NULL, NULL, NULL, NULL, 0
    );
    RAISE EXCEPTION 'Cross-tenant item was accepted';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    IF SQLERRM NOT LIKE '%ITEM_UNAVAILABLE%' THEN RAISE; END IF;
  END;
END;
$$;

DO $$
DECLARE
  v_delivery_order UUID := '1b000000-0000-4000-8000-000000000010';
BEGIN
  INSERT INTO public.orders (
    order_id, venue_id, client_uuid, order_type, status, guest_name, subtotal_cents, total_cents
  )
  VALUES (
    v_delivery_order,
    '13000000-0000-4000-8000-000000000001',
    '1b000000-0000-4000-8000-000000000010',
    'delivery', 'ready', 'SPEC-02 Delivery Boundary', 0, 0
  );
  BEGIN
    PERFORM public.transition_order_status(
      v_delivery_order, '13000000-0000-4000-8000-000000000001', 'out_for_delivery', 'spec02-test'
    );
    RAISE EXCEPTION 'Delivery advanced without a courier dispatch';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    IF SQLERRM NOT LIKE '%DELIVERY_DISPATCH_REQUIRED%' THEN RAISE; END IF;
  END;
END;
$$;

ROLLBACK;
SELECT 'SPEC-02 CONNECTED JOURNEY SQL TESTS PASSED' AS result;
