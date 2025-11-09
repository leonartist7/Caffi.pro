-- =====================================================
-- CAFFI.PRO - SEED DATA
-- Test tenants and sample data
-- =====================================================

-- =====================================================
-- TEST TENANT 1: Blue Bottle Coffee
-- =====================================================

INSERT INTO tenants (
    tenant_id,
    business_name,
    slug,
    owner_email,
    owner_phone,
    app_name,
    bundle_id,
    subscription_status,
    subscription_plan,
    trial_ends_at,
    features_enabled,
    loyalty_config
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Blue Bottle Coffee Paris',
    'bluebottle-paris',
    'owner@bluebottle.fr',
    '+33123456789',
    'Blue Bottle',
    'com.bluebottle.app',
    'active',
    'pro',
    NOW() + INTERVAL '30 days',
    '{"ordering": true, "loyalty": true, "delivery": false, "pwa": true, "coupons": true, "rewards": true}'::jsonb,
    '{"points_per_euro": 10, "signup_bonus": 100, "tiers": [{"name": "bronze", "threshold": 0, "discount": 0}, {"name": "silver", "threshold": 500, "discount": 5}, {"name": "gold", "threshold": 1500, "discount": 10}, {"name": "platinum", "threshold": 5000, "discount": 15}]}'::jsonb
);

-- Blue Bottle Manifest
INSERT INTO tenant_manifests (
    manifest_id,
    tenant_id,
    design_tokens,
    logo_url,
    app_icon_url,
    skin_version
) VALUES (
    '11111111-1111-1111-1111-111111111112',
    '11111111-1111-1111-1111-111111111111',
    '{
        "colors": {
            "primary": "#003C5C",
            "secondary": "#8B4513",
            "accent": "#D4A574",
            "background": "#FFFFFF",
            "surface": "#F5F5F5",
            "error": "#DC3545",
            "success": "#28A745",
            "text_primary": "#1A1A1A",
            "text_secondary": "#666666"
        },
        "typography": {
            "font_family": "Helvetica Neue",
            "heading_font": "Avenir",
            "font_size_base": 16,
            "font_size_heading": 24,
            "font_weight_regular": 400,
            "font_weight_bold": 700
        },
        "spacing": {
            "xs": 4,
            "sm": 8,
            "md": 16,
            "lg": 24,
            "xl": 32
        },
        "border_radius": {
            "sm": 4,
            "md": 8,
            "lg": 16,
            "full": 9999
        }
    }'::jsonb,
    'https://example.com/logos/bluebottle.png',
    'https://example.com/icons/bluebottle.png',
    '1.0.0'
);

-- Blue Bottle Locations
INSERT INTO locations (
    location_id,
    tenant_id,
    name,
    address,
    city,
    postal_code,
    country,
    latitude,
    longitude,
    phone,
    email,
    is_active
) VALUES
(
    '11111111-1111-1111-1111-111111111113',
    '11111111-1111-1111-1111-111111111111',
    'Blue Bottle Marais',
    '10 Rue de Bretagne',
    'Paris',
    '75003',
    'France',
    48.8622,
    2.3622,
    '+33145678901',
    'marais@bluebottle.fr',
    true
),
(
    '11111111-1111-1111-1111-111111111114',
    '11111111-1111-1111-1111-111111111111',
    'Blue Bottle Saint-Germain',
    '15 Rue de Seine',
    'Paris',
    '75006',
    'France',
    48.8534,
    2.3364,
    '+33145678902',
    'saintgermain@bluebottle.fr',
    true
);

-- =====================================================
-- TEST TENANT 2: Sunrise Coffee
-- =====================================================

