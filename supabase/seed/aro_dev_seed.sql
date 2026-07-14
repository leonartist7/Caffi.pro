-- ============================================================================
-- aro DEV SEED (Phase 2.1) — idempotent (fixed UUIDs + ON CONFLICT guards).
-- Safe to run repeatedly. Creates:
--   · zone Kensington (Calgary) · org + venue "The Roastery" (CAD)
--   · memberships: owner/manager (pending email invites) + staff w/ PIN 4242
--   · 8 members across derived statuses (new/regular/fading/lost)
--   · ~90 days of visits with believable cadences · points ledger · rewards
--   · one winback campaign + pending ai_draft · one lead · events
--
-- Run:  psql -f supabase/seed/aro_dev_seed.sql   (or paste in SQL editor)
-- To bind the owner login: after creating your auth user, run
--   UPDATE memberships SET user_id = '<auth-uuid>', invite_accepted_at = NOW()
--   WHERE membership_id = 'a0000000-0000-4000-9000-000000000001';
-- ============================================================================

BEGIN;

INSERT INTO zones (zone_id, name, city, cap)
VALUES ('a0000000-0000-4000-1000-000000000001', 'Kensington', 'Calgary', 1)
ON CONFLICT (zone_id) DO NOTHING;

INSERT INTO organizations (org_id, name, billing_email, billing_status)
VALUES ('a0000000-0000-4000-2000-000000000001', 'The Roastery YYC Inc.',
        'owner@roastery.dev', 'trial')
ON CONFLICT (org_id) DO NOTHING;

INSERT INTO venues (venue_id, org_id, zone_id, business_name, slug, owner_email,
                    app_name, bundle_id, timezone, currency, language, brand_kit, loyalty_config)
VALUES ('a0000000-0000-4000-3000-000000000001', 'a0000000-0000-4000-2000-000000000001',
        'a0000000-0000-4000-1000-000000000001', 'The Roastery', 'the-roastery',
        'owner@roastery.dev', 'The Roastery', 'club.aro.roastery',
        'America/Edmonton', 'CAD', 'en',
        '{"primary": "#D67A45", "background": "#F3EAD7", "voice": "warm, neighbourly, no corporate speak"}'::jsonb,
        '{"points_per_euro": 10, "signup_bonus": 0}'::jsonb)
ON CONFLICT (venue_id) DO NOTHING;

-- Memberships ---------------------------------------------------------------
INSERT INTO memberships (membership_id, org_id, venue_id, role, full_name, invite_email)
VALUES
    ('a0000000-0000-4000-9000-000000000001', 'a0000000-0000-4000-2000-000000000001',
     'a0000000-0000-4000-3000-000000000001', 'owner', 'Rae Owner', 'owner@roastery.dev'),
    ('a0000000-0000-4000-9000-000000000002', 'a0000000-0000-4000-2000-000000000001',
     'a0000000-0000-4000-3000-000000000001', 'manager', 'Milo Manager', 'manager@roastery.dev'),
    ('a0000000-0000-4000-9000-000000000003', 'a0000000-0000-4000-2000-000000000001',
     'a0000000-0000-4000-3000-000000000001', 'staff', 'Counter Device', 'counter@roastery.dev')
ON CONFLICT (membership_id) DO NOTHING;

-- Shared counter PIN for the staff membership: 4242 (dev only!)
SELECT set_counter_pin('a0000000-0000-4000-9000-000000000003', '4242');

-- Members (diners) with CASL consent ----------------------------------------
INSERT INTO members (member_id, tenant_id, full_name, phone, email, birthday,
                     consent_ts, consent_text, consent_source)
SELECT
    ('a0000000-0000-4000-4000-00000000000' || i)::uuid,
    'a0000000-0000-4000-3000-000000000001',
    (ARRAY['Maya Torres','Jonah Kim','Priya Shah','Sam Whitfield',
           'Alexis Roy','Noor Haddad','Charlie Bear','Dana Kovacs'])[i],
    '+1403555000' || i,
    lower(split_part((ARRAY['Maya Torres','Jonah Kim','Priya Shah','Sam Whitfield',
           'Alexis Roy','Noor Haddad','Charlie Bear','Dana Kovacs'])[i], ' ', 1)) || '@members.dev',
    DATE '1990-01-01' + (i * 400),
    NOW() - (i || ' days')::interval,
    'Yes, send me The Roastery news and rewards. Unsubscribe anytime.',
    'join_page'
FROM generate_series(1, 8) AS i
ON CONFLICT (member_id) DO NOTHING;

