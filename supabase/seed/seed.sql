-- CAFFI.PRO - Seed Data
-- Module 1: Test data for development and testing
-- Created: 2025-01-XX

-- ============================================================================
-- TEST TENANTS
-- ============================================================================

-- Tenant 1: Blue Bottle Coffee (Paris)
INSERT INTO tenants (
    tenant_id,
    business_name,
    slug,
    owner_email,
    owner_phone,
    app_name,
    bundle_id,
    features_enabled,
    loyalty_config,
    subscription_status,
    subscription_plan,
    trial_ends_at,
    timezone,
    currency,
    language
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Blue Bottle Coffee Paris',
    'bluebottle-paris',
    'owner@bluebottle-paris.fr',
    '+33123456789',
    'Blue Bottle',
    'com.bluebottle.app',
    '{"ordering": true, "loyalty": true, "delivery": false, "pwa": true}'::jsonb,
    '{
        "points_per_euro": 10,
        "signup_bonus": 50,
        "tiers": [
            {"name": "bronze", "min_points": 0, "discount": 0},
            {"name": "silver", "min_points": 200, "discount": 5},
            {"name": "gold", "min_points": 500, "discount": 10},
            {"name": "platinum", "min_points": 1000, "discount": 15}
        ]
    }'::jsonb,
    'active',
    'pro',
    NOW() + INTERVAL '30 days',
    'Europe/Paris',
    'EUR',
    'fr'
);

-- Tenant 2: Sunrise Coffee (Lyon)
INSERT INTO tenants (
    tenant_id,
    business_name,
    slug,
    owner_email,
    owner_phone,
    app_name,
    bundle_id,
    features_enabled,
    loyalty_config,
    subscription_status,
    subscription_plan,
    trial_ends_at,
    timezone,
    currency,
    language
) VALUES (
    '00000000-0000-0000-0000-000000000002',
    'Sunrise Coffee Lyon',
    'sunrise-coffee',
    'owner@sunrisecoffee.fr',
    '+33987654321',
    'Sunrise Coffee',
    'com.sunrisecoffee.app',
    '{"ordering": true, "loyalty": true, "delivery": true, "pwa": true}'::jsonb,
    '{
        "points_per_euro": 15,
        "signup_bonus": 100,
        "tiers": [
            {"name": "bronze", "min_points": 0, "discount": 0},
            {"name": "silver", "min_points": 150, "discount": 5},
            {"name": "gold", "min_points": 400, "discount": 10},
            {"name": "platinum", "min_points": 800, "discount": 20}
        ]
    }'::jsonb,
    'active',
    'pro',
    NOW() + INTERVAL '30 days',
    'Europe/Paris',
    'EUR',
    'fr'
);

-- ============================================================================
-- TENANT MANIFESTS (Design Tokens)
-- ============================================================================

-- Blue Bottle manifest
INSERT INTO tenant_manifests (
    tenant_id,
    design_tokens,
    logo_url,
    app_icon_url,
    skin_version
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    '{
        "colors": {
            "primary": "#007AFF",
            "secondary": "#5856D6",
            "accent": "#FF9500",
            "background": "#FFFFFF",
            "surface": "#F2F2F7",
            "text": "#000000",
            "textSecondary": "#8E8E93"
        },
        "typography": {
            "fontFamily": "System",
            "fontSize": {
                "small": 14,
                "medium": 16,
                "large": 20,
                "xlarge": 24
            }
        },
        "spacing": {
            "xs": 4,
            "sm": 8,
            "md": 16,
            "lg": 24,
            "xl": 32
        }
    }'::jsonb,
    'https://storage.supabase.co/object/public/logos/bluebottle-logo.png',
    'https://storage.supabase.co/object/public/icons/bluebottle-icon.png',
    '1.0.0'
);

-- Sunrise Coffee manifest
INSERT INTO tenant_manifests (
    tenant_id,
    design_tokens,
    logo_url,
    app_icon_url,
    skin_version
) VALUES (
    '00000000-0000-0000-0000-000000000002',
    '{
        "colors": {
            "primary": "#FF6B35",
            "secondary": "#F7931E",
            "accent": "#FFD23F",
            "background": "#FFFFFF",
            "surface": "#FFF8F0",
            "text": "#2C2C2C",
            "textSecondary": "#8E8E93"
        },
        "typography": {
            "fontFamily": "System",
            "fontSize": {
                "small": 14,
                "medium": 16,
                "large": 20,
                "xlarge": 24
            }
        },
        "spacing": {
            "xs": 4,
            "sm": 8,
            "md": 16,
            "lg": 24,
            "xl": 32
        }
    }'::jsonb,
    'https://storage.supabase.co/object/public/logos/sunrise-logo.png',
    'https://storage.supabase.co/object/public/icons/sunrise-icon.png',
    '1.0.0'
);

