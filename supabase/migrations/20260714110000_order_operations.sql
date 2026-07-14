CREATE UNIQUE INDEX IF NOT EXISTS uq_points_ledger_order_award
    ON public.points_ledger(order_id) WHERE order_id IS NOT NULL AND reason = 'order';

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

    UPDATE public.orders SET status = p_new_status, updated_at = NOW() WHERE order_id = p_order_id;
    IF p_new_status = 'completed' AND v_order.member_id IS NOT NULL THEN
        SELECT COALESCE((loyalty_config->>'points_per_euro')::NUMERIC, 0) INTO v_rate
        FROM public.venues WHERE venue_id = p_venue_id;
        v_points := FLOOR(v_order.total_cents * v_rate / 100.0);
        IF v_points > 0 THEN
            INSERT INTO public.points_ledger (
                tenant_id, member_id, order_id, points_change, reason, description
            ) VALUES (
                p_venue_id, v_order.member_id, v_order.order_id, v_points, 'order',
                'Order ' || LEFT(v_order.order_id::TEXT, 8)
            ) ON CONFLICT (order_id) WHERE order_id IS NOT NULL AND reason = 'order' DO NOTHING;
        END IF;
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
