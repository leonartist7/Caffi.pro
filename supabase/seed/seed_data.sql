-- ============================================================================
-- SEED DATA FOR CAFFI.PRO
-- Test tenants: Blue Bottle and Sunrise Coffee
-- ============================================================================

-- Disable RLS temporarily for seeding (run as service_role)
SET LOCAL role TO service_role;

-- ============================================================================
-- TENANT 1: Blue Bottle Coffee
-- ============================================================================

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
    '11111111-1111-1111-1111-111111111111',
    'Blue Bottle Coffee Paris',
    'bluebottle-paris',
    'owner@bluebottle.fr',
    '+33123456789',
    'Blue Bottle',
    'com.bluebottle.app',
    '{"ordering": true, "loyalty": true, "delivery": false, "pwa": true}'::jsonb,
    '{
        "points_per_euro": 10,
        "signup_bonus": 50,
        "tiers": {
            "bronze": 0,
            "silver": 2000,
            "gold": 5000,
            "platinum": 10000
        }
    }'::jsonb,
    'active',
    'pro',
    NOW() + INTERVAL '30 days',
    'Europe/Paris',
    'EUR',
    'fr'
);

INSERT INTO tenant_manifests (
    tenant_id,
    design_tokens,
    logo_url,
    app_icon_url,
    splash_screen_url,
    skin_version
) VALUES (
    '11111111-1111-1111-1111-111111111111',
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
                "small": 12,
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
    'https://storage.supabase.co/object/public/splash/bluebottle-splash.png',
    '1.0.0'
);

-- Blue Bottle Location
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
    '21111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'Blue Bottle Marais',
    '18 Rue de la Verrerie',
    'Paris',
    '75004',
    'France',
    48.8566,
    2.3522,
    '+33123456789',
    '{
        "monday": "07:00-19:00",
        "tuesday": "07:00-19:00",
        "wednesday": "07:00-19:00",
        "thursday": "07:00-19:00",
        "friday": "07:00-19:00",
        "saturday": "08:00-20:00",
        "sunday": "09:00-18:00"
    }'::jsonb,
    true,
    true,
    15,
    true,
    1
);

