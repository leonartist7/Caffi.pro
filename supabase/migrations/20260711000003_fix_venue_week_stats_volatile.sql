-- ============================================================================
-- FIX: venue_week_stats was created STABLE but contains a write (the daily
-- status_snapshots INSERT) — Postgres rejects data-modifying statements in
-- STABLE/IMMUTABLE functions, but only at call time, not at CREATE time.
-- Every call errored with "INSERT is not allowed in a non-volatile function".
-- ============================================================================

ALTER FUNCTION venue_week_stats(UUID, TEXT) VOLATILE;