-- Visits: believable cadences over the last 90 days --------------------------
--   Maya (1): every ~4 days, regular              Jonah (2): weekly, regular
--   Priya (3): was ~5-day cadence, stopped 21d ago  → fading
--   Sam (4): last visit 75 days ago                 → lost
--   Alexis (5): 2 visits this week                  → new
--   Noor (6): every ~10 days, regular               Charlie (7): 1 visit → new
--   Dana (8): ~6-day cadence, stopped 30d ago       → fading/lost boundary
INSERT INTO visits (visit_id, member_id, venue_id, ts, source, staff_membership_id)
SELECT
    md5('seed-visit' || m.idx || '-' || g)::uuid,
    ('a0000000-0000-4000-4000-00000000000' || m.idx)::uuid,
    'a0000000-0000-4000-3000-000000000001',
    NOW() - (m.stop_days || ' days')::interval - (g * m.cadence || ' days')::interval,
    CASE WHEN g % 3 = 0 THEN 'scan' ELSE 'manual' END,
    'a0000000-0000-4000-9000-000000000003'
FROM (VALUES
    (1, 4.0, 1),  (2, 7.0, 2),  (3, 5.0, 21), (4, 8.0, 75),
    (5, 3.0, 1),  (6, 10.0, 4), (7, 1.0, 2),  (8, 6.0, 30)
) AS m(idx, cadence, stop_days)
CROSS JOIN LATERAL generate_series(0,
    CASE m.idx WHEN 5 THEN 1 WHEN 7 THEN 0
               ELSE GREATEST(0, floor((90 - m.stop_days) / m.cadence)::int - 1) END) AS g
ON CONFLICT (visit_id) DO NOTHING;

-- Points ledger: 10 points per visit ------------------------------------------
INSERT INTO points_ledger (transaction_id, tenant_id, member_id, points_change, reason, description, visit_id)
SELECT
    md5('seed-points-' || v.visit_id)::uuid,
    v.venue_id, v.member_id, 10, 'order', 'Visit points (dev seed)', v.visit_id
FROM visits v
WHERE v.venue_id = 'a0000000-0000-4000-3000-000000000001'
ON CONFLICT (transaction_id) DO NOTHING;

-- Rewards ---------------------------------------------------------------------
INSERT INTO rewards (reward_id, tenant_id, name, description, points_required, reward_type)
VALUES
    ('a0000000-0000-4000-5000-000000000001', 'a0000000-0000-4000-3000-000000000001',
     'Free drip coffee', 'Any size, any roast', 100, 'free_item'),
    ('a0000000-0000-4000-5000-000000000002', 'a0000000-0000-4000-3000-000000000001',
     'Free pastry', 'From the morning case', 180, 'free_item'),
    ('a0000000-0000-4000-5000-000000000003', 'a0000000-0000-4000-3000-000000000001',
     'Bag of house beans', '340g, whole bean', 400, 'free_item')
ON CONFLICT (reward_id) DO NOTHING;

-- Campaign + pending AI draft ---------------------------------------------------
INSERT INTO campaigns (campaign_id, venue_id, type, name, status, autopilot, template)
VALUES ('a0000000-0000-4000-6000-000000000001', 'a0000000-0000-4000-3000-000000000001',
        'winback', 'Win back fading regulars', 'draft', false,
        '{"channel": "sms", "tone": "warm", "offer": "free drip on your next visit"}'::jsonb)
ON CONFLICT (campaign_id) DO NOTHING;

INSERT INTO ai_drafts (draft_id, venue_id, kind, prompt_ctx, output, status)
VALUES ('a0000000-0000-4000-7000-000000000001', 'a0000000-0000-4000-3000-000000000001',
        'winback',
        '{"member": "Priya Shah", "trigger": "fading", "usual": "oat flat white"}'::jsonb,
        'Hey Priya — the oat flat white misses you. Drop by this week and the drip''s on us. — The Roastery',
        'draft')
ON CONFLICT (draft_id) DO NOTHING;

-- Lead (as if from aro.club diagnostic) ----------------------------------------
INSERT INTO leads (lead_id, source, name, email, venue_name, city, payload, status)
VALUES ('a0000000-0000-4000-8000-000000000001', 'diagnostic', 'Jesse Nguyen',
        'jesse@steamlinecafe.dev', 'Steamline Cafe', 'Calgary',
        '{"score": 62, "biggest_gap": "no way to reach regulars"}'::jsonb, 'new')
ON CONFLICT (lead_id) DO NOTHING;

-- Events -----------------------------------------------------------------------
INSERT INTO events (event_id, actor, venue_id, type, payload)
VALUES ('a0000000-0000-4000-a100-000000000001', 'system',
        'a0000000-0000-4000-3000-000000000001', 'seed.applied',
        '{"seed": "aro_dev_seed", "version": 1}'::jsonb)
ON CONFLICT (event_id) DO NOTHING;

COMMIT;

-- Quick sanity readout
SELECT status, count(*) FROM member_status
WHERE venue_id = 'a0000000-0000-4000-3000-000000000001'
GROUP BY status ORDER BY status;