INSERT INTO tenants (
    tenant_id,
    business_name,
    slug,
    owner_email,
    owner_phone,
    app_name,
    bundle_id,
    subscription_status,
    subscription_plan,
    trial_ends_at,
    features_enabled,
    loyalty_config
) VALUES (
    '22222222-2222-2222-2222-222222222222',
    'Sunrise Coffee Lyon',
    'sunrise-lyon',
    'contact@sunrisecoffee.fr',
    '+33123456788',
    'Sunrise Coffee',
    'com.sunrise.app',
    'trial',
    'starter',
    NOW() + INTERVAL '14 days',
    '{"ordering": true, "loyalty": true, "delivery": false, "pwa": false, "coupons": true, "rewards": true}'::jsonb,
    '{"points_per_euro": 15, "signup_bonus": 50, "tiers": [{"name": "bronze", "threshold": 0, "discount": 0}, {"name": "silver", "threshold": 300, "discount": 5}, {"name": "gold", "threshold": 1000, "discount": 10}, {"name": "platinum", "threshold": 3000, "discount": 20}]}'::jsonb
);

-- Sunrise Coffee Manifest
INSERT INTO tenant_manifests (
    manifest_id,
    tenant_id,
    design_tokens,
    logo_url,
    app_icon_url,
    skin_version
) VALUES (
    '22222222-2222-2222-2222-222222222223',
    '22222222-2222-2222-2222-222222222222',
    '{
        "colors": {
            "primary": "#FF6B35",
            "secondary": "#F7931E",
            "accent": "#FFC845",
            "background": "#FFFFFF",
            "surface": "#FFF8F0",
            "error": "#DC3545",
            "success": "#28A745",
            "text_primary": "#2D2D2D",
            "text_secondary": "#757575"
        },
        "typography": {
            "font_family": "Inter",
            "heading_font": "Poppins",
            "font_size_base": 16,
            "font_size_heading": 26,
            "font_weight_regular": 400,
            "font_weight_bold": 600
        },
        "spacing": {
            "xs": 4,
            "sm": 8,
            "md": 16,
            "lg": 24,
            "xl": 32
        },
        "border_radius": {
            "sm": 6,
            "md": 12,
            "lg": 20,
            "full": 9999
        }
    }'::jsonb,
    'https://example.com/logos/sunrise.png',
    'https://example.com/icons/sunrise.png',
    '1.0.0'
);

-- Sunrise Coffee Location
INSERT INTO locations (
    location_id,
    tenant_id,
    name,
    address,
    city,
    postal_code,
    country,
    latitude,
    longitude,
    phone,
    email,
    is_active
) VALUES (
    '22222222-2222-2222-2222-222222222224',
    '22222222-2222-2222-2222-222222222222',
    'Sunrise Coffee Bellecour',
    '5 Place Bellecour',
    'Lyon',
    '69002',
    'France',
    45.7578,
    4.8320,
    '+33478901234',
    'bellecour@sunrisecoffee.fr',
    true
);

-- =====================================================
-- CATEGORIES (Blue Bottle)
-- =====================================================

INSERT INTO categories (category_id, tenant_id, name, description, icon_name, display_order, is_active) VALUES
('11111111-1111-1111-1111-111111111115', '11111111-1111-1111-1111-111111111111', 'Coffee', 'Freshly brewed coffee', 'coffee', 1, true),
('11111111-1111-1111-1111-111111111116', '11111111-1111-1111-1111-111111111111', 'Espresso', 'Espresso-based drinks', 'espresso', 2, true),
('11111111-1111-1111-1111-111111111117', '11111111-1111-1111-1111-111111111111', 'Tea', 'Premium teas', 'tea', 3, true),
('11111111-1111-1111-1111-111111111118', '11111111-1111-1111-1111-111111111111', 'Pastries', 'Fresh pastries and snacks', 'croissant', 4, true);

-- =====================================================
-- CATEGORIES (Sunrise Coffee)
-- =====================================================

INSERT INTO categories (category_id, tenant_id, name, description, icon_name, display_order, is_active) VALUES
('22222222-2222-2222-2222-222222222225', '22222222-2222-2222-2222-222222222222', 'Hot Drinks', 'Coffee and tea', 'hot-drink', 1, true),
('22222222-2222-2222-2222-222222222226', '22222222-2222-2222-2222-222222222222', 'Cold Drinks', 'Iced beverages', 'cold-drink', 2, true),
('22222222-2222-2222-2222-222222222227', '22222222-2222-2222-2222-222222222222', 'Food', 'Sandwiches and snacks', 'food', 3, true);

