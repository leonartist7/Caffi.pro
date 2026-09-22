-- Local-only, resettable SPEC-01 fixtures. `supabase db reset --local`
-- applies this seed after the repository migrations. These UUIDs are
-- synthetic and must never be copied into a hosted environment.

INSERT INTO auth.users (id, email) VALUES
  ('11000000-0000-4000-8000-000000000001', 'spec01-owner@test.local'),
  ('11000000-0000-4000-8000-000000000002', 'spec01-manager@test.local'),
  ('11000000-0000-4000-8000-000000000003', 'spec01-revoked@test.local'),
  ('11000000-0000-4000-8000-000000000004', 'spec01-admin@test.local')
ON CONFLICT (id) DO NOTHING;

INSERT INTO organizations (org_id, name) VALUES
  ('12000000-0000-4000-8000-000000000001', 'SPEC-01 North Group'),
  ('12000000-0000-4000-8000-000000000002', 'SPEC-01 South Group')
ON CONFLICT (org_id) DO NOTHING;

INSERT INTO venues (venue_id, org_id, business_name, slug, owner_email, app_name, bundle_id, loyalty_config)
VALUES
  ('13000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000001', 'SPEC-01 North One', 'spec01-north-one', 'north-one@test.local', 'North One', 'test.spec01.north.one', '{}'::jsonb),
  ('13000000-0000-4000-8000-000000000002', '12000000-0000-4000-8000-000000000001', 'SPEC-01 North Two', 'spec01-north-two', 'north-two@test.local', 'North Two', 'test.spec01.north.two', '{}'::jsonb),
  ('13000000-0000-4000-8000-000000000003', '12000000-0000-4000-8000-000000000002', 'SPEC-01 South', 'spec01-south', 'south@test.local', 'South', 'test.spec01.south', '{}'::jsonb)
ON CONFLICT (venue_id) DO NOTHING;

INSERT INTO memberships (membership_id, user_id, org_id, venue_id, role, full_name, is_active)
VALUES
  ('14000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000001', 'owner', 'SPEC-01 Owner', true),
  ('14000000-0000-4000-8000-000000000002', '11000000-0000-4000-8000-000000000002', '12000000-0000-4000-8000-000000000001', NULL, 'manager', 'SPEC-01 Org Manager', true),
  ('14000000-0000-4000-8000-000000000003', '11000000-0000-4000-8000-000000000003', '12000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000001', 'owner', 'SPEC-01 Revoked Owner', false),
  ('14000000-0000-4000-8000-000000000004', '11000000-0000-4000-8000-000000000004', '12000000-0000-4000-8000-000000000002', NULL, 'aro_admin', 'SPEC-01 Platform Admin', true)
ON CONFLICT (membership_id) DO NOTHING;

-- SPEC-02 local ordering journey. These fixed, synthetic IDs provide two
-- isolated restaurant tenants, valid/invalid modifiers, a QR table and a
-- delivery selection. `supabase db reset --local` is the only supported way
-- to load them; this seed must never be applied to a hosted project.
INSERT INTO auth.users (id, email) VALUES
  ('11000000-0000-4000-8000-000000000005', 'spec02-counter@test.local'),
  ('11000000-0000-4000-8000-000000000006', 'spec02-revoked-counter@test.local')
ON CONFLICT (id) DO NOTHING;

UPDATE venues
SET timezone = 'UTC',
    currency = 'CAD',
    reservation_config = jsonb_build_object(
      'hours', jsonb_build_object(
        'sun', jsonb_build_array('00:00', '23:59'),
        'mon', jsonb_build_array('00:00', '23:59'),
        'tue', jsonb_build_array('00:00', '23:59'),
        'wed', jsonb_build_array('00:00', '23:59'),
        'thu', jsonb_build_array('00:00', '23:59'),
        'fri', jsonb_build_array('00:00', '23:59'),
        'sat', jsonb_build_array('00:00', '23:59')
      )
    ),
    brand_kit = jsonb_build_object('primary', '#7c3f1d', 'site_profile', jsonb_build_object('site_enabled', true))
WHERE venue_id = '13000000-0000-4000-8000-000000000001';

-- South is intentionally closed: it proves a tenant cannot be used as a
-- fallback when another venue's identifiers are supplied.
UPDATE venues
SET timezone = 'UTC',
    reservation_config = jsonb_build_object('hours', jsonb_build_object('sun', null, 'mon', null, 'tue', null, 'wed', null, 'thu', null, 'fri', null, 'sat', null))
