-- Reservations Core live invariants. Safe on production: all writes roll back.

BEGIN;

DO $$
DECLARE
    v_venue_id UUID := 'a0000000-0000-4000-3000-000000000001';
    v_client_uuid UUID := uuid_generate_v4();
    v_starts_at TIMESTAMPTZ;
    v_row public.reservations%ROWTYPE;
    v_row2 public.reservations%ROWTYPE;
    v_table_id UUID;
    v_event_count INT;
    v_illegal BOOLEAN := false;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM venues WHERE venue_id = v_venue_id) THEN
        RAISE EXCEPTION 'Reservations test venue is missing';
    END IF;

    IF has_any_column_privilege('anon', 'public.reservations', 'SELECT')
       OR has_any_column_privilege('authenticated', 'public.waitlist_entries', 'SELECT') THEN
        RAISE EXCEPTION 'Private reservation tables have browser read grants';
    END IF;

    IF has_function_privilege(
        'anon',
        'public.create_reservation(uuid,uuid,text,text,text,integer,timestamptz,text,uuid,text)',
        'EXECUTE'
    ) OR has_function_privilege(
        'anon',
        'public.find_available_table(uuid,integer,timestamptz,integer)',
        'EXECUTE'
    ) OR has_function_privilege(
        'anon',
        'public.update_reservation_status(uuid,text)',
        'EXECUTE'
    ) THEN
        RAISE EXCEPTION 'Reservation RPCs are anon-executable';
    END IF;

    -- Ensure hours are configured so create_reservation can succeed in tests.
    UPDATE venues
    SET reservation_config = jsonb_set(
        COALESCE(reservation_config, '{}'::jsonb),
        '{hours}',
        '{"mon":["08:00","20:00"],"tue":["08:00","20:00"],"wed":["08:00","20:00"],
          "thu":["08:00","20:00"],"fri":["08:00","20:00"],"sat":["08:00","20:00"],"sun":null}'::jsonb
    )
    WHERE venue_id = v_venue_id;

    -- Pick a start time: next weekday 10:00 venue-local (America/Edmonton seed).
    v_starts_at := (
        date_trunc('day', NOW() AT TIME ZONE 'America/Edmonton')
        + INTERVAL '1 day' + TIME '10:00'
    ) AT TIME ZONE 'America/Edmonton';
    -- Skip if that lands on Sunday for the venue.
    WHILE EXTRACT(DOW FROM (v_starts_at AT TIME ZONE 'America/Edmonton')) = 0
       OR v_starts_at <= NOW() LOOP
        v_starts_at := v_starts_at + INTERVAL '1 day';
    END LOOP;

    v_row := create_reservation(
        v_venue_id, v_client_uuid, 'Test Guest', '+15555550100', 'test@example.com',
        2, v_starts_at, 'reservations core test', NULL, 'guest'
    );
    IF v_row.reservation_id IS NULL OR v_row.status <> 'confirmed' THEN
        RAISE EXCEPTION 'create_reservation did not return a confirmed row';
    END IF;

    v_row2 := create_reservation(
        v_venue_id, v_client_uuid, 'Test Guest', '+15555550100', 'test@example.com',
        2, v_starts_at, 'replay', NULL, 'guest'
    );
    IF v_row2.reservation_id <> v_row.reservation_id THEN
        RAISE EXCEPTION 'Idempotent client_uuid replay created a second reservation';
    END IF;

    SELECT COUNT(*) INTO v_event_count
    FROM events
    WHERE type = 'reservation.created'
      AND payload ->> 'reservation_id' = v_row.reservation_id::text;
    IF v_event_count <> 1 THEN
        RAISE EXCEPTION 'Expected exactly one reservation.created event, found %', v_event_count;
    END IF;

    -- Exhaust capacity for same slot/party: fill remaining tables then expect NO_AVAILABILITY.
    LOOP
        BEGIN
            PERFORM create_reservation(
                v_venue_id, uuid_generate_v4(), 'Fill Guest', '+15555550101', NULL,
                2, v_starts_at, NULL, NULL, 'guest'
            );
        EXCEPTION WHEN SQLSTATE 'P0001' THEN
            IF SQLERRM LIKE '%NO_AVAILABILITY%' THEN
                EXIT;
            END IF;
            RAISE;
        END;
        -- Safety: if somehow unlimited, stop after many inserts.
        IF (SELECT COUNT(*) FROM reservations WHERE venue_id = v_venue_id AND starts_at = v_starts_at) > 50 THEN
            RAISE EXCEPTION 'Capacity exhaustion loop did not raise NO_AVAILABILITY';
        END IF;
    END LOOP;

    v_table_id := find_available_table(v_venue_id, 2, v_starts_at, 90);
    IF v_table_id IS NOT NULL THEN
        RAISE EXCEPTION 'find_available_table should return NULL when fully booked';
    END IF;

    -- Legal transition
    v_row := update_reservation_status(v_row.reservation_id, 'seated');
    IF v_row.status <> 'seated' THEN
        RAISE EXCEPTION 'confirmed→seated failed';
    END IF;

    -- Illegal transition
    BEGIN
        PERFORM update_reservation_status(v_row.reservation_id, 'confirmed');
    EXCEPTION WHEN SQLSTATE 'P0001' THEN
        IF SQLERRM LIKE '%ILLEGAL_RESERVATION_TRANSITION%' THEN
            v_illegal := true;
        ELSE
            RAISE;
        END IF;
    END;
    IF NOT v_illegal THEN
        RAISE EXCEPTION 'Illegal transition was not rejected';
    END IF;
END;
$$;

ROLLBACK;

SELECT 'ALL RESERVATIONS CORE TESTS PASSED' AS result;
