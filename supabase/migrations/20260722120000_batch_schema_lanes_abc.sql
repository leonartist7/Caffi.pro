-- ============================================================================
-- BATCH SCHEMA — LANES A / B / C (one coherent migration)
--
--   Lane A · loyalty & member growth
--            loyalty_programs, member_offers, survey_responses,
--            push_subscriptions, members.birthday_month/_day,
--            members.referred_by_member_id, guarded drop of members.birthday
--   Lane B · commerce & kitchen ops
--            orders.tip_cents/accepted_at/ready_at, inventory_items,
--            inventory_movements (append-only), menu_item_ingredients
--   Lane C · team & platform
--            staff_shifts (one open shift per membership), tip_allocations
--   Shared · messages.channel widened to allow 'push' (needed by PLAN-18;
--            done here so a second migration never touches the same CHECK)
--
-- HOUSE RULES APPLIED (MASTER-PLAN-aro.md §4, §7)
--   · Fresh tables use `venue_id`, never `tenant_id` (§4.2).
--   · Every new table carries a REAL venue_id column so every policy is a
--     direct `venue_id IN (SELECT private.aro_my_venue_ids())` — tenant
--     isolation is never inferred through a parent join (§4.1).
--   · The RLS helpers live in schema `private` since
--     20260714075459_ordering_core_advisor_cleanup.sql. Policies below call
--     private.aro_my_venue_ids() / private.aro_my_managed_venue_ids() /
--     private.aro_is_aro_admin() — NOT the original public.* names.
--   · RLS ON for all nine new tables. Read = venue members or aro_admin.
--     Write = owner/manager only. NO anon grant anywhere in this batch
--     (public code-lookup is PLAN-12 work, deliberately not done here).
--   · push_subscriptions and tip_allocations get RLS + ZERO client grants and
--     ZERO policies — service_role only (bearer capability / payroll data).
--   · Append-only money and history: inventory_movements mirrors the
--     points_ledger `forbid_ledger_mutation()` trigger; member_offers is
--     immutable after issue except the redemption triple.
--   · Idempotency at the DB level, modelled on uq_points_ledger_order_award.
--   · Destructive steps (dropping members.birthday, rewriting the orders
--     total CHECK) are gated by DO-block assertions that RAISE rather than
--     silently discard real production data (§7).
--
-- ADDITIVE GUARDS BEYOND THE BATCH SPEC (deliberate, all non-restrictive on
-- any legitimate row — called out so a reviewer can see them at a glance):
--   · `>= 0` CHECKs on every new *_cents / quantity column, matching the
--     house convention on price_cents / fee_cents / tax_cents.
--   · staff_shifts.ended_at >= started_at, tip_allocations.period_end >=
--     period_start, member_offers.code length bound ("short" made explicit).
--   · COMPOSITE (venue_id, <parent pk>) foreign keys wherever both columns
--     are NOT NULL, backed by new (venue_id, pk) unique indexes on the parent
--     tables. A denormalised venue_id that can disagree with its parent's
--     venue_id is a cross-tenant integrity hole: without these, a manager of
--     venue A could insert member_offers(venue_id = A, member_id = <a member
--     of venue B>) and pass every policy. These FKs make that impossible in
--     the database rather than only in app code. They cannot fail on existing
--     data (the unique indexes are over a PK).
--
-- Re-runnable: every statement is IF EXISTS / IF NOT EXISTS guarded, every
-- policy is dropped before creation, and every assertion is written so a
-- second run on an already-migrated database is a no-op rather than a raise.
-- ============================================================================

SET search_path = public, extensions;

-- --------------------------------------------------------------------------
-- 0 · Preconditions — confirm the nine tables are genuinely net-new
--
-- 20260707000002_aro_rls.sql §10 names `inventory_items`, `staff_shifts`,
-- `menu_item_ingredients` (and `inventory_transactions`) as LEGACY,
-- tenant_id-shaped operational tables and grants them conditionally. None of
-- them exist on aro-platform, but if a legacy variant ever did appear this
-- batch must refuse rather than create a second, venue_id-shaped table
-- alongside it and fork the data.
-- --------------------------------------------------------------------------
DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'loyalty_programs', 'member_offers', 'survey_responses',
        'push_subscriptions', 'inventory_items', 'inventory_movements',
        'menu_item_ingredients', 'staff_shifts', 'tip_allocations'
    ] LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = t AND column_name = 'tenant_id'
        ) THEN
            RAISE EXCEPTION 'REFUSING TO PROCEED: public.% already exists with a legacy tenant_id column. This batch assumes venue_id-scoped net-new tables (MASTER-PLAN §4.2). Reconcile the legacy table by hand before re-running.', t;
        END IF;
    END LOOP;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory_transactions') THEN
        RAISE EXCEPTION 'REFUSING TO PROCEED: legacy public.inventory_transactions exists — creating inventory_movements would fork stock history across two tables. Migrate or drop it first.';
    END IF;