-- Idempotent Ordering Core demo for the canonical Roastery venue.
INSERT INTO public.menu_categories (category_id, venue_id, name, display_order, is_active)
VALUES
('c1000000-0000-4000-8000-000000000001','a0000000-0000-4000-3000-000000000001','Coffee',10,true),
('c1000000-0000-4000-8000-000000000002','a0000000-0000-4000-3000-000000000001','Bakery',20,true)
ON CONFLICT (category_id) DO UPDATE SET name=EXCLUDED.name, display_order=EXCLUDED.display_order, is_active=true;

INSERT INTO public.menu_items (item_id, venue_id, category_id, name, description, price_cents, is_active, sort_order, dietary_tags)
VALUES
('c2000000-0000-4000-8000-000000000001','a0000000-0000-4000-3000-000000000001','c1000000-0000-4000-8000-000000000001','Flat White','Velvety espresso and steamed milk.',475,true,10,ARRAY['vegetarian']),
('c2000000-0000-4000-8000-000000000002','a0000000-0000-4000-3000-000000000001','c1000000-0000-4000-8000-000000000001','Americano','Double espresso lengthened with hot water.',375,true,20,ARRAY['vegan']),
('c2000000-0000-4000-8000-000000000003','a0000000-0000-4000-3000-000000000001','c1000000-0000-4000-8000-000000000001','Cold Brew','Slow-steeped, chocolatey and bright.',500,true,30,ARRAY['vegan']),
('c2000000-0000-4000-8000-000000000004','a0000000-0000-4000-3000-000000000001','c1000000-0000-4000-8000-000000000002','Butter Croissant','Flaky, cultured-butter pastry.',425,true,10,ARRAY['vegetarian']),
('c2000000-0000-4000-8000-000000000005','a0000000-0000-4000-3000-000000000001','c1000000-0000-4000-8000-000000000002','Morning Bun','Cinnamon, orange and raw sugar.',450,true,20,ARRAY['vegetarian'])
ON CONFLICT (item_id) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, price_cents=EXCLUDED.price_cents, is_active=true;

INSERT INTO public.modifier_groups (group_id, venue_id, item_id, name, min_select, max_select)
VALUES
('c3000000-0000-4000-8000-000000000001','a0000000-0000-4000-3000-000000000001','c2000000-0000-4000-8000-000000000001','Size',1,1),
('c3000000-0000-4000-8000-000000000002','a0000000-0000-4000-3000-000000000001','c2000000-0000-4000-8000-000000000001','Milk',1,1)
ON CONFLICT (group_id) DO UPDATE SET name=EXCLUDED.name, min_select=EXCLUDED.min_select, max_select=EXCLUDED.max_select;

INSERT INTO public.modifiers (modifier_id, group_id, venue_id, name, price_delta_cents, is_active, sort_order)
VALUES
('c4000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000001','a0000000-0000-4000-3000-000000000001','Regular',0,true,10),
('c4000000-0000-4000-8000-000000000002','c3000000-0000-4000-8000-000000000001','a0000000-0000-4000-3000-000000000001','Large',75,true,20),
('c4000000-0000-4000-8000-000000000003','c3000000-0000-4000-8000-000000000002','a0000000-0000-4000-3000-000000000001','Whole milk',0,true,10),
('c4000000-0000-4000-8000-000000000004','c3000000-0000-4000-8000-000000000002','a0000000-0000-4000-3000-000000000001','Oat milk',75,true,20)
ON CONFLICT (modifier_id) DO UPDATE SET name=EXCLUDED.name, price_delta_cents=EXCLUDED.price_delta_cents, is_active=true;

INSERT INTO public.venue_tables (table_id, venue_id, label, qr_token, is_active)
VALUES
('c5000000-0000-4000-8000-000000000001','a0000000-0000-4000-3000-000000000001','Table 1','c5100000-0000-4000-8000-000000000001',true),
('c5000000-0000-4000-8000-000000000002','a0000000-0000-4000-3000-000000000001','Table 2','c5100000-0000-4000-8000-000000000002',true)
ON CONFLICT (table_id) DO UPDATE SET label=EXCLUDED.label, is_active=true;

INSERT INTO public.delivery_zones (zone_id, venue_id, name, fee_cents, min_order_cents, postal_prefixes, is_active)
VALUES ('c6000000-0000-4000-8000-000000000001','a0000000-0000-4000-3000-000000000001','Calgary core',500,2000,ARRAY['T2N','T2P','T2R'],true)
ON CONFLICT (zone_id) DO UPDATE SET name=EXCLUDED.name, fee_cents=EXCLUDED.fee_cents, min_order_cents=EXCLUDED.min_order_cents, postal_prefixes=EXCLUDED.postal_prefixes, is_active=true;
