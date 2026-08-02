-- PLAN-36: tip allocation report. Read-only computation happens entirely in
-- TypeScript (lib/tips/allocate.ts) against data already live from PLAN-10 —
-- this migration adds exactly one function, no new tables/columns.
--
-- save_tip_allocation persists an already-computed, already-validated row
-- set atomically: delete any existing rows for this (venue, period) across
-- ALL bases, then insert the fresh set. Scoped to the whole period rather
-- than just the basis being saved because tip_allocations has no unique
-- key preventing duplicate accumulation across repeated saves, and exactly
-- one basis is ever "the" answer for a given period at a time (design:
-- docs/plans/PLAN-36-tip-allocation.md §5). Both statements run inside the
-- function's own implicit transaction, so a failure on the insert leaves
-- the prior snapshot untouched rather than an empty period.
--
-- SECURITY DEFINER + zero grants to anon/authenticated, matching the
-- set_venue_review_url / set_venue_tip_delivery_enabled precedent — every
-- caller is the service-role client behind an already-run
-- requireVenueRole(venueId, ['owner']) check in the API route, never a
-- direct client call.

CREATE OR REPLACE FUNCTION public.save_tip_allocation(
    p_venue_id UUID,
    p_period_start TIMESTAMPTZ,
    p_period_end TIMESTAMPTZ,
    p_rows JSONB  -- array of {shift_id, membership_id, tip_cents, basis}
)
RETURNS SETOF tip_allocations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_period_end < p_period_start THEN
        RAISE EXCEPTION 'save_tip_allocation: period_end must be >= period_start';
    END IF;

    DELETE FROM tip_allocations
    WHERE venue_id = p_venue_id
      AND period_start = p_period_start
      AND period_end = p_period_end;

    RETURN QUERY
    INSERT INTO tip_allocations (venue_id, shift_id, membership_id, period_start, period_end, tip_cents, basis)
    SELECT
        p_venue_id,
        (r->>'shift_id')::uuid,
        (r->>'membership_id')::uuid,
        p_period_start,
        p_period_end,
        (r->>'tip_cents')::integer,
        r->>'basis'
    FROM jsonb_array_elements(p_rows) AS r
    RETURNING *;
END;
$$;

REVOKE ALL ON FUNCTION public.save_tip_allocation(UUID, TIMESTAMPTZ, TIMESTAMPTZ, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_tip_allocation(UUID, TIMESTAMPTZ, TIMESTAMPTZ, JSONB) TO service_role;
