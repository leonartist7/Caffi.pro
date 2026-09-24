-- Expose a member's own display name on the derived, invoker-scoped status
-- view. PostgREST cannot embed members through this view as an FK relation.
-- Existing columns and grants remain in place; this appends one column.
CREATE OR REPLACE VIEW public.member_status WITH (security_invoker = true) AS
SELECT
    m.member_id,
    m.tenant_id AS venue_id,
    v.visit_count,
    v.last_visit_at,
    c.cadence_days,
    d.days_since_last,
    CASE
        WHEN COALESCE(v.visit_count, 0) < 3 THEN 'new'
        WHEN d.days_since_last > 60 THEN 'lost'
        WHEN c.cadence_days IS NOT NULL AND d.days_since_last > 2 * c.cadence_days THEN 'fading'
        ELSE 'regular'
    END AS status,
    m.full_name
FROM public.members m
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS visit_count, MAX(ts) AS last_visit_at
    FROM public.visits WHERE member_id = m.member_id
) v ON true
LEFT JOIN LATERAL (SELECT public.member_cadence_days(m.member_id) AS cadence_days) c ON true
LEFT JOIN LATERAL (
    SELECT EXTRACT(EPOCH FROM NOW() - v.last_visit_at) / 86400.0 AS days_since_last
) d ON true;
