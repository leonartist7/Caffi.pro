-- PLAN-24: perpetual depletion. Idempotency design authored by an Opus-5
-- architect pass (per master-plan doctrine: a double-decrement is silent
-- and unrecoverable, so this one guarantee is not improvised at Sonnet
-- tier). See docs/plans/PLAN-24-perpetual-depletion.md for the full
-- rationale.

-- --------------------------------------------------------------------------
-- 1 · Widen the reason vocabulary. Additive: every existing row still
--     satisfies the new CHECK. 'sale_reversal' is machine-written only —
--     the manual movements API whitelist (receive/waste/adjust/count) is
--     NOT widened to include 'sale' or 'sale_reversal'.
-- --------------------------------------------------------------------------
ALTER TABLE inventory_movements
    DROP CONSTRAINT IF EXISTS inventory_movements_reason_check;
ALTER TABLE inventory_movements
    ADD CONSTRAINT inventory_movements_reason_check
    CHECK (reason IN ('receive', 'count', 'waste', 'sale', 'adjust', 'sale_reversal'));

-- --------------------------------------------------------------------------
-- 2 · THE GUARANTEE. One movement row per (order, inventory item) per kind.
--     Partial, so manual movements (order_id IS NULL) are unconstrained.
--     Paired with the GROUP BY in deplete_order_stock(): an order that uses
--     the same ingredient across two lines writes ONE summed row, never two.
-- --------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_movements_order_sale
    ON inventory_movements(order_id, item_id)
    WHERE order_id IS NOT NULL AND reason = 'sale';

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_movements_order_sale_reversal
    ON inventory_movements(order_id, item_id)
    WHERE order_id IS NOT NULL AND reason = 'sale_reversal';