END $$;

-- --------------------------------------------------------------------------
-- 1 · Tenant-coherence unique indexes on EXISTING parents
--
-- These exist only so the composite (venue_id, parent_pk) foreign keys below
-- have something to point at. Each is unique by construction (it extends a
-- primary key), so it cannot fail on live data. `members` keeps its legacy
-- `tenant_id` column name (§4.2) — that is the venue column here.
-- --------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_members_venue_member
    ON members(tenant_id, member_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_menu_items_venue_item
    ON menu_items(venue_id, item_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_venue_order
    ON orders(venue_id, order_id);

-- ==========================================================================
-- LANE A · LOYALTY & MEMBER GROWTH
-- ==========================================================================

-- --------------------------------------------------------------------------
-- A1 · loyalty_programs — one row per configured program per venue.
--      `config` stays JSONB: every program type has a different shape and
--      the loyalty engine reads it server-side.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS loyalty_programs (
    program_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'accrual', 'bounce_back', 'birthday', 'anniversary',
        'appreciation', 'winback', 'mystery', 'survey', 'referral'
    )),
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'paused', 'archived')),
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (venue_id, type, name)
);

CREATE INDEX IF NOT EXISTS idx_loyalty_programs_venue_status
    ON loyalty_programs(venue_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_loyalty_programs_venue_program
    ON loyalty_programs(venue_id, program_id);

-- --------------------------------------------------------------------------
-- A2 · member_offers — an issued, redeemable offer. Immutable after issue
--      except the redemption triple (redeemed_at, redeemed_by_membership_id,
--      status); redeemed_at is write-once.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS member_offers (
    offer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    member_id UUID NOT NULL,
    program_id UUID NOT NULL,
    -- short, human-readable, spoken-at-the-counter code; unique per venue
    code TEXT NOT NULL CHECK (char_length(code) BETWEEN 4 AND 24),
    value_cents INTEGER CHECK (value_cents IS NULL OR value_cents >= 0),
    points_value INTEGER CHECK (points_value IS NULL OR points_value >= 0),
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    redeemed_at TIMESTAMPTZ,
    redeemed_by_membership_id UUID REFERENCES memberships(membership_id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'issued'
        CHECK (status IN ('issued', 'redeemed', 'expired', 'void')),
    UNIQUE (venue_id, code),
    -- Tenant coherence: the member and the program must belong to the same
    -- venue as the offer. Enforced in the database, not just in app code.
    CONSTRAINT member_offers_venue_member_fk
        FOREIGN KEY (venue_id, member_id)
        REFERENCES members(tenant_id, member_id) ON DELETE CASCADE,
    CONSTRAINT member_offers_venue_program_fk
        FOREIGN KEY (venue_id, program_id)
        REFERENCES loyalty_programs(venue_id, program_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_member_offers_venue_status
    ON member_offers(venue_id, status);
CREATE INDEX IF NOT EXISTS idx_member_offers_member_issued
    ON member_offers(member_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_member_offers_program
    ON member_offers(program_id);
CREATE INDEX IF NOT EXISTS idx_member_offers_expires_at
    ON member_offers(expires_at) WHERE redeemed_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_member_offers_venue_offer
    ON member_offers(venue_id, offer_id);

-- Redemption idempotency, modelled on uq_points_ledger_order_award
-- (20260714100000: ON points_ledger(order_id) WHERE order_id IS NOT NULL AND
-- reason = 'order'). Two guarantees, stated separately because they are not
-- equally load-bearing:
--
--   (a) The partial unique index below declares "at most one redemption per
--       offer" in the catalogue, where \d and the advisors can see it. It is
--       structurally satisfied by the primary key, so it is documentation
--       plus a tripwire against a future composite-key refactor, not the
--       operative guard.
--   (b) The OPERATIVE write-once guarantee is the trigger clause: an UPDATE
--       may take redeemed_at from NULL to a value, never from a value to
--       anything else. Two concurrent redemptions of the same offer serialise
--       on that row's lock, so the loser sees the committed redeemed_at and
--       raises instead of double-redeeming. A caller treats that raise the
--       way the house pattern treats 23505 — already done, not an error.
CREATE UNIQUE INDEX IF NOT EXISTS uq_member_offers_redeemed_once
    ON member_offers(offer_id) WHERE redeemed_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.forbid_member_offer_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF NEW.offer_id     IS DISTINCT FROM OLD.offer_id
       OR NEW.venue_id    IS DISTINCT FROM OLD.venue_id
       OR NEW.member_id   IS DISTINCT FROM OLD.member_id
       OR NEW.program_id  IS DISTINCT FROM OLD.program_id
       OR NEW.code        IS DISTINCT FROM OLD.code
       OR NEW.value_cents IS DISTINCT FROM OLD.value_cents
       OR NEW.points_value IS DISTINCT FROM OLD.points_value
       OR NEW.issued_at   IS DISTINCT FROM OLD.issued_at
       OR NEW.expires_at  IS DISTINCT FROM OLD.expires_at
    THEN
        RAISE EXCEPTION 'member_offers is immutable after issue: only redeemed_at, redeemed_by_membership_id and status may change (offer %)', OLD.offer_id;
    END IF;

    IF OLD.redeemed_at IS NOT NULL AND NEW.redeemed_at IS DISTINCT FROM OLD.redeemed_at THEN
        RAISE EXCEPTION 'member_offers.redeemed_at is write-once: offer % was already redeemed at %', OLD.offer_id, OLD.redeemed_at;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS member_offers_update_only ON member_offers;
CREATE TRIGGER member_offers_update_only
    BEFORE UPDATE ON member_offers
    FOR EACH ROW EXECUTE FUNCTION public.forbid_member_offer_mutation();

-- DELETE is deliberately not granted to any client role: an offer that should
-- not have been issued is set to status 'void', never removed.

-- --------------------------------------------------------------------------
-- A3 · survey_responses — one response per member per survey program.
--      member_id is nullable so anonymous responses are possible; the
--      partial unique index only constrains identified ones.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS survey_responses (
    response_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(member_id) ON DELETE SET NULL,
    program_id UUID NOT NULL,
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    offer_id UUID REFERENCES member_offers(offer_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT survey_responses_venue_program_fk
        FOREIGN KEY (venue_id, program_id)
        REFERENCES loyalty_programs(venue_id, program_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_survey_responses_program_member
    ON survey_responses(program_id, member_id) WHERE member_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_survey_responses_venue_created
    ON survey_responses(venue_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_survey_responses_offer
    ON survey_responses(offer_id);

-- --------------------------------------------------------------------------
-- A4 · push_subscriptions — Web Push endpoint + keys. The endpoint is a
--      BEARER CAPABILITY: whoever holds it can push to that device. RLS on,
--      zero client grants, zero policies — service_role only, same stance as
--      reservations/waitlist PII (20260716160000 §3).
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS push_subscriptions (
    subscription_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    member_id UUID NOT NULL,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT,
    auth TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    CONSTRAINT push_subscriptions_venue_member_fk
        FOREIGN KEY (venue_id, member_id)
        REFERENCES members(tenant_id, member_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_venue_member
    ON push_subscriptions(venue_id, member_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_member
    ON push_subscriptions(member_id);

-- --------------------------------------------------------------------------
-- A5 · members — split birthday into month/day, add the referral edge.
--      No cross-field calendar-validity constraint by design (Feb 30 is
--      rejected in app code; the database only bounds each field).
-- --------------------------------------------------------------------------
ALTER TABLE members
    ADD COLUMN IF NOT EXISTS birthday_month SMALLINT
        CHECK (birthday_month IS NULL OR birthday_month BETWEEN 1 AND 12),
    ADD COLUMN IF NOT EXISTS birthday_day SMALLINT
        CHECK (birthday_day IS NULL OR birthday_day BETWEEN 1 AND 31),
    ADD COLUMN IF NOT EXISTS referred_by_member_id UUID
        REFERENCES members(member_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_members_referred_by
    ON members(referred_by_member_id) WHERE referred_by_member_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_members_birthday
    ON members(tenant_id, birthday_month, birthday_day)
    WHERE birthday_month IS NOT NULL;

-- --------------------------------------------------------------------------
-- A6 · members.birthday — GUARDED DROP.
--
-- This runs against a live database with real member data. The column is only
-- dropped if it is provably empty; otherwise the migration aborts with a
-- message telling the operator exactly what to do. Real dates are never
-- silently discarded, and the birthday_month/_day split is not backfilled
-- here by guesswork.
-- --------------------------------------------------------------------------
DO $$
DECLARE v_count BIGINT;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'members' AND column_name = 'birthday'
    ) THEN
        RAISE NOTICE 'members.birthday already dropped — nothing to do.';
        RETURN;
    END IF;

    EXECUTE 'SELECT count(*) FROM public.members WHERE birthday IS NOT NULL' INTO v_count;

    IF v_count <> 0 THEN
        RAISE EXCEPTION 'REFUSING TO DROP members.birthday: % row(s) still hold a non-null birthday. Backfill members.birthday_month/birthday_day from those rows, verify the result, then re-run this migration. No date is discarded by this migration.', v_count;
    END IF;

    EXECUTE 'ALTER TABLE public.members DROP COLUMN birthday';
    RAISE NOTICE 'members.birthday dropped (0 non-null rows asserted).';
END $$;

-- ==========================================================================
-- LANE B · COMMERCE & KITCHEN OPS
-- ==========================================================================

-- --------------------------------------------------------------------------
-- B1 · orders — tips and kitchen timestamps.
--
-- The existing total CHECK (20260714062310) is
--   total_cents = subtotal_cents + delivery_fee_cents + tax_cents
-- and must become
--   total_cents = subtotal_cents + delivery_fee_cents + tax_cents + tip_cents
--
-- tip_cents defaults to 0, so every existing row should already satisfy the
-- new formula — but "should" is not "does", so it is asserted explicitly
-- BEFORE the constraint is swapped. If any row disagreed, ADD CONSTRAINT
-- would fail anyway; the assertion turns that into a message that names the
-- number of offending rows instead of a bare constraint violation.
-- --------------------------------------------------------------------------
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS tip_cents INTEGER NOT NULL DEFAULT 0 CHECK (tip_cents >= 0),
    ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ;

DO $$
DECLARE v_bad BIGINT;
BEGIN
    SELECT count(*) INTO v_bad
    FROM public.orders
    WHERE total_cents IS DISTINCT FROM
          (subtotal_cents + delivery_fee_cents + tax_cents + COALESCE(tip_cents, 0));

    IF v_bad <> 0 THEN
        RAISE EXCEPTION 'REFUSING TO REWRITE the orders total CHECK: % existing order row(s) do not satisfy total_cents = subtotal_cents + delivery_fee_cents + tax_cents + tip_cents. Reconcile those orders first — do not relax the constraint.', v_bad;
    END IF;
END $$;

-- Drop the old total CHECK by shape rather than by assumed name (it was
-- created inline, so its name is generated), then re-add it named.
--
-- The constraint is located by the SET OF COLUMNS it references, never by
-- string-matching its definition: `subtotal_cents` CONTAINS the substring
-- `total_cents`, so a LIKE '%total_cents%' filter would also match — and
-- silently drop — the unrelated `CHECK (subtotal_cents >= 0)`. Matching on
-- pg_constraint.conkey cannot make that mistake.
DO $$
DECLARE v_con TEXT;
BEGIN
    FOR v_con IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public' AND t.relname = 'orders' AND c.contype = 'c'
          AND (
              SELECT array_agg(a.attname::text)
              FROM unnest(c.conkey) AS k
              JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k
          ) @> ARRAY['total_cents', 'subtotal_cents']
    LOOP
        EXECUTE format('ALTER TABLE public.orders DROP CONSTRAINT %I', v_con);
    END LOOP;
END $$;

ALTER TABLE orders
    ADD CONSTRAINT orders_total_cents_sum_check CHECK (
        total_cents >= 0
        AND total_cents = subtotal_cents + delivery_fee_cents + tax_cents + tip_cents
    );

-- --------------------------------------------------------------------------
-- B2 · inventory_items — the stock catalogue.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_items (
    item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    unit TEXT NOT NULL CHECK (unit IN ('g', 'kg', 'ml', 'l', 'each')),
    cost_per_unit_cents INTEGER CHECK (cost_per_unit_cents IS NULL OR cost_per_unit_cents >= 0),
    par_level NUMERIC CHECK (par_level IS NULL OR par_level >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (venue_id, name)
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_venue_active
    ON inventory_items(venue_id, is_active);
CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_items_venue_item
    ON inventory_items(venue_id, item_id);

-- --------------------------------------------------------------------------
-- B3 · inventory_movements — APPEND-ONLY signed stock movements. On-hand is
--      derived (SUM(qty) per item), never stored: §4.3 "derive, don't store".
--      Trigger mirrors forbid_ledger_mutation() on points_ledger.
--
--      order_id / item_id use ON DELETE RESTRICT, matching payments.order_id
--      and redemptions.reward_id: an append-only history cannot be rewritten
--      by a parent delete, so the parent delete is refused instead.
--      membership_id uses ON DELETE SET NULL, matching
--      points_ledger.staff_membership_id — attribution may be forgotten, the
--      movement may not.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_movements (
    movement_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    item_id UUID NOT NULL,
    qty NUMERIC NOT NULL,                      -- signed: receive/count +, waste/sale -
    reason TEXT NOT NULL CHECK (reason IN ('receive', 'count', 'waste', 'sale', 'adjust')),
    order_id UUID,
    note TEXT,
    membership_id UUID REFERENCES memberships(membership_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT inventory_movements_venue_item_fk
        FOREIGN KEY (venue_id, item_id)
        REFERENCES inventory_items(venue_id, item_id) ON DELETE RESTRICT,
    -- order_id is nullable; a composite FK with MATCH SIMPLE (the default)
    -- skips the check when order_id IS NULL, so this both allows non-order
    -- movements and forbids pointing at another venue's order.
    CONSTRAINT inventory_movements_venue_order_fk
        FOREIGN KEY (venue_id, order_id)
        REFERENCES orders(venue_id, order_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_venue_created
    ON inventory_movements(venue_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_created
    ON inventory_movements(item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_order
    ON inventory_movements(order_id) WHERE order_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.forbid_inventory_movement_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    RAISE EXCEPTION 'inventory_movements is append-only';
END;
$$;

DROP TRIGGER IF EXISTS inventory_movements_append_only ON inventory_movements;
CREATE TRIGGER inventory_movements_append_only
    BEFORE UPDATE OR DELETE ON inventory_movements
    FOR EACH ROW EXECUTE FUNCTION public.forbid_inventory_movement_mutation();

-- --------------------------------------------------------------------------
-- B4 · menu_item_ingredients — recipe edge: how much of an inventory item a
--      menu item consumes. Both sides are venue-checked by composite FK.
--      NOTE: `item_id` is the MENU item; `inventory_item_id` is the stock
--      item (whose own PK is also called item_id).
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS menu_item_ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    item_id UUID NOT NULL,
    inventory_item_id UUID NOT NULL,
    qty_per_unit NUMERIC NOT NULL CHECK (qty_per_unit >= 0),
    UNIQUE (item_id, inventory_item_id),
    CONSTRAINT menu_item_ingredients_venue_menu_item_fk
        FOREIGN KEY (venue_id, item_id)
        REFERENCES menu_items(venue_id, item_id) ON DELETE CASCADE,
    CONSTRAINT menu_item_ingredients_venue_inventory_item_fk
        FOREIGN KEY (venue_id, inventory_item_id)
        REFERENCES inventory_items(venue_id, item_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_menu_item_ingredients_venue
    ON menu_item_ingredients(venue_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_ingredients_inventory_item
    ON menu_item_ingredients(inventory_item_id);

-- ==========================================================================
-- LANE C · TEAM & PLATFORM
-- ==========================================================================

-- --------------------------------------------------------------------------
-- C1 · staff_shifts — clock in/out. At most ONE open shift per membership,
--      enforced by a partial unique index (the uq_points_ledger_order_award
--      pattern): a second clock-in raises 23505, which the caller treats as
--      "already clocked in" rather than an error.
--
--      membership_id keeps a plain single-column FK: memberships.venue_id is
--      NULLABLE (org-wide owners), so a composite (venue_id, membership_id)
--      FK would reject legitimate org-wide staff. Venue coherence for shifts
--      is therefore an app-layer check, and is called out here so nobody
--      assumes the database enforces it.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS staff_shifts (
    shift_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    membership_id UUID NOT NULL REFERENCES memberships(membership_id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    source TEXT NOT NULL DEFAULT 'counter' CHECK (source IN ('counter', 'manual')),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT staff_shifts_ended_after_started
        CHECK (ended_at IS NULL OR ended_at >= started_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_shifts_open_per_membership
    ON staff_shifts(membership_id) WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_staff_shifts_venue_started
    ON staff_shifts(venue_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_membership_started
    ON staff_shifts(membership_id, started_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_shifts_venue_shift
    ON staff_shifts(venue_id, shift_id);

-- --------------------------------------------------------------------------
-- C2 · tip_allocations — who gets how much of the tip pool. This is PAYROLL
--      data: RLS on, zero client grants, zero policies — service_role only,
--      same stance as push_subscriptions. Owners read it through an
--      aro-gated server route, never through the Data API.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tip_allocations (
    allocation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    shift_id UUID NOT NULL,
    membership_id UUID NOT NULL REFERENCES memberships(membership_id) ON DELETE CASCADE,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    tip_cents INTEGER NOT NULL CHECK (tip_cents >= 0),
    basis TEXT NOT NULL CHECK (basis IN ('hours', 'equal', 'manual')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT tip_allocations_period_ordered CHECK (period_end >= period_start),
    CONSTRAINT tip_allocations_venue_shift_fk
        FOREIGN KEY (venue_id, shift_id)
        REFERENCES staff_shifts(venue_id, shift_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tip_allocations_venue_period
    ON tip_allocations(venue_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_tip_allocations_shift
    ON tip_allocations(shift_id);
CREATE INDEX IF NOT EXISTS idx_tip_allocations_membership
    ON tip_allocations(membership_id, period_start DESC);

-- ==========================================================================
-- SHARED · messages.channel widened to allow 'push'
--
-- PLAN-18 needs it and doing it inside this shared batch means no second
-- migration ever touches the same CHECK. The original constraint was created
-- inline (generated name), so it is located by the exact set of columns it
-- references — {channel} and nothing else — and re-added named. String
-- matching on the definition is deliberately avoided here for the same reason
-- as the orders total CHECK above.
-- ==========================================================================
DO $$
DECLARE v_con TEXT;
BEGIN
    FOR v_con IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public' AND t.relname = 'messages' AND c.contype = 'c'
          AND (
              SELECT array_agg(a.attname::text)
              FROM unnest(c.conkey) AS k
              JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k
          ) = ARRAY['channel']
    LOOP
        EXECUTE format('ALTER TABLE public.messages DROP CONSTRAINT %I', v_con);
    END LOOP;
END $$;

ALTER TABLE messages
    ADD CONSTRAINT messages_channel_check CHECK (channel IN ('sms', 'email', 'push'));

-- ==========================================================================
-- updated_at maintenance — reuse the hardened shared trigger
-- (member_offers has no updated_at: it is immutable except the redemption
-- triple, and it carries its own BEFORE UPDATE guard.)
-- ==========================================================================
DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['loyalty_programs', 'inventory_items', 'staff_shifts'] LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I_touch ON %I', t, t);
        EXECUTE format(
            'CREATE TRIGGER %I_touch BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION touch_updated_at()',
            t, t
        );
    END LOOP;
END $$;

-- ==========================================================================
-- RLS, GRANTS AND POLICIES
--
-- Uniform shape for every table that gets a client grant at all:
--   read   USING (venue_id IN (SELECT private.aro_my_venue_ids())
--                 OR private.aro_is_aro_admin())
--   write  WITH CHECK (venue_id IN (SELECT private.aro_my_managed_venue_ids()))
-- Every policy tests this table's OWN venue_id column — never a parent join.
-- NO anon grant on anything in this batch.
-- ==========================================================================

ALTER TABLE loyalty_programs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_offers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements   ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_shifts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tip_allocations       ENABLE ROW LEVEL SECURITY;

-- Start from zero for the browser roles (20260714075113 also revoked the
-- public-schema default privileges, but a fresh project may not have that
-- ALTER DEFAULT PRIVILEGES applied yet — restate it here, cheaply).
REVOKE ALL ON loyalty_programs, member_offers, survey_responses,
    push_subscriptions, inventory_items, inventory_movements,
    menu_item_ingredients, staff_shifts, tip_allocations
    FROM PUBLIC, anon, authenticated;

GRANT ALL ON loyalty_programs, member_offers, survey_responses,
    push_subscriptions, inventory_items, inventory_movements,
    menu_item_ingredients, staff_shifts, tip_allocations
    TO service_role;

-- --------------------------------------------------------------------------
-- Server-only tables: RLS on, ZERO client grants, ZERO policies.
--
-- push_subscriptions holds Web Push endpoints, which are bearer credentials.
-- tip_allocations holds payroll amounts. NEITHER table gets a GRANT or a
-- CREATE POLICY for anon or authenticated — not now, not "read-only for the
-- owner". They are reachable only via the service role from server routes
-- that have already run requireVenueRole / requireAroAdmin. With RLS enabled
-- and no policy, anon AND every authenticated session are denied, which is
-- what scripts/verify-live.mjs proves for both roles.
-- --------------------------------------------------------------------------

-- --------------------------------------------------------------------------
-- loyalty_programs — venue members read; owner/manager write.
-- --------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON loyalty_programs TO authenticated;

DROP POLICY IF EXISTS loyalty_programs_venue_read ON loyalty_programs;
CREATE POLICY loyalty_programs_venue_read ON loyalty_programs
    FOR SELECT TO authenticated
    USING (venue_id IN (SELECT private.aro_my_venue_ids()) OR private.aro_is_aro_admin());

DROP POLICY IF EXISTS loyalty_programs_manage_insert ON loyalty_programs;
CREATE POLICY loyalty_programs_manage_insert ON loyalty_programs
    FOR INSERT TO authenticated
    WITH CHECK (venue_id IN (SELECT private.aro_my_managed_venue_ids()));

DROP POLICY IF EXISTS loyalty_programs_manage_update ON loyalty_programs;
CREATE POLICY loyalty_programs_manage_update ON loyalty_programs
    FOR UPDATE TO authenticated
    USING (venue_id IN (SELECT private.aro_my_managed_venue_ids()))
    WITH CHECK (venue_id IN (SELECT private.aro_my_managed_venue_ids()));

DROP POLICY IF EXISTS loyalty_programs_manage_delete ON loyalty_programs;
CREATE POLICY loyalty_programs_manage_delete ON loyalty_programs
    FOR DELETE TO authenticated
    USING (venue_id IN (SELECT private.aro_my_managed_venue_ids()));

-- --------------------------------------------------------------------------
-- member_offers — venue members read; owner/manager insert/update. No DELETE
-- grant and no DELETE policy: an offer is voided, never removed. Counter
-- redemption runs server-side (service role) so staff need no write grant.
-- --------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE ON member_offers TO authenticated;

DROP POLICY IF EXISTS member_offers_venue_read ON member_offers;
CREATE POLICY member_offers_venue_read ON member_offers
    FOR SELECT TO authenticated
    USING (venue_id IN (SELECT private.aro_my_venue_ids()) OR private.aro_is_aro_admin());

DROP POLICY IF EXISTS member_offers_manage_insert ON member_offers;
CREATE POLICY member_offers_manage_insert ON member_offers
    FOR INSERT TO authenticated
    WITH CHECK (venue_id IN (SELECT private.aro_my_managed_venue_ids()));

DROP POLICY IF EXISTS member_offers_manage_update ON member_offers;
CREATE POLICY member_offers_manage_update ON member_offers
    FOR UPDATE TO authenticated
    USING (venue_id IN (SELECT private.aro_my_managed_venue_ids()))
    WITH CHECK (venue_id IN (SELECT private.aro_my_managed_venue_ids()));

-- --------------------------------------------------------------------------
-- survey_responses — venue members read. Writes are server-only: responses
-- arrive from diner surfaces through a server route, so no client INSERT
-- grant/policy exists (nothing to grant means nothing to get wrong).
-- --------------------------------------------------------------------------
GRANT SELECT ON survey_responses TO authenticated;

DROP POLICY IF EXISTS survey_responses_venue_read ON survey_responses;
CREATE POLICY survey_responses_venue_read ON survey_responses
    FOR SELECT TO authenticated
    USING (venue_id IN (SELECT private.aro_my_venue_ids()) OR private.aro_is_aro_admin());

-- --------------------------------------------------------------------------
-- inventory_items — venue members read; owner/manager write.
-- --------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON inventory_items TO authenticated;

DROP POLICY IF EXISTS inventory_items_venue_read ON inventory_items;
CREATE POLICY inventory_items_venue_read ON inventory_items
    FOR SELECT TO authenticated
    USING (venue_id IN (SELECT private.aro_my_venue_ids()) OR private.aro_is_aro_admin());

DROP POLICY IF EXISTS inventory_items_manage_insert ON inventory_items;
CREATE POLICY inventory_items_manage_insert ON inventory_items
    FOR INSERT TO authenticated
    WITH CHECK (venue_id IN (SELECT private.aro_my_managed_venue_ids()));

DROP POLICY IF EXISTS inventory_items_manage_update ON inventory_items;
CREATE POLICY inventory_items_manage_update ON inventory_items
    FOR UPDATE TO authenticated
    USING (venue_id IN (SELECT private.aro_my_managed_venue_ids()))
    WITH CHECK (venue_id IN (SELECT private.aro_my_managed_venue_ids()));

DROP POLICY IF EXISTS inventory_items_manage_delete ON inventory_items;
CREATE POLICY inventory_items_manage_delete ON inventory_items
    FOR DELETE TO authenticated
    USING (venue_id IN (SELECT private.aro_my_managed_venue_ids()));

-- --------------------------------------------------------------------------
-- inventory_movements — append-only: venue members read, owner/manager
-- insert. No UPDATE/DELETE grant, no UPDATE/DELETE policy, and the trigger
-- raises anyway (same triple belt as points_ledger).
-- --------------------------------------------------------------------------
GRANT SELECT, INSERT ON inventory_movements TO authenticated;

DROP POLICY IF EXISTS inventory_movements_venue_read ON inventory_movements;
CREATE POLICY inventory_movements_venue_read ON inventory_movements
    FOR SELECT TO authenticated
    USING (venue_id IN (SELECT private.aro_my_venue_ids()) OR private.aro_is_aro_admin());

DROP POLICY IF EXISTS inventory_movements_manage_insert ON inventory_movements;
CREATE POLICY inventory_movements_manage_insert ON inventory_movements
    FOR INSERT TO authenticated
    WITH CHECK (venue_id IN (SELECT private.aro_my_managed_venue_ids()));

-- --------------------------------------------------------------------------
-- menu_item_ingredients — venue members read; owner/manager write.
-- --------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON menu_item_ingredients TO authenticated;

DROP POLICY IF EXISTS menu_item_ingredients_venue_read ON menu_item_ingredients;
CREATE POLICY menu_item_ingredients_venue_read ON menu_item_ingredients
    FOR SELECT TO authenticated
    USING (venue_id IN (SELECT private.aro_my_venue_ids()) OR private.aro_is_aro_admin());

DROP POLICY IF EXISTS menu_item_ingredients_manage_insert ON menu_item_ingredients;
CREATE POLICY menu_item_ingredients_manage_insert ON menu_item_ingredients
    FOR INSERT TO authenticated
    WITH CHECK (venue_id IN (SELECT private.aro_my_managed_venue_ids()));

DROP POLICY IF EXISTS menu_item_ingredients_manage_update ON menu_item_ingredients;
CREATE POLICY menu_item_ingredients_manage_update ON menu_item_ingredients
    FOR UPDATE TO authenticated
    USING (venue_id IN (SELECT private.aro_my_managed_venue_ids()))
    WITH CHECK (venue_id IN (SELECT private.aro_my_managed_venue_ids()));

DROP POLICY IF EXISTS menu_item_ingredients_manage_delete ON menu_item_ingredients;
CREATE POLICY menu_item_ingredients_manage_delete ON menu_item_ingredients
    FOR DELETE TO authenticated
    USING (venue_id IN (SELECT private.aro_my_managed_venue_ids()));

-- --------------------------------------------------------------------------
-- staff_shifts — venue members read (a shift board is not a secret from the
-- team); owner/manager write. Counter clock-in/out runs server-side.
-- --------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON staff_shifts TO authenticated;

DROP POLICY IF EXISTS staff_shifts_venue_read ON staff_shifts;
CREATE POLICY staff_shifts_venue_read ON staff_shifts
    FOR SELECT TO authenticated
    USING (venue_id IN (SELECT private.aro_my_venue_ids()) OR private.aro_is_aro_admin());

DROP POLICY IF EXISTS staff_shifts_manage_insert ON staff_shifts;
CREATE POLICY staff_shifts_manage_insert ON staff_shifts
    FOR INSERT TO authenticated
    WITH CHECK (venue_id IN (SELECT private.aro_my_managed_venue_ids()));

DROP POLICY IF EXISTS staff_shifts_manage_update ON staff_shifts;
CREATE POLICY staff_shifts_manage_update ON staff_shifts
    FOR UPDATE TO authenticated
    USING (venue_id IN (SELECT private.aro_my_managed_venue_ids()))
    WITH CHECK (venue_id IN (SELECT private.aro_my_managed_venue_ids()));

DROP POLICY IF EXISTS staff_shifts_manage_delete ON staff_shifts;
CREATE POLICY staff_shifts_manage_delete ON staff_shifts
    FOR DELETE TO authenticated
    USING (venue_id IN (SELECT private.aro_my_managed_venue_ids()));

-- --------------------------------------------------------------------------
-- members — preserve the pre-existing capability exactly. The old column
-- grant list (20260707000002 §3) included `birthday`; dropping the column
-- dropped that grant with it, so the replacement pair is granted here.
-- referred_by_member_id is deliberately NOT granted: the referral graph is a
-- server-only projection, and exposing it invites member-id enumeration.
-- --------------------------------------------------------------------------
GRANT SELECT (birthday_month, birthday_day) ON members TO authenticated;
