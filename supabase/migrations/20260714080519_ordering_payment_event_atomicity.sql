-- ============================================================================
-- ORDERING PAYMENT EVENT ATOMICITY
--
-- Payment success, order advancement, and the order.paid analytics event must
-- commit together. A replay sees the locked succeeded payment and emits no
-- duplicate event.
-- ============================================================================

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

    RETURN QUERY SELECT v_payment.order_id, v_payment.venue_id, true, false;
END;
$$;

REVOKE ALL ON FUNCTION public.record_order_payment_success(TEXT, TEXT, INTEGER, JSONB)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_order_payment_success(TEXT, TEXT, INTEGER, JSONB)
    TO service_role;
