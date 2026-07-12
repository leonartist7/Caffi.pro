-- ============================================================================
-- LEADS PIPELINE (Plan 5) — columns for the AURA diagnostic forward.
-- The leads table (20260707000001 §10) already has source/name/email/phone/
-- venue_name/city/payload/status. This adds what the webhook needs:
--   score            — diagnostic score (0 is valid; typeof-number checks)
--   answers          — full per-question detail for the inbox expando
--   idempotency_key  — browser back + resubmit = one row, enforced by DB
-- RLS stance unchanged: leads is a server-only table (no anon/authenticated
-- grants, no policies) — writes come from the service role via /api/leads,
-- reads go through the aro_admin-gated API only.
-- ============================================================================

ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS score INTEGER,
    ADD COLUMN IF NOT EXISTS answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_leads_idempotency_key
    ON leads (idempotency_key)
    WHERE idempotency_key IS NOT NULL;