-- =====================================================
-- MENU ITEMS (Blue Bottle)
-- =====================================================

INSERT INTO menu_items (
    item_id, tenant_id, category_id, name, description, price, 
    tags, is_available, is_featured, display_order,
    modifiers
) VALUES
(
    '11111111-1111-1111-1111-111111111119',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111115',
    'Drip Coffee',
    'Single-origin pour over coffee',
    4.50,
    ARRAY['hot', 'caffeine'],
    true, true, 1,
    '{"sizes": [{"id": "sm", "name": "Small", "price": 0}, {"id": "md", "name": "Medium", "price": 0.50}, {"id": "lg", "name": "Large", "price": 1.00}], "addons": [{"id": "milk", "name": "Extra Milk", "price": 0.50}, {"id": "sugar", "name": "Sugar", "price": 0}]}'::jsonb
),
(
    '11111111-1111-1111-1111-11111111111a',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111116',
    'Cappuccino',
    'Espresso with steamed milk and foam',
    5.00,
    ARRAY['hot', 'caffeine', 'milk'],
    true, true, 2,
    '{"sizes": [{"id": "reg", "name": "Regular", "price": 0}, {"id": "lg", "name": "Large", "price": 1.00}], "addons": [{"id": "extra-shot", "name": "Extra Shot", "price": 1.50}, {"id": "oat-milk", "name": "Oat Milk", "price": 0.75}, {"id": "almond-milk", "name": "Almond Milk", "price": 0.75}]}'::jsonb
),
(
    '11111111-1111-1111-1111-11111111111b',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111116',
    'Latte',
    'Espresso with steamed milk',
    5.50,
    ARRAY['hot', 'caffeine', 'milk'],
    true, false, 3,
    '{"sizes": [{"id": "reg", "name": "Regular", "price": 0}, {"id": "lg", "name": "Large", "price": 1.00}], "addons": [{"id": "vanilla", "name": "Vanilla Syrup", "price": 0.75}, {"id": "caramel", "name": "Caramel Syrup", "price": 0.75}, {"id": "extra-shot", "name": "Extra Shot", "price": 1.50}]}'::jsonb
),
(
    '11111111-1111-1111-1111-11111111111c',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111118',
    'Croissant',
    'Buttery French croissant',
    3.50,
    ARRAY['pastry', 'vegetarian'],
    true, false, 10,
    '{"sizes": [], "addons": []}'::jsonb
),
(
    '11111111-1111-1111-1111-11111111111d',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111118',
    'Pain au Chocolat',
    'Chocolate-filled pastry',
    4.00,
    ARRAY['pastry', 'vegetarian', 'chocolate'],
    true, true, 11,
    '{"sizes": [], "addons": []}'::jsonb
);

-- =====================================================
-- MENU ITEMS (Sunrise Coffee)
-- =====================================================

INSERT INTO menu_items (
    item_id, tenant_id, category_id, name, description, price,
    tags, is_available, is_featured, display_order,
    modifiers
) VALUES
(
    '22222222-2222-2222-2222-222222222228',
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222225',
    'Americano',
    'Espresso with hot water',
    3.50,
    ARRAY['hot', 'caffeine'],
    true, true, 1,
    '{"sizes": [{"id": "reg", "name": "Regular", "price": 0}, {"id": "lg", "name": "Large", "price": 0.75}], "addons": [{"id": "milk", "name": "Milk", "price": 0.50}]}'::jsonb
),
(
    '22222222-2222-2222-2222-222222222229',
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222226',
    'Iced Latte',
    'Chilled espresso with cold milk',
    5.00,
    ARRAY['cold', 'caffeine', 'milk'],
    true, true, 2,
    '{"sizes": [{"id": "reg", "name": "Regular", "price": 0}, {"id": "lg", "name": "Large", "price": 1.00}], "addons": [{"id": "vanilla", "name": "Vanilla", "price": 0.50}, {"id": "caramel", "name": "Caramel", "price": 0.50}]}'::jsonb
);

