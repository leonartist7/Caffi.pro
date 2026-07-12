-- ============================================================================
-- SECURITY HARDENING — fixes from get_advisors() run against the live
-- aro-platform project right after 20260707000001/2 applied cleanly.
-- ============================================================================

-- Lock down mutable search_path on trigger/helper functions (linter WARN:
-- function_search_path_mutable). Without this, a function can be tricked by
-- a caller-controlled search_path into resolving an unqualified identifier
-- to an attacker-created object.
ALTER FUNCTION touch_updated_at() SET search_path = public;
ALTER FUNCTION update_order_stats() SET search_path = public;
ALTER FUNCTION forbid_ledger_mutation() SET search_path = public;
ALTER FUNCTION award_order_loyalty_points() SET search_path = public;
ALTER FUNCTION award_signup_bonus() SET search_path = public;
ALTER FUNCTION member_cadence_days(UUID) SET search_path = public;

-- These SECURITY DEFINER helpers rely on auth.uid(); anon has none, so calls
-- return empty sets and aren't a data leak, but there is no legitimate reason
-- for anon to call them at all. Tighten to authenticated only (linter WARN:
-- anon_security_definer_function_executable).
REVOKE EXECUTE ON FUNCTION aro_my_venue_ids() FROM anon;
REVOKE EXECUTE ON FUNCTION aro_my_managed_venue_ids() FROM anon;
REVOKE EXECUTE ON FUNCTION aro_is_aro_admin() FROM anon;
