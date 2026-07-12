-- ============================================================================
-- PASS SERIALS (Plan 2 — diner join page)
-- Every member gets an unguessable pass serial: the bearer token printed as
-- the web-pass QR and scanned/pasted at the counter. Never enumerable; the
-- pass page resolves it server-side only (no anon grant on members).
-- ============================================================================

ALTER TABLE members
    ADD COLUMN IF NOT EXISTS pass_serial UUID NOT NULL DEFAULT gen_random_uuid();

-- Backfill happens implicitly via the DEFAULT on ADD COLUMN (Postgres 11+
-- fills existing rows). Enforce uniqueness + fast lookup:
CREATE UNIQUE INDEX IF NOT EXISTS uq_members_pass_serial ON members (pass_serial);
