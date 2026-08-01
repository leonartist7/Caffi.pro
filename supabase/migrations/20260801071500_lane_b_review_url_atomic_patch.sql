-- PLAN-21: post-payment review prompt. Owner-configured destination URL
-- lives at venues.brand_kit.review_profile.url — same zero-migration JSONB
-- namespacing precedent as brand_kit.site_profile and brand_kit.tip_config.
--
-- Mirrors PLAN-20's set_venue_tip_delivery_enabled: a single atomic UPDATE
-- that only ever touches brand_kit->'review_profile'->'url', merged against
-- the row's current brand_kit at lock time, so a concurrent writer of
-- unrelated brand_kit keys (e.g. the client site-profile route) can never
-- be clobbered by this save.
CREATE OR REPLACE FUNCTION public.set_venue_review_url(p_venue_id UUID, p_url TEXT)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    UPDATE venues
    SET brand_kit = COALESCE(brand_kit, '{}'::jsonb) ||
        jsonb_build_object(
            'review_profile',
            COALESCE(brand_kit->'review_profile', '{}'::jsonb) ||
                jsonb_build_object('url', p_url)
        )
    WHERE venue_id = p_venue_id
    RETURNING brand_kit->'review_profile';
$$;

REVOKE ALL ON FUNCTION public.set_venue_review_url(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_venue_review_url(UUID, TEXT) TO service_role;