-- --------------------------------------------------------------------------
-- 3 · Depletion. Safe to call any number of times for any order: the index
--     makes every call after the first a no-op (returns rows inserted, 0 on
--     replay). An order with no recipe links produces zero rows, no error.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.deplete_order_stock(p_order_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_rows INTEGER := 0;
BEGIN
    INSERT INTO public.inventory_movements (
        venue_id, item_id, qty, reason, order_id, note
    )
    SELECT
        o.venue_id,
        mii.inventory_item_id,
        -SUM(mii.qty_per_unit * oi.quantity),
        'sale',
        o.order_id,
        'Auto-depleted on payment'
    FROM public.orders o
    JOIN public.order_items oi
      ON oi.order_id = o.order_id
    JOIN public.menu_item_ingredients mii
      ON mii.item_id = oi.item_id
     AND mii.venue_id = o.venue_id
    WHERE o.order_id = p_order_id
      -- A cancelled/refunded/unpaid order must never deplete, even if this
      -- function is invoked by hand. At the webhook call site the order was
      -- just set to 'paid' in this same transaction, so this always passes.
      AND o.status NOT IN ('pending', 'canceled', 'refunded')
    GROUP BY o.venue_id, o.order_id, mii.inventory_item_id
    HAVING SUM(mii.qty_per_unit * oi.quantity) > 0
    ON CONFLICT (order_id, item_id)
        WHERE order_id IS NOT NULL AND reason = 'sale'
        DO NOTHING;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    RETURN v_rows;
END;
$$;

REVOKE ALL ON FUNCTION public.deplete_order_stock(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.deplete_order_stock(UUID) TO service_role;

-- --------------------------------------------------------------------------
-- 4 · Reversal. Negates the STORED sale rows — never re-derived from the
--     recipe, which may have changed since the sale. Append-only: the
--     original 'sale' rows are left exactly as they are.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reverse_order_stock_depletion(p_order_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_rows INTEGER := 0;
BEGIN
    INSERT INTO public.inventory_movements (
        venue_id, item_id, qty, reason, order_id, note
    )
    SELECT
        m.venue_id,
        m.item_id,
        -m.qty,
        'sale_reversal',
        m.order_id,
        'Reversed on refund of order ' || LEFT(m.order_id::TEXT, 8)
    FROM public.inventory_movements m
    WHERE m.order_id = p_order_id
      AND m.reason = 'sale'
    ON CONFLICT (order_id, item_id)
        WHERE order_id IS NOT NULL AND reason = 'sale_reversal'
        DO NOTHING;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    RETURN v_rows;
END;
$$;

REVOKE ALL ON FUNCTION public.reverse_order_stock_depletion(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_order_stock_depletion(UUID) TO service_role;

-- --------------------------------------------------------------------------
-- 5 · record_order_payment_success — exact live body (verified via
--     pg_get_functiondef immediately before writing this migration; matches
--     20260714080519_ordering_payment_event_atomicity.sql byte for byte)
--     plus the guarded depletion call. Depletion runs inside the payment
--     transaction but inside its own savepoint (the BEGIN...EXCEPTION
--     block): a stock bug can never reverse a sale. The failure-logging
--     insert is itself guarded so IT can't be the thing that reverses a
--     sale either.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_order_payment_success(
    p_provider TEXT,
    p_provider_ref TEXT,
    p_amount_cents INTEGER,
    p_raw JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
    order_id UUID,
    venue_id UUID,
    applied BOOLEAN,
    amount_mismatch BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_payment payments%ROWTYPE;
BEGIN
    SELECT * INTO v_payment
    FROM payments
    WHERE provider = p_provider AND provider_ref = p_provider_ref
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'payment_not_found' USING ERRCODE = 'P0002';
    END IF;

    IF v_payment.amount_cents <> p_amount_cents THEN
        UPDATE payments
        SET status = 'failed', raw = p_raw
        WHERE payment_id = v_payment.payment_id AND status = 'pending';

        RETURN QUERY SELECT v_payment.order_id, v_payment.venue_id, false, true;
        RETURN;
    END IF;

    IF v_payment.status <> 'pending' THEN
        RETURN QUERY SELECT v_payment.order_id, v_payment.venue_id, false, false;
        RETURN;
    END IF;

    UPDATE payments
    SET status = 'succeeded', raw = p_raw
    WHERE payment_id = v_payment.payment_id;

    UPDATE orders
    SET status = 'paid', updated_at = NOW()
    WHERE orders.order_id = v_payment.order_id AND orders.status = 'pending';

    INSERT INTO events (actor, venue_id, type, payload)
    VALUES (
        'provider:' || p_provider,
        v_payment.venue_id,
        'order.paid',
        jsonb_build_object(
            'order_id', v_payment.order_id,
            'provider_ref', p_provider_ref,
            'provider_event_id', p_raw ->> 'provider_event_id'
        )
    );

    -- Depletion is best-effort by design. This inner BEGIN...EXCEPTION is a
    -- sub-transaction (implicit savepoint): a failure rolls back the stock
    -- movements ONLY. The payment, the order status, and the order.paid
    -- event above are already durable and still commit. An order must
    -- never be lost to a stock bug.
    BEGIN
        PERFORM public.deplete_order_stock(v_payment.order_id);
    EXCEPTION WHEN OTHERS THEN
        BEGIN
            INSERT INTO events (actor, venue_id, type, payload)
            VALUES (
                'system',
                v_payment.venue_id,
                'inventory.depletion_failed',
                jsonb_build_object(
                    'order_id', v_payment.order_id,
                    'phase', 'depletion',
                    'sqlstate', SQLSTATE,
                    'message', SQLERRM
                )
            );
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'depletion failure event unwritable for order %', v_payment.order_id;
        END;
    END;

    RETURN QUERY SELECT v_payment.order_id, v_payment.venue_id, true, false;
END;
$$;

REVOKE ALL ON FUNCTION public.record_order_payment_success(TEXT, TEXT, INTEGER, JSONB)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_order_payment_success(TEXT, TEXT, INTEGER, JSONB)
    TO service_role;

-- --------------------------------------------------------------------------
-- 6 · transition_order_status — exact live body (includes PLAN-20's
--     subtotal_cents points fix and PLAN-22's accepted_at/ready_at
--     stamping, both applied live in prior unmerged Lane B PRs; re-pasting
--     an older migration's body here would silently regress both) plus the
--     guarded reversal call on -> refunded. search_path stays '' (empty),
--     so every identifier added below is schema-qualified.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.transition_order_status(
    p_order_id UUID, p_venue_id UUID, p_new_status TEXT, p_actor TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_order public.orders%ROWTYPE;
    v_points INTEGER := 0;
    v_rate NUMERIC := 0;
BEGIN
    SELECT * INTO v_order FROM public.orders
    WHERE order_id = p_order_id AND venue_id = p_venue_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ORDER_NOT_FOUND'; END IF;
    IF v_order.status = p_new_status THEN
        RETURN jsonb_build_object('order_id', v_order.order_id, 'status', v_order.status, 'replayed', true);
    END IF;
    IF NOT (
        (v_order.status = 'paid' AND p_new_status = 'accepted') OR
        (v_order.status = 'accepted' AND p_new_status = 'preparing') OR
        (v_order.status = 'preparing' AND p_new_status = 'ready') OR
        (v_order.status = 'ready' AND p_new_status = 'completed' AND v_order.order_type <> 'delivery') OR
        (v_order.status = 'ready' AND p_new_status = 'out_for_delivery' AND v_order.order_type = 'delivery') OR
        (v_order.status = 'out_for_delivery' AND p_new_status = 'completed') OR
        (p_new_status = 'canceled' AND v_order.status IN ('pending','paid','accepted','preparing','ready','out_for_delivery')) OR
        (p_new_status = 'refunded' AND v_order.status IN ('paid','accepted','preparing','ready','out_for_delivery','canceled'))
    ) THEN RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ILLEGAL_ORDER_TRANSITION'; END IF;

    -- Kitchen ticket-age timestamps (PLAN-22 reads these).
    UPDATE public.orders SET
        status = p_new_status,
        updated_at = NOW(),
        accepted_at = CASE WHEN p_new_status = 'accepted' THEN NOW() ELSE accepted_at END,
        ready_at = CASE WHEN p_new_status = 'ready' THEN NOW() ELSE ready_at END
    WHERE order_id = p_order_id;
    IF p_new_status = 'completed' AND v_order.member_id IS NOT NULL THEN
        SELECT COALESCE((loyalty_config->>'points_per_euro')::NUMERIC, 0) INTO v_rate
        FROM public.venues WHERE venue_id = p_venue_id;
        -- subtotal_cents only: tips and delivery/tax never earn points.
        v_points := FLOOR(v_order.subtotal_cents * v_rate / 100.0);
        IF v_points > 0 THEN
            INSERT INTO public.points_ledger (
                tenant_id, member_id, order_id, points_change, reason, description
            ) VALUES (
                p_venue_id, v_order.member_id, v_order.order_id, v_points, 'order',
                'Order ' || LEFT(v_order.order_id::TEXT, 8)
            ) ON CONFLICT (order_id) WHERE order_id IS NOT NULL AND reason = 'order' DO NOTHING;
        END IF;
    END IF;

    -- PLAN-24: a refund writes compensating stock movements in the same
    -- transaction as the status change, inside its own savepoint so a
    -- stock failure can never block or reverse the refund.
    IF p_new_status = 'refunded' THEN
        BEGIN
            PERFORM public.reverse_order_stock_depletion(p_order_id);
        EXCEPTION WHEN OTHERS THEN
            BEGIN
                INSERT INTO public.events(actor, venue_id, type, payload) VALUES (
                    'system', p_venue_id, 'inventory.depletion_failed',
                    jsonb_build_object(
                        'order_id', p_order_id,
                        'phase', 'reversal',
                        'sqlstate', SQLSTATE,
                        'message', SQLERRM
                    )
                );
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'reversal failure event unwritable for order %', p_order_id;
            END;
        END;
    END IF;

    INSERT INTO public.events(actor, venue_id, type, payload) VALUES (
        COALESCE(p_actor, 'system'), p_venue_id, 'order.status_changed',
        jsonb_build_object('order_id', p_order_id, 'from', v_order.status, 'to', p_new_status)
    );
    RETURN jsonb_build_object('order_id', p_order_id, 'status', p_new_status, 'points_awarded', v_points, 'replayed', false);
END;
$$;

REVOKE ALL ON FUNCTION public.transition_order_status(UUID, UUID, TEXT, TEXT)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.transition_order_status(UUID, UUID, TEXT, TEXT) TO service_role;
