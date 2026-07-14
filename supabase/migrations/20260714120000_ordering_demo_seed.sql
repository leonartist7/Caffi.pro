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