WHERE venue_id = '13000000-0000-4000-8000-000000000003';

INSERT INTO memberships (membership_id, user_id, org_id, venue_id, role, full_name, is_active)
VALUES
  ('14000000-0000-4000-8000-000000000005', '11000000-0000-4000-8000-000000000005', '12000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000001', 'staff', 'SPEC-02 Counter', true),
  ('14000000-0000-4000-8000-000000000006', '11000000-0000-4000-8000-000000000006', '12000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000001', 'staff', 'SPEC-02 Revoked Counter', false)
ON CONFLICT (membership_id) DO UPDATE SET is_active = EXCLUDED.is_active;

SELECT set_counter_pin('14000000-0000-4000-8000-000000000005', '4242');

INSERT INTO menu_categories (category_id, venue_id, name, display_order, is_active)
VALUES
  ('15000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000001', 'Coffee', 10, true),
  ('15000000-0000-4000-8000-000000000002', '13000000-0000-4000-8000-000000000001', 'Bakery', 20, true),
  ('15000000-0000-4000-8000-000000000003', '13000000-0000-4000-8000-000000000003', 'South menu', 10, true)
ON CONFLICT (category_id) DO UPDATE SET name = EXCLUDED.name, is_active = true;

INSERT INTO menu_items (item_id, venue_id, category_id, name, description, price_cents, is_active, is_86ed, sort_order)
VALUES
  ('16000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000001', '15000000-0000-4000-8000-000000000001', 'Synthetic flat white', 'Test fixture espresso and milk.', 475, true, false, 10),
  ('16000000-0000-4000-8000-000000000002', '13000000-0000-4000-8000-000000000001', '15000000-0000-4000-8000-000000000002', 'Synthetic croissant', 'Test fixture bakery item.', 425, true, false, 20),
  ('16000000-0000-4000-8000-000000000003', '13000000-0000-4000-8000-000000000001', '15000000-0000-4000-8000-000000000002', 'Sold-out fixture bun', 'Intentionally unavailable test item.', 450, true, true, 30),
  ('16000000-0000-4000-8000-000000000004', '13000000-0000-4000-8000-000000000003', '15000000-0000-4000-8000-000000000003', 'Cross-tenant tea', 'Must never be ordered through North.', 350, true, false, 10)
ON CONFLICT (item_id) DO UPDATE SET price_cents = EXCLUDED.price_cents, is_active = EXCLUDED.is_active, is_86ed = EXCLUDED.is_86ed;

INSERT INTO modifier_groups (group_id, venue_id, item_id, name, min_select, max_select)
VALUES
  ('17000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000001', '16000000-0000-4000-8000-000000000001', 'Milk', 1, 1)
ON CONFLICT (group_id) DO UPDATE SET min_select = EXCLUDED.min_select, max_select = EXCLUDED.max_select;

INSERT INTO modifiers (modifier_id, group_id, venue_id, name, price_delta_cents, is_active, sort_order)
VALUES
  ('18000000-0000-4000-8000-000000000001', '17000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000001', 'Whole milk', 0, true, 10),
  ('18000000-0000-4000-8000-000000000002', '17000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000001', 'Oat milk', 75, true, 20),
  ('18000000-0000-4000-8000-000000000003', '17000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000001', 'Inactive milk', 50, false, 30)
ON CONFLICT (modifier_id) DO UPDATE SET is_active = EXCLUDED.is_active, price_delta_cents = EXCLUDED.price_delta_cents;

INSERT INTO venue_tables (table_id, venue_id, label, qr_token, is_active, capacity)
VALUES
  ('19000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000001', 'Fixture table one', '19000000-0000-4000-8000-000000000011', true, 2),
  ('19000000-0000-4000-8000-000000000002', '13000000-0000-4000-8000-000000000001', 'Inactive fixture table', '19000000-0000-4000-8000-000000000012', false, 2)
ON CONFLICT (table_id) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO delivery_zones (zone_id, venue_id, name, fee_cents, min_order_cents, postal_prefixes, is_active)
VALUES
  ('1a000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000001', 'Fixture local zone', 250, 500, ARRAY['TST'], true)
ON CONFLICT (zone_id) DO UPDATE SET fee_cents = EXCLUDED.fee_cents, min_order_cents = EXCLUDED.min_order_cents, is_active = true;
