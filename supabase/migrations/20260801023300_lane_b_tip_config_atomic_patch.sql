-- PLAN-20 follow-up (Codex/CodeRabbit review on PR #61): the tip-settings
-- PATCH route previously read brand_kit, merged in JS, and wrote the whole
-- object back -- a classic read-modify-write race with any other writer of
-- the same JSONB column (e.g. app/api/clients/[id]/route.ts), and it never
-- checked the read for an error/null venue before overwriting. This makes
-- the delivery-tip toggle a single atomic UPDATE that only ever touches
-- brand_kit->'tip_config'->'delivery_enabled', merged against whatever the
-- row's current brand_kit actually is at the moment the row lock is
-- acquired -- immune to a concurrent writer clobbering unrelated keys.
CREATE OR REPLACE FUNCTION public.set_venue_tip_delivery_enabled(p_venue_id UUID, p_delivery_enabled BOOLEAN)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    UPDATE venues
    SET brand_kit = COALESCE(brand_kit, '{}'::jsonb) ||
        jsonb_build_object(
            'tip_config',
            COALESCE(brand_kit->'tip_config', '{}'::jsonb) ||
                jsonb_build_object('delivery_enabled', p_delivery_enabled)
        )
    WHERE venue_id = p_venue_id
    RETURNING brand_kit->'tip_config';
$$;

REVOKE ALL ON FUNCTION public.set_venue_tip_delivery_enabled(UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_venue_tip_delivery_enabled(UUID, BOOLEAN) TO service_role;