-- ============================================================================
-- LOCATIONS
-- ============================================================================

-- Blue Bottle locations
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
    hours,
    accepts_mobile_orders,
    accepts_dine_in_orders,
    estimated_prep_time,
    is_active,
    display_order
) VALUES (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Blue Bottle Marais',
    '15 Rue de Bretagne',
    'Paris',
    '75003',
    'France',
    48.8606,
    2.3619,
    '+33123456789',
    '{
        "monday": "07:00-19:00",
        "tuesday": "07:00-19:00",
        "wednesday": "07:00-19:00",
        "thursday": "07:00-19:00",
        "friday": "07:00-19:00",
        "saturday": "08:00-18:00",
        "sunday": "09:00-17:00"
    }'::jsonb,
    true,
    true,
    15,
    true,
    1
);

-- Sunrise Coffee locations
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
    hours,
    accepts_mobile_orders,
    accepts_dine_in_orders,
    estimated_prep_time,
    is_active,
    display_order
) VALUES (
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'Sunrise Coffee Centre',
    '42 Rue de la République',
    'Lyon',
    '69002',
    'France',
    45.7640,
    4.8357,
    '+33987654321',
    '{
        "monday": "07:30-19:30",
        "tuesday": "07:30-19:30",
        "wednesday": "07:30-19:30",
        "thursday": "07:30-19:30",
        "friday": "07:30-20:00",
        "saturday": "08:00-20:00",
        "sunday": "09:00-18:00"
    }'::jsonb,
    true,
    true,
    12,
    true,
    1
);

-- ============================================================================
-- CATEGORIES
-- ============================================================================

-- Blue Bottle categories
INSERT INTO categories (
    category_id,
    tenant_id,
    name,
    description,
    display_order,
    is_active
) VALUES
    ('11000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Coffee', 'Our signature coffee drinks', 1, true),
    ('11000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Tea', 'Premium tea selection', 2, true),
    ('11000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Pastries', 'Fresh baked goods', 3, true),
    ('11000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Breakfast', 'Morning favorites', 4, true);