-- Blue Bottle Categories
INSERT INTO categories (category_id, tenant_id, name, description, display_order, is_active) VALUES
('31111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Coffee', 'Freshly brewed coffee', 1, true),
('31111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'Espresso', 'Rich espresso drinks', 2, true),
('31111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'Pastries', 'Fresh baked goods', 3, true),
('31111111-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111111', 'Tea', 'Premium tea selection', 4, true);

-- Blue Bottle Menu Items
INSERT INTO menu_items (
    item_id,
    tenant_id,
    category_id,
    name,
    description,
    price,
    modifiers,
    tags,
    is_available,
    is_featured,
    display_order
) VALUES
-- Coffee
('41111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111111',
 'Drip Coffee', 'Smooth and balanced', 4.50,
 '{"sizes": [{"id": "small", "name": "Small", "price": 0}, {"id": "medium", "name": "Medium", "price": 0.50}, {"id": "large", "name": "Large", "price": 1.00}], "addons": []}'::jsonb,
 ARRAY[]::TEXT[], true, true, 1),

('41111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111111',
 'Cold Brew', 'Smooth and refreshing', 5.50,
 '{"sizes": [{"id": "small", "name": "Small", "price": 0}, {"id": "medium", "name": "Medium", "price": 0.50}, {"id": "large", "name": "Large", "price": 1.00}], "addons": []}'::jsonb,
 ARRAY[]::TEXT[], true, true, 2),

-- Espresso
('41111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111112',
 'Cappuccino', 'Espresso with steamed milk', 4.50,
 '{"sizes": [{"id": "small", "name": "Small", "price": 0}, {"id": "medium", "name": "Medium", "price": 0.50}, {"id": "large", "name": "Large", "price": 1.00}], "addons": [{"id": "extra-shot", "name": "Extra Shot", "price": 0.80}, {"id": "oat-milk", "name": "Oat Milk", "price": 0.50}]}'::jsonb,
 ARRAY['vegan']::TEXT[], true, true, 3),

('41111111-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111112',
 'Latte', 'Espresso with steamed milk', 5.00,
 '{"sizes": [{"id": "small", "name": "Small", "price": 0}, {"id": "medium", "name": "Medium", "price": 0.50}, {"id": "large", "name": "Large", "price": 1.00}], "addons": [{"id": "extra-shot", "name": "Extra Shot", "price": 0.80}, {"id": "oat-milk", "name": "Oat Milk", "price": 0.50}, {"id": "vanilla", "name": "Vanilla Syrup", "price": 0.50}]}'::jsonb,
 ARRAY[]::TEXT[], true, false, 4),

('41111111-1111-1111-1111-111111111115', '11111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111112',
 'Flat White', 'Double espresso with microfoam', 5.50,
 '{"sizes": [{"id": "small", "name": "Small", "price": 0}, {"id": "medium", "name": "Medium", "price": 0.50}], "addons": []}'::jsonb,
 ARRAY[]::TEXT[], true, false, 5),

-- Pastries
('41111111-1111-1111-1111-111111111116', '11111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111113',
 'Croissant', 'Buttery French croissant', 2.50,
 '{"sizes": [], "addons": []}'::jsonb,
 ARRAY[]::TEXT[], true, false, 6),

('41111111-1111-1111-1111-111111111117', '11111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111113',
 'Chocolate Chip Cookie', 'Homemade cookie', 3.00,
 '{"sizes": [], "addons": []}'::jsonb,
 ARRAY[]::TEXT[], true, false, 7);

-- Blue Bottle Test Users
INSERT INTO users (
    user_id,
    tenant_id,
    phone,
    email,
    full_name,
    loyalty_points,
    loyalty_tier,
    lifetime_points,
    total_orders,
    total_spent,
    notifications_enabled
) VALUES
('51111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '+33612345678', 'alice@example.com', 'Alice Martin', 250, 'silver', 2500, 12, 54.00, true),
('51111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', '+33612345679', 'bob@example.com', 'Bob Dupont', 50, 'bronze', 500, 3, 15.50, true);

-- Blue Bottle Rewards
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
('61111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Free Coffee', 'Get a free drip coffee', 100,
 'free_item', '{"item_id": "41111111-1111-1111-1111-111111111111"}'::jsonb, true),
('61111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', '10% Discount', '10% off your order', 200,
 'discount', '{"type": "percentage", "value": 10}'::jsonb, true);

-- Blue Bottle Coupons
INSERT INTO coupons (
    coupon_id,
    tenant_id,
    code,
    discount_type,
    discount_value,
    min_order_amount,
    max_uses,
    current_uses,
    valid_until,
    is_active
) VALUES
('71111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'WELCOME10', 'percentage', 10.00, 10.00, 100, 5, NOW() + INTERVAL '30 days', true),
('71111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'FIRST5', 'fixed_amount', 5.00, 15.00, 50, 12, NOW() + INTERVAL '60 days', true);

-- ============================================================================
-- TENANT 2: Sunrise Coffee
-- ============================================================================

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
    '22222222-2222-2222-2222-222222222222',
    'Sunrise Coffee',
    'sunrise-coffee',
    'owner@sunrisecoffee.fr',
    '+33987654321',
    'Sunrise Coffee',
    'com.sunrisecoffee.app',
    '{"ordering": true, "loyalty": true, "delivery": false, "pwa": true}'::jsonb,
    '{
        "points_per_euro": 15,
        "signup_bonus": 75,
        "tiers": {
            "bronze": 0,
            "silver": 1500,
            "gold": 4000,
            "platinum": 8000
        }
    }'::jsonb,
    'active',
    'starter',
    NOW() + INTERVAL '30 days',
    'Europe/Paris',
    'EUR',
    'fr'
);

INSERT INTO tenant_manifests (
    tenant_id,
    design_tokens,
    logo_url,
    app_icon_url,
    splash_screen_url,
    skin_version
) VALUES (
    '22222222-2222-2222-2222-222222222222',
    '{
        "colors": {
            "primary": "#FF6B35",
            "secondary": "#F7931E",
            "accent": "#FFD23F",
            "background": "#FFFFFF",
            "surface": "#FFF8F0",
            "text": "#2C1810",
            "textSecondary": "#8B7355"
        },
        "typography": {
            "fontFamily": "System",
            "fontSize": {
                "small": 12,
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
    'https://storage.supabase.co/object/public/splash/sunrise-splash.png',
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
    hours,
    accepts_mobile_orders,
    accepts_dine_in_orders,
    estimated_prep_time,
    is_active,
    display_order
) VALUES (
    '22222222-2222-2222-2222-222222222221',
    '22222222-2222-2222-2222-222222222222',
    'Sunrise Coffee Montmartre',
    '45 Rue des Abbesses',
    'Paris',
    '75018',
    'France',
    48.8847,
    2.3397,
    '+33987654321',
    '{
        "monday": "07:30-19:30",
        "tuesday": "07:30-19:30",
        "wednesday": "07:30-19:30",
        "thursday": "07:30-19:30",
        "friday": "07:30-20:00",
        "saturday": "08:00-20:00",
        "sunday": "09:00-19:00"
    }'::jsonb,
    true,
    true,
    12,
    true,
    1
);

-- Sunrise Coffee Categories
INSERT INTO categories (category_id, tenant_id, name, description, display_order, is_active) VALUES
('32222222-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222', 'Coffee', 'Artisan coffee', 1, true),
('32222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Specialty Drinks', 'Unique creations', 2, true),
('32222222-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222222', 'Breakfast', 'Morning favorites', 3, true);

-- Sunrise Coffee Menu Items
INSERT INTO menu_items (
    item_id,
    tenant_id,
    category_id,
    name,
    description,
    price,
    modifiers,
    tags,
    is_available,
    is_featured,
    display_order
) VALUES
-- Coffee
('42222222-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222', '32222222-2222-2222-2222-222222222221',
 'Americano', 'Espresso with hot water', 3.50,
 '{"sizes": [{"id": "small", "name": "Small", "price": 0}, {"id": "medium", "name": "Medium", "price": 0.50}, {"id": "large", "name": "Large", "price": 1.00}], "addons": []}'::jsonb,
 ARRAY[]::TEXT[], true, true, 1),

('42222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '32222222-2222-2222-2222-222222222221',
 'Cortado', 'Espresso with equal parts milk', 4.00,
 '{"sizes": [{"id": "small", "name": "Small", "price": 0}], "addons": []}'::jsonb,
 ARRAY[]::TEXT[], true, false, 2),

-- Specialty Drinks
('42222222-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222222', '32222222-2222-2222-2222-222222222222',
 'Sunrise Special', 'Our signature blend with orange zest', 6.50,
 '{"sizes": [{"id": "medium", "name": "Medium", "price": 0}, {"id": "large", "name": "Large", "price": 1.00}], "addons": []}'::jsonb,
 ARRAY[]::TEXT[], true, true, 3),

('42222222-2222-2222-2222-222222222224', '22222222-2222-2222-2222-222222222222', '32222222-2222-2222-2222-222222222222',
 'Iced Matcha Latte', 'Refreshing matcha with milk', 5.50,
 '{"sizes": [{"id": "medium", "name": "Medium", "price": 0}, {"id": "large", "name": "Large", "price": 1.00}], "addons": [{"id": "oat-milk", "name": "Oat Milk", "price": 0.50}]}'::jsonb,
 ARRAY['vegan']::TEXT[], true, false, 4),

-- Breakfast
('42222222-2222-2222-2222-222222222225', '22222222-2222-2222-2222-222222222222', '32222222-2222-2222-2222-222222222223',
 'Avocado Toast', 'Sourdough with avocado and poached egg', 8.50,
 '{"sizes": [], "addons": [{"id": "no-egg", "name": "No Egg", "price": -1.00}]}'::jsonb,
 ARRAY[]::TEXT[], true, false, 5);

-- Sunrise Coffee Test Users
INSERT INTO users (
    user_id,
    tenant_id,
    phone,
    email,
    full_name,
    loyalty_points,
    loyalty_tier,
    lifetime_points,
    total_orders,
    total_spent,
    notifications_enabled
) VALUES
('52222222-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222', '+33698765432', 'charlie@example.com', 'Charlie Bernard', 150, 'bronze', 1500, 8, 45.00, true);

-- Sunrise Coffee Rewards
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
('62222222-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222', 'Free Pastry', 'Get a free pastry', 150,
 'free_item', '{}'::jsonb, true),
('62222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '15% Discount', '15% off your order', 300,
 'discount', '{"type": "percentage", "value": 15}'::jsonb, true);

-- Sunrise Coffee Coupons
INSERT INTO coupons (
    coupon_id,
    tenant_id,
    code,
    discount_type,
    discount_value,
    min_order_amount,
    max_uses,
    current_uses,
    valid_until,
    is_active
) VALUES
('72222222-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222', 'SUNRISE15', 'percentage', 15.00, 10.00, 100, 8, NOW() + INTERVAL '30 days', true);

-- ============================================================================
-- SAMPLE ORDERS (for testing)
-- ============================================================================

-- Blue Bottle Orders
INSERT INTO orders (
    order_id,
    tenant_id,
    user_id,
    location_id,
    order_number,
    status,
    subtotal,
    tax,
    total,
    payment_method,
    payment_status,
    order_type,
    points_earned,
    created_at
) VALUES
('81111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '51111111-1111-1111-1111-111111111111',
 '21111111-1111-1111-1111-111111111111', '#0001', 'completed', 9.00, 1.80, 10.80,
 'card', 'paid', 'pickup', 90, NOW() - INTERVAL '2 days'),

('81111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', '51111111-1111-1111-1111-111111111111',
 '21111111-1111-1111-1111-111111111111', '#0002', 'preparing', 5.50, 1.10, 6.60,
 'apple_pay', 'paid', 'pickup', 0, NOW() - INTERVAL '10 minutes');

-- Blue Bottle Order Items
INSERT INTO order_items (
    order_id,
    item_id,
    item_name,
    quantity,
    unit_price,
    modifiers_selected,
    subtotal
) VALUES
('81111111-1111-1111-1111-111111111111', '41111111-1111-1111-1111-111111111113',
 'Cappuccino', 2, 4.50, '{"size": "medium"}'::jsonb, 9.00),

('81111111-1111-1111-1111-111111111112', '41111111-1111-1111-1111-111111111112',
 'Cold Brew', 1, 5.50, '{"size": "large"}'::jsonb, 5.50);

-- Blue Bottle Loyalty Transactions
INSERT INTO loyalty_transactions (
    tenant_id,
    user_id,
    order_id,
    points_change,
    balance_after,
    reason,
    description
) VALUES
('11111111-1111-1111-1111-111111111111', '51111111-1111-1111-1111-111111111111', NULL,
 50, 50, 'signup_bonus', 'Welcome bonus'),
('11111111-1111-1111-1111-111111111111', '51111111-1111-1111-1111-111111111111', '81111111-1111-1111-1111-111111111111',
 90, 140, 'order', 'Points earned from order #0001');

-- Re-enable RLS
RESET role;
