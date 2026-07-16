-- ============================================================================
-- RESERVATIONS CORE — config, table capacity, bookings, waitlist, atomic RPCs
--
-- Fresh tables use `venue_id` (never `tenant_id`). Guest PII tables are
-- service-role only — no anon/authenticated grants or policies.
-- ============================================================================

SET search_path = public, extensions;

-- --------------------------------------------------------------------------
-- 1 · Extend existing tables
-- --------------------------------------------------------------------------
ALTER TABLE venues ADD COLUMN IF NOT EXISTS reservation_config JSONB NOT NULL DEFAULT
  '{"slot_minutes":30,"min_party":1,"max_party":8,"max_advance_days":30,
    "buffer_minutes":15,"default_duration_minutes":90,"hours":null}'::jsonb;

ALTER TABLE venue_tables ADD COLUMN IF NOT EXISTS capacity INTEGER NOT NULL DEFAULT 2
  CHECK (capacity > 0);

-- Re-assert public column grant WITHOUT capacity (staff-only field).
REVOKE ALL ON venue_tables FROM PUBLIC, anon, authenticated;
GRANT ALL ON venue_tables TO service_role;
GRANT SELECT (table_id, venue_id, label, qr_token, is_active)
    ON venue_tables TO anon, authenticated;

-- --------------------------------------------------------------------------
-- 2 · New tables
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reservations (
    reservation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(member_id) ON DELETE SET NULL,
    table_id UUID REFERENCES venue_tables(table_id) ON DELETE SET NULL,
    client_uuid UUID NOT NULL,
    guest_name TEXT NOT NULL,
    guest_phone TEXT NOT NULL,
    guest_email TEXT,
    party_size INTEGER NOT NULL CHECK (party_size > 0),
    status TEXT NOT NULL DEFAULT 'confirmed'
        CHECK (status IN ('confirmed', 'seated', 'completed', 'no_show', 'canceled')),
    starts_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    notes TEXT,
    source TEXT NOT NULL DEFAULT 'guest' CHECK (source IN ('guest', 'staff')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (venue_id, client_uuid)
);

CREATE TABLE IF NOT EXISTS waitlist_entries (
    waitlist_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(member_id) ON DELETE SET NULL,
    client_uuid UUID NOT NULL,
    guest_name TEXT NOT NULL,
    guest_phone TEXT NOT NULL,
    party_size INTEGER NOT NULL CHECK (party_size > 0),
    status TEXT NOT NULL DEFAULT 'waiting'
        CHECK (status IN ('waiting', 'notified', 'seated', 'canceled', 'expired')),
    notes TEXT,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (venue_id, client_uuid)
);

CREATE INDEX IF NOT EXISTS idx_reservations_venue_starts_at
    ON reservations(venue_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_reservations_venue_status_starts_at
    ON reservations(venue_id, status, starts_at);
CREATE INDEX IF NOT EXISTS idx_reservations_table
    ON reservations(table_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_entries_venue_status_joined
    ON waitlist_entries(venue_id, status, joined_at);

DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['reservations', 'waitlist_entries'] LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS %I_touch ON %I',
            t, t
        );
        EXECUTE format(
            'CREATE TRIGGER %I_touch BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION touch_updated_at()',
            t, t
        );
    END LOOP;
END;
$$;

-- --------------------------------------------------------------------------
-- 3 · RLS and grants (PII — service-role only)
-- --------------------------------------------------------------------------
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON reservations, waitlist_entries FROM PUBLIC, anon, authenticated;
GRANT ALL ON reservations, waitlist_entries TO service_role;

-- No anon/authenticated policies or grants for reservations / waitlist_entries.

-- --------------------------------------------------------------------------
-- 4 · Atomic helpers and mutations (SECURITY DEFINER, service_role only)
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.find_available_table(
    p_venue_id UUID,
    p_party_size INT,
    p_starts_at TIMESTAMPTZ,
    p_duration_minutes INT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_buffer INT;
    v_new_end TIMESTAMPTZ;
    v_table RECORD;
    v_conflict BOOLEAN;
BEGIN
    SELECT COALESCE((reservation_config->>'buffer_minutes')::INT, 15)
    INTO v_buffer
    FROM public.venues
    WHERE venue_id = p_venue_id;

    IF v_buffer IS NULL THEN
        RETURN NULL;
    END IF;

    v_new_end := p_starts_at + make_interval(mins => p_duration_minutes);

    FOR v_table IN
        SELECT table_id
        FROM public.venue_tables
        WHERE venue_id = p_venue_id
          AND is_active = true
          AND capacity >= p_party_size
        ORDER BY capacity ASC, label ASC
        FOR UPDATE
    LOOP
        SELECT EXISTS (
            SELECT 1
            FROM public.reservations r
            WHERE r.table_id = v_table.table_id
              AND r.status IN ('confirmed', 'seated')
              AND r.starts_at < (v_new_end + make_interval(mins => v_buffer))
              AND (r.starts_at + make_interval(mins => r.duration_minutes))
                  > (p_starts_at - make_interval(mins => v_buffer))
        ) INTO v_conflict;

        IF NOT v_conflict THEN
            RETURN v_table.table_id;
        END IF;
    END LOOP;

    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_reservation(
    p_venue_id UUID,
    p_client_uuid UUID,
    p_guest_name TEXT,
    p_guest_phone TEXT,
    p_guest_email TEXT,
    p_party_size INT,
    p_starts_at TIMESTAMPTZ,
    p_notes TEXT,
    p_member_id UUID,
    p_source TEXT
)
RETURNS public.reservations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_existing public.reservations%ROWTYPE;
    v_config JSONB;
    v_timezone TEXT;
    v_min_party INT;
    v_max_party INT;
    v_max_advance INT;
    v_duration INT;
    v_hours JSONB;
    v_day JSONB;
    v_local TIMESTAMP;
    v_day_key TEXT;
    v_open TIME;
    v_close TIME;
    v_table_id UUID;
    v_row public.reservations%ROWTYPE;
    v_source TEXT;
BEGIN
    -- Idempotent replay: return existing row, do not emit a second event.
    SELECT * INTO v_existing
    FROM public.reservations
    WHERE venue_id = p_venue_id AND client_uuid = p_client_uuid;
    IF FOUND THEN
        RETURN v_existing;
    END IF;

    SELECT reservation_config, COALESCE(timezone, 'UTC')
    INTO v_config, v_timezone
    FROM public.venues
    WHERE venue_id = p_venue_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'VENUE_NOT_FOUND';
    END IF;

    v_min_party := COALESCE((v_config->>'min_party')::INT, 1);
    v_max_party := COALESCE((v_config->>'max_party')::INT, 8);
    v_max_advance := COALESCE((v_config->>'max_advance_days')::INT, 30);
    v_duration := COALESCE((v_config->>'default_duration_minutes')::INT, 90);
    v_hours := v_config->'hours';

    IF p_party_size IS NULL OR p_party_size < v_min_party OR p_party_size > v_max_party THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_PARTY_SIZE';
    END IF;

    IF NULLIF(BTRIM(COALESCE(p_guest_name, '')), '') IS NULL THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'GUEST_NAME_REQUIRED';
    END IF;
    IF NULLIF(BTRIM(COALESCE(p_guest_phone, '')), '') IS NULL THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'GUEST_PHONE_REQUIRED';
    END IF;

    IF p_starts_at IS NULL OR p_starts_at <= NOW() THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'STARTS_AT_IN_PAST';
    END IF;
    IF p_starts_at > NOW() + make_interval(days => v_max_advance) THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'STARTS_AT_TOO_FAR';
    END IF;

    -- Hours gating: null hours or closed day ⇒ same catchable class as no availability.
    IF v_hours IS NULL OR v_hours = 'null'::jsonb THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'NO_AVAILABILITY';
    END IF;

    v_local := p_starts_at AT TIME ZONE v_timezone;
    v_day_key := (ARRAY['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'])[
        (EXTRACT(DOW FROM v_local)::INT + 1)
    ];
    v_day := v_hours->v_day_key;
    IF v_day IS NULL OR v_day = 'null'::jsonb OR jsonb_typeof(v_day) <> 'array'
       OR jsonb_array_length(v_day) < 2 THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'NO_AVAILABILITY';
    END IF;

    BEGIN
        v_open := (v_day->>0)::TIME;
        v_close := (v_day->>1)::TIME;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'NO_AVAILABILITY';
    END;

    IF v_local::TIME < v_open OR v_local::TIME >= v_close THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'NO_AVAILABILITY';
    END IF;

    v_source := CASE WHEN p_source IN ('guest', 'staff') THEN p_source ELSE 'guest' END;

    v_table_id := public.find_available_table(
        p_venue_id, p_party_size, p_starts_at, v_duration
    );
    IF v_table_id IS NULL THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'NO_AVAILABILITY';
    END IF;

    BEGIN
        INSERT INTO public.reservations (
            venue_id, member_id, table_id, client_uuid,
            guest_name, guest_phone, guest_email, party_size,
            status, starts_at, duration_minutes, notes, source
        ) VALUES (
            p_venue_id, p_member_id, v_table_id, p_client_uuid,
            BTRIM(p_guest_name), BTRIM(p_guest_phone),
            NULLIF(BTRIM(COALESCE(p_guest_email, '')), ''),
            p_party_size, 'confirmed', p_starts_at, v_duration,
            NULLIF(BTRIM(COALESCE(p_notes, '')), ''), v_source
        )
        RETURNING * INTO v_row;
    EXCEPTION WHEN unique_violation THEN
        SELECT * INTO v_row
        FROM public.reservations
        WHERE venue_id = p_venue_id AND client_uuid = p_client_uuid;
        RETURN v_row;
    END;

    INSERT INTO public.events (actor, venue_id, type, payload) VALUES (
        CASE WHEN p_member_id IS NULL THEN 'guest' ELSE 'member:' || p_member_id::TEXT END,
        p_venue_id,
        'reservation.created',
        jsonb_build_object(
            'reservation_id', v_row.reservation_id,
            'party_size', v_row.party_size,
            'starts_at', v_row.starts_at,
            'table_id', v_row.table_id
        )
    );

    RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_reservation_status(
    p_reservation_id UUID,
    p_new_status TEXT
)
RETURNS public.reservations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_row public.reservations%ROWTYPE;
    v_from TEXT;
BEGIN
    SELECT * INTO v_row
    FROM public.reservations
    WHERE reservation_id = p_reservation_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'RESERVATION_NOT_FOUND';
    END IF;

    v_from := v_row.status;
    IF v_from = p_new_status THEN
        RETURN v_row;
    END IF;

    IF NOT (
        (v_from = 'confirmed' AND p_new_status IN ('seated', 'canceled', 'no_show'))
        OR (v_from = 'seated' AND p_new_status IN ('completed', 'canceled'))
    ) THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ILLEGAL_RESERVATION_TRANSITION';
    END IF;

    UPDATE public.reservations
    SET status = p_new_status, updated_at = NOW()
    WHERE reservation_id = p_reservation_id
    RETURNING * INTO v_row;

    RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.find_available_table(UUID, INT, TIMESTAMPTZ, INT)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_available_table(UUID, INT, TIMESTAMPTZ, INT)
    TO service_role;

REVOKE ALL ON FUNCTION public.create_reservation(
    UUID, UUID, TEXT, TEXT, TEXT, INT, TIMESTAMPTZ, TEXT, UUID, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_reservation(
    UUID, UUID, TEXT, TEXT, TEXT, INT, TIMESTAMPTZ, TEXT, UUID, TEXT
) TO service_role;

REVOKE ALL ON FUNCTION public.update_reservation_status(UUID, TEXT)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_reservation_status(UUID, TEXT)
    TO service_role;