-- Sunrise Coffee categories
INSERT INTO categories (
    category_id,
    tenant_id,
    name,
    description,
    display_order,
    is_active
) VALUES
    ('21000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Coffee', 'Artisan coffee', 1, true),
    ('21000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Smoothies', 'Fresh fruit smoothies', 2, true),
    ('21000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'Sandwiches', 'Gourmet sandwiches', 3, true),
    ('21000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'Desserts', 'Sweet treats', 4, true);

-- ============================================================================
-- MENU ITEMS
-- ============================================================================

-- Blue Bottle menu items
INSERT INTO menu_items (
    item_id,
    tenant_id,
    category_id,
    name,
    description,
    price,
    modifiers,
    tags,
    calories,
    is_available,
    is_featured,
    display_order
) VALUES
    -- Coffee items
    ('11100000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 
     'Espresso', 'Single shot of our signature espresso', 2.50,
     '{"sizes": [{"id": "small", "name": "Single", "price": 0}, {"id": "double", "name": "Double", "price": 1.00}], "addons": [{"id": "oat_milk", "name": "Oat Milk", "price": 0.50}, {"id": "almond_milk", "name": "Almond Milk", "price": 0.50}]}'::jsonb,
     ARRAY['vegan'], 5, true, true, 1),
    
    ('11100000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001',
     'Cappuccino', 'Espresso with steamed milk and foam', 4.00,
     '{"sizes": [{"id": "small", "name": "Small (8oz)", "price": 0}, {"id": "medium", "name": "Medium (12oz)", "price": 0.50}, {"id": "large", "name": "Large (16oz)", "price": 1.00}], "addons": []}'::jsonb,
     ARRAY[], 120, true, true, 2),
    
    ('11100000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001',
     'Cold Brew', 'Smooth, refreshing cold brew coffee', 5.50,
     '{"sizes": [{"id": "small", "name": "Small (12oz)", "price": 0}, {"id": "large", "name": "Large (16oz)", "price": 1.00}], "addons": [{"id": "vanilla", "name": "Vanilla Syrup", "price": 0.50}, {"id": "caramel", "name": "Caramel Syrup", "price": 0.50}]}'::jsonb,
     ARRAY['vegan'], 15, true, false, 3),
    
    -- Pastries
    ('11100000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000003',
     'Croissant', 'Buttery, flaky French croissant', 3.50,
     '{"sizes": [], "addons": []}'::jsonb,
     ARRAY[], 272, true, true, 1),
    
    ('11100000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000003',
     'Chocolate Chip Cookie', 'Fresh baked cookie with chocolate chips', 2.50,
     '{"sizes": [], "addons": []}'::jsonb,
     ARRAY[], 150, true, false, 2);

-- Sunrise Coffee menu items
INSERT INTO menu_items (
    item_id,
    tenant_id,
    category_id,
    name,
    description,
    price,
    modifiers,
    tags,
    calories,
    is_available,
    is_featured,
    display_order
) VALUES
    -- Coffee items
    ('21100000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000001',
     'Americano', 'Espresso with hot water', 3.00,
     '{"sizes": [{"id": "small", "name": "Small", "price": 0}, {"id": "large", "name": "Large", "price": 0.80}], "addons": []}'::jsonb,
     ARRAY['vegan'], 10, true, true, 1),
    
    ('21100000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000001',
     'Latte', 'Espresso with steamed milk', 4.50,
     '{"sizes": [{"id": "small", "name": "Small (12oz)", "price": 0}, {"id": "large", "name": "Large (16oz)", "price": 1.00}], "addons": [{"id": "vanilla", "name": "Vanilla", "price": 0.50}, {"id": "hazelnut", "name": "Hazelnut", "price": 0.50}]}'::jsonb,
     ARRAY[], 180, true, true, 2),
    
    -- Smoothies
    ('21100000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000002',
     'Berry Blast Smoothie', 'Mixed berries with yogurt', 6.50,
     '{"sizes": [], "addons": [{"id": "protein", "name": "Protein Powder", "price": 1.50}]}'::jsonb,
     ARRAY['gluten-free'], 250, true, true, 1),
    
    -- Sandwiches
    ('21100000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000003',
     'Chicken Avocado Sandwich', 'Grilled chicken with avocado and veggies', 8.50,
     '{"sizes": [], "addons": [{"id": "cheese", "name": "Extra Cheese", "price": 1.00}]}'::jsonb,
     ARRAY[], 450, true, false, 1);

-- ============================================================================
-- TEST USERS (Note: These need auth.users records created separately)
-- ============================================================================

-- Note: In production, users are created via Supabase Auth
-- These are placeholder records for testing
-- You'll need to create auth.users records and link them via auth_id

-- ============================================================================
-- TEST COUPONS
-- ============================================================================

-- Blue Bottle coupons
INSERT INTO coupons (
    coupon_id,
    tenant_id,
    code,
    discount_type,
    discount_value,
    min_order_amount,
    max_uses,
    valid_from,
    valid_until,
    is_active
) VALUES
    ('11110000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'WELCOME10', 'percentage', 10, 5.00, 100, NOW(), NOW() + INTERVAL '90 days', true),
    ('11110000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'SAVE5', 'fixed_amount', 5.00, 10.00, 50, NOW(), NOW() + INTERVAL '30 days', true);

-- Sunrise Coffee coupons
INSERT INTO coupons (
    coupon_id,
    tenant_id,
    code,
    discount_type,
    discount_value,
    min_order_amount,
    max_uses,
    valid_from,
    valid_until,
    is_active
) VALUES
    ('21110000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'FIRST15', 'percentage', 15, 8.00, 200, NOW(), NOW() + INTERVAL '60 days', true);

-- ============================================================================
-- TEST REWARDS
-- ============================================================================

-- Blue Bottle rewards
INSERT INTO rewards_catalog (
    reward_id,
    tenant_id,
    name,
    description,
    points_required,
    reward_type,
    reward_value,
    is_active
) VALUES
    ('11120000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Free Coffee', 'Redeem for any coffee drink', 100,
     'free_item', '{"item_id": "11100000-0000-0000-0000-000000000001"}'::jsonb, true),
    ('11120000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '10% Off', '10% discount on your next order', 50,
     'coupon', '{"discount_percent": 10}'::jsonb, true);

-- Sunrise Coffee rewards
INSERT INTO rewards_catalog (
    reward_id,
    tenant_id,
    name,
    description,
    points_required,
    reward_type,
    reward_value,
    is_active
) VALUES
    ('21120000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Free Smoothie', 'Redeem for any smoothie', 150,
     'free_item', '{"item_id": "21100000-0000-0000-0000-000000000003"}'::jsonb, true);

-- ============================================================================
-- NOTES
-- ============================================================================

-- To create test users:
-- 1. Use Supabase Auth API or Dashboard to create auth.users records
-- 2. Then insert into users table with the auth_id
-- 3. Or use the signup flow which will create both automatically

-- Example user creation (after auth.users record exists):
-- INSERT INTO users (tenant_id, auth_id, phone, email, full_name, loyalty_points)
-- VALUES ('00000000-0000-0000-0000-000000000001', '<auth_user_id>', '+33612345678', 'test@example.com', 'Test User', 0);
