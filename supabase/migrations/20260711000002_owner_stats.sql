-- ============================================================================
-- OWNER STATS (Plan 4) — the one number + tiles, in ONE round trip.
--
-- "Regulars returned this week" = distinct members with >=3 visits ever
-- (cadence is noise below that) whose first visit THIS venue-local week
-- followed a gap >= 1.5x their own median cadence — people who were
-- drifting and came back. Never double-counts a brand-new member's 2nd
-- visit as a "return".
--
-- at-risk tile trend needs a snapshot because member_status is a
-- point-in-time view (no history) — snapshot-on-first-call-per-day is
-- cron-free.
-- ============================================================================

CREATE TABLE IF NOT EXISTS status_snapshots (
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    day DATE NOT NULL,
    fading_count INTEGER NOT NULL,
    PRIMARY KEY (venue_id, day)
);

CREATE INDEX IF NOT EXISTS idx_visits_venue_member_ts ON visits(venue_id, member_id, ts DESC);

-- venues.timezone already exists (default 'America/Edmonton', set in
-- 20260707000001) — no column add needed here.

CREATE OR REPLACE FUNCTION venue_week_stats(p_venue_id UUID, p_tz TEXT)
RETURNS TABLE (
    regulars_returned INTEGER,
    members_this_week INTEGER,
    members_last_week INTEGER,
    visits_this_week INTEGER,
    visits_last_week INTEGER,
    fading_now INTEGER,
    fading_7d_ago INTEGER,
    has_any_data BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_week_start TIMESTAMPTZ;
    v_last_week_start TIMESTAMPTZ;
    v_today DATE;
BEGIN
    -- Venue-local Monday 00:00 for the current and previous week, converted
    -- back to a proper timestamptz. date_trunc('week', ...) is ISO (Monday).
    v_week_start := (date_trunc('week', NOW() AT TIME ZONE p_tz)) AT TIME ZONE p_tz;
    v_last_week_start := v_week_start - INTERVAL '7 days';
    v_today := (NOW() AT TIME ZONE p_tz)::date;

    -- Snapshot today's fading count once (first call of the day wins).
    INSERT INTO status_snapshots (venue_id, day, fading_count)
    SELECT p_venue_id, v_today, COUNT(*)
    FROM member_status
    WHERE venue_id = p_venue_id AND status = 'fading'
    ON CONFLICT (venue_id, day) DO NOTHING;

    RETURN QUERY
    WITH visit_agg AS (
        SELECT
            v.member_id,
            COUNT(*) AS total_visits,
            MAX(v.ts) FILTER (WHERE v.ts < v_week_start) AS prev_visit_ts,
            MIN(v.ts) FILTER (WHERE v.ts >= v_week_start) AS first_visit_this_week
        FROM visits v
        WHERE v.venue_id = p_venue_id
        GROUP BY v.member_id
    ),
    regulars AS (
        SELECT COUNT(*) AS n
        FROM visit_agg va
        WHERE va.total_visits >= 3
          AND va.first_visit_this_week IS NOT NULL
          AND va.prev_visit_ts IS NOT NULL
          AND EXTRACT(EPOCH FROM (va.first_visit_this_week - va.prev_visit_ts)) / 86400.0
              >= 1.5 * member_cadence_days(va.member_id)
    ),
    member_counts AS (
        SELECT
            COUNT(*) FILTER (WHERE created_at >= v_week_start) AS this_week,
            COUNT(*) FILTER (WHERE created_at >= v_last_week_start AND created_at < v_week_start) AS last_week
        FROM members WHERE tenant_id = p_venue_id
    ),
    visit_counts AS (
        SELECT
            COUNT(*) FILTER (WHERE ts >= v_week_start) AS this_week,
            COUNT(*) FILTER (WHERE ts >= v_last_week_start AND ts < v_week_start) AS last_week
        FROM visits WHERE venue_id = p_venue_id
    ),
    fading AS (
        SELECT COUNT(*) AS now_count
        FROM member_status WHERE venue_id = p_venue_id AND status = 'fading'
    ),
    fading_prior AS (
        SELECT fading_count FROM status_snapshots
        WHERE venue_id = p_venue_id AND day = v_today - 7
    ),
    presence AS (
        SELECT EXISTS (SELECT 1 FROM members WHERE tenant_id = p_venue_id) AS any_members
    )
    SELECT
        regulars.n::INTEGER,
        member_counts.this_week::INTEGER,
        member_counts.last_week::INTEGER,
        visit_counts.this_week::INTEGER,
        visit_counts.last_week::INTEGER,
        fading.now_count::INTEGER,
        fading_prior.fading_count::INTEGER,
        presence.any_members
    FROM regulars, member_counts, visit_counts, fading, presence
    LEFT JOIN fading_prior ON true;
END;
$$;

-- service_role ONLY: this function does not verify the caller's membership
-- of p_venue_id, so any authenticated user could otherwise pass an
-- arbitrary venue_id and read another venue's aggregate stats. The (owner)
-- layout's session+role check is what authorizes the venueId before
-- lib/owner-stats.ts calls this via the service-role client.
REVOKE ALL ON FUNCTION venue_week_stats(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION venue_week_stats(UUID, TEXT) TO service_role;