-- =====================================================
-- TEST USERS (Blue Bottle)
-- =====================================================

INSERT INTO users (
    user_id, tenant_id, phone, email, full_name,
    loyalty_points, loyalty_tier, lifetime_points,
    total_orders, total_spent
) VALUES
(
    '11111111-1111-1111-1111-11111111111e',
    '11111111-1111-1111-1111-111111111111',
    '+33612345678',
    'marie.dupont@example.com',
    'Marie Dupont',
    450, 'bronze', 450,
    8, 72.00
),
(
    '11111111-1111-1111-1111-11111111111f',
    '11111111-1111-1111-1111-111111111111',
    '+33687654321',
    'pierre.martin@example.com',
    'Pierre Martin',
    1250, 'silver', 1250,
    25, 250.00
);

-- =====================================================
-- TEST USERS (Sunrise Coffee)
-- =====================================================

INSERT INTO users (
    user_id, tenant_id, phone, email, full_name,
    loyalty_points, loyalty_tier, lifetime_points,
    total_orders, total_spent
) VALUES
(
    '22222222-2222-2222-2222-22222222222a',
    '22222222-2222-2222-2222-222222222222',
    '+33612345679',
    'sophie.bernard@example.com',
    'Sophie Bernard',
    180, 'bronze', 180,
    4, 28.00
);

-- =====================================================
-- REWARDS (Blue Bottle)
-- =====================================================

INSERT INTO rewards_catalog (
    reward_id, tenant_id, name, description, points_required,
    reward_type, reward_value, is_active
) VALUES
(
    '11111111-1111-1111-1111-111111111120',
    '11111111-1111-1111-1111-111111111111',
    'Free Croissant',
    'Redeem for any croissant',
    200,
    'free_item',
    '{"item_id": "11111111-1111-1111-1111-11111111111c"}'::jsonb,
    true
),
(
    '11111111-1111-1111-1111-111111111121',
    '11111111-1111-1111-1111-111111111111',
    '€5 Off',
    'Get €5 off your next order',
    500,
    'coupon',
    '{"discount_type": "fixed_amount", "discount_value": 5.00}'::jsonb,
    true
),
(
    '11111111-1111-1111-1111-111111111122',
    '11111111-1111-1111-1111-111111111111',
    'Free Drink',
    'Any drink up to €6',
    300,
    'coupon',
    '{"discount_type": "fixed_amount", "discount_value": 6.00}'::jsonb,
    true
);

-- =====================================================
-- COUPONS (Blue Bottle)
-- =====================================================

INSERT INTO coupons (
    coupon_id, tenant_id, code, discount_type, discount_value,
    min_order_amount, max_uses, current_uses, valid_until, is_active
) VALUES
(
    '11111111-1111-1111-1111-111111111123',
    '11111111-1111-1111-1111-111111111111',
    'WELCOME10',
    'percentage',
    10,
    0,
    100, 5,
    NOW() + INTERVAL '30 days',
    true
),
(
    '11111111-1111-1111-1111-111111111124',
    '11111111-1111-1111-1111-111111111111',
    'FREEPASTRY',
    'fixed_amount',
    4.00,
    10.00,
    50, 12,
    NOW() + INTERVAL '7 days',
    true
);

-- =====================================================
-- COUPONS (Sunrise Coffee)
-- =====================================================

INSERT INTO coupons (
    coupon_id, tenant_id, code, discount_type, discount_value,
    min_order_amount, max_uses, current_uses, valid_until, is_active
) VALUES
(
    '22222222-2222-2222-2222-22222222222b',
    '22222222-2222-2222-2222-222222222222',
    'SUNRISE20',
    'percentage',
    20,
    15.00,
    NULL, 3,
    NOW() + INTERVAL '60 days',
    true
);

-- =====================================================
-- COMMENTS
-- =====================================================

-- Note: In production, you would create actual auth.users entries
-- and link them via auth_id. For seed data, we're creating users
-- without auth links for testing database functions.

COMMENT ON TABLE tenants IS 'Seed data includes two test tenants: Blue Bottle (active) and Sunrise Coffee (trial)';
