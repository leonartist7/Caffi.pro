-- SPEC-02: a guest status link needs an unguessable, order-scoped capability.
-- The client operation UUID is idempotency material, not a public status credential.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS guest_tracking_token UUID;

UPDATE public.orders
SET guest_tracking_token = extensions.uuid_generate_v4()
WHERE guest_tracking_token IS NULL;

ALTER TABLE public.orders
  ALTER COLUMN guest_tracking_token SET NOT NULL;

ALTER TABLE public.orders
  ALTER COLUMN guest_tracking_token SET DEFAULT extensions.uuid_generate_v4();

CREATE UNIQUE INDEX IF NOT EXISTS orders_guest_tracking_token_key
  ON public.orders (guest_tracking_token);

-- Only the server-side order route knows both the guest operation UUID and
-- stored order. This permits recovery after a provider redirect interruption
-- without making an order UUID by itself a tracking capability.
CREATE OR REPLACE FUNCTION public.get_storefront_order_tracking_token(
  p_order_id UUID,
  p_venue_slug TEXT,
  p_client_uuid UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token UUID;
BEGIN
  SELECT o.guest_tracking_token
    INTO v_token
    FROM public.orders o
    JOIN public.venues v ON v.venue_id = o.venue_id
   WHERE o.order_id = p_order_id
     AND v.slug = p_venue_slug
     AND o.client_uuid = p_client_uuid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_tracking_not_found' USING ERRCODE = 'P0002';
  END IF;
  RETURN v_token;
END;
$$;

REVOKE ALL ON FUNCTION public.get_storefront_order_tracking_token(UUID, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_storefront_order_tracking_token(UUID, TEXT, UUID)
  TO service_role;
