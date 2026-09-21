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
