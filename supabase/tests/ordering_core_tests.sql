-- Ordering Core live invariants. Safe on production: all writes roll back.

BEGIN;

DO $$
DECLARE
    v_venue_id UUID := 'a0000000-0000-4000-3000-000000000001';
    v_success_order UUID := uuid_generate_v4();
    v_mismatch_order UUID := uuid_generate_v4();
    v_success_ref TEXT := 'ordering_test_' || uuid_generate_v4()::text;
    v_mismatch_ref TEXT := 'ordering_test_' || uuid_generate_v4()::text;
    v_result RECORD;
    v_status TEXT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM venues WHERE venue_id = v_venue_id) THEN
        RAISE EXCEPTION 'Ordering test venue is missing';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
    ) THEN
        RAISE EXCEPTION 'At least one public table is missing RLS';
    END IF;

    IF has_any_column_privilege('anon', 'public.orders', 'SELECT')
       OR has_any_column_privilege('authenticated', 'public.payments', 'SELECT') THEN
        RAISE EXCEPTION 'Private Ordering tables have browser read grants';
    END IF;

    IF has_function_privilege(
        'anon',
        'public.record_order_payment_success(text,text,integer,jsonb)',
        'EXECUTE'
    ) THEN
        RAISE EXCEPTION 'Payment reconciliation RPC is anon-executable';
    END IF;

    INSERT INTO orders (
        order_id, venue_id, client_uuid, order_type, status, guest_name,
        subtotal_cents, delivery_fee_cents, tax_cents, total_cents
    ) VALUES (
        v_success_order, v_venue_id, uuid_generate_v4(), 'pickup', 'pending',
        'Ordering Core Test', 1000, 0, 0, 1000
    );

    INSERT INTO payments (
        venue_id, order_id, provider, provider_ref, amount_cents, currency,
        status, idempotency_key
    ) VALUES (
        v_venue_id, v_success_order, 'stripe', v_success_ref, 1000, 'CAD',
        'pending', uuid_generate_v4()
    );

    SELECT * INTO v_result
    FROM record_order_payment_success('stripe', v_success_ref, 1000, '{"test":true}');

    IF NOT v_result.applied OR v_result.amount_mismatch THEN
        RAISE EXCEPTION 'Expected first payment success to apply exactly once';
    END IF;

    SELECT status INTO v_status FROM orders WHERE order_id = v_success_order;
    IF v_status <> 'paid' THEN
        RAISE EXCEPTION 'Successful payment did not move order to paid';
    END IF;

    IF (
        SELECT COUNT(*)
        FROM events
        WHERE type = 'order.paid'
          AND payload ->> 'order_id' = v_success_order::text
    ) <> 1 THEN
        RAISE EXCEPTION 'Successful payment did not emit exactly one order.paid event';
    END IF;

    SELECT * INTO v_result
    FROM record_order_payment_success('stripe', v_success_ref, 1000, '{"replay":true}');

    IF v_result.applied OR v_result.amount_mismatch THEN
        RAISE EXCEPTION 'Webhook replay was not an idempotent no-op';
    END IF;

    IF (
        SELECT COUNT(*)
        FROM events
        WHERE type = 'order.paid'
          AND payload ->> 'order_id' = v_success_order::text
    ) <> 1 THEN
        RAISE EXCEPTION 'Webhook replay emitted a duplicate order.paid event';
    END IF;

    INSERT INTO orders (
        order_id, venue_id, client_uuid, order_type, status, guest_name,
        subtotal_cents, delivery_fee_cents, tax_cents, total_cents
    ) VALUES (
        v_mismatch_order, v_venue_id, uuid_generate_v4(), 'pickup', 'pending',
        'Ordering Core Test', 1000, 0, 0, 1000
    );

    INSERT INTO payments (
        venue_id, order_id, provider, provider_ref, amount_cents, currency,
        status, idempotency_key
    ) VALUES (
        v_venue_id, v_mismatch_order, 'stripe', v_mismatch_ref, 1000, 'CAD',
        'pending', uuid_generate_v4()
    );

    SELECT * INTO v_result
    FROM record_order_payment_success('stripe', v_mismatch_ref, 999, '{"test":true}');

    IF v_result.applied OR NOT v_result.amount_mismatch THEN
        RAISE EXCEPTION 'Amount mismatch was not rejected';
    END IF;

    SELECT status INTO v_status
    FROM payments WHERE provider = 'stripe' AND provider_ref = v_mismatch_ref;
    IF v_status <> 'failed' THEN
        RAISE EXCEPTION 'Amount mismatch did not mark pending payment failed';
    END IF;

    SELECT status INTO v_status FROM orders WHERE order_id = v_mismatch_order;
    IF v_status <> 'pending' THEN
        RAISE EXCEPTION 'Amount mismatch advanced the order unexpectedly';
    END IF;
END;
$$;

ROLLBACK;

SELECT 'ALL ORDERING CORE TESTS PASSED' AS result;
