-- =====================================================
-- CAFFI.PRO - DATABASE FUNCTIONS
-- Business logic and automation
-- =====================================================

-- =====================================================
-- FUNCTION: Generate unique order number
-- =====================================================

CREATE OR REPLACE FUNCTION generate_order_number(p_tenant_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_count INTEGER;
    v_order_number TEXT;
BEGIN
    -- Get count of orders for this tenant today
    SELECT COUNT(*) INTO v_count
    FROM orders
    WHERE tenant_id = p_tenant_id
    AND DATE(created_at) = CURRENT_DATE;
    
    -- Generate order number: #YYYYMMDD-XXXX
    v_order_number := '#' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD((v_count + 1)::TEXT, 4, '0');
    
    RETURN v_order_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate order number
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL THEN
        NEW.order_number := generate_order_number(NEW.tenant_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_order_number
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION set_order_number();

-- =====================================================
-- FUNCTION: Calculate loyalty points for order
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_loyalty_points(
    p_order_total DECIMAL,
    p_tenant_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    v_points_per_euro INTEGER;
    v_points INTEGER;
BEGIN
    -- Get tenant's loyalty configuration
    SELECT (loyalty_config->>'points_per_euro')::INTEGER INTO v_points_per_euro
    FROM tenants
    WHERE tenant_id = p_tenant_id;
    
    -- Default to 10 points per euro if not set
    v_points_per_euro := COALESCE(v_points_per_euro, 10);
    
    -- Calculate points (rounded down)
    v_points := FLOOR(p_order_total * v_points_per_euro);
    
    RETURN v_points;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Calculate user's loyalty tier
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_loyalty_tier(
    p_lifetime_points INTEGER,
    p_tenant_id UUID
)
RETURNS loyalty_tier AS $$
DECLARE
    v_tiers JSONB;
    v_tier TEXT := 'bronze';
    v_tier_obj JSONB;
BEGIN
    -- Get tenant's tier configuration
    SELECT loyalty_config->'tiers' INTO v_tiers
    FROM tenants
    WHERE tenant_id = p_tenant_id;
    
    -- Loop through tiers (ordered by threshold descending)
    FOR v_tier_obj IN 
        SELECT * FROM jsonb_array_elements(v_tiers)
        ORDER BY (value->>'threshold')::INTEGER DESC
    LOOP
        IF p_lifetime_points >= (v_tier_obj->>'threshold')::INTEGER THEN
            v_tier := v_tier_obj->>'name';
            EXIT;
        END IF;
    END LOOP;
    
    RETURN v_tier::loyalty_tier;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Update user loyalty (trigger on transaction)
-- =====================================================

CREATE OR REPLACE FUNCTION update_user_loyalty()
RETURNS TRIGGER AS $$
DECLARE
    v_new_tier loyalty_tier;
BEGIN
    -- Update user's current points and lifetime points
    UPDATE users
    SET 
        loyalty_points = NEW.balance_after,
        lifetime_points = CASE 
            WHEN NEW.points_change > 0 THEN lifetime_points + NEW.points_change
            ELSE lifetime_points
        END,
        updated_at = NOW()
    WHERE user_id = NEW.user_id;
    
    -- Calculate and update tier if points were earned
    IF NEW.points_change > 0 THEN
        SELECT calculate_loyalty_tier(
            (SELECT lifetime_points FROM users WHERE user_id = NEW.user_id),
            NEW.tenant_id
        ) INTO v_new_tier;
        
        UPDATE users
        SET loyalty_tier = v_new_tier
        WHERE user_id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_loyalty
    AFTER INSERT ON loyalty_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_loyalty();

-- =====================================================
-- FUNCTION: Update order statistics
-- =====================================================

CREATE OR REPLACE FUNCTION update_order_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- When order is completed, update user stats
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        UPDATE users
        SET 
            total_orders = total_orders + 1,
            total_spent = total_spent + NEW.total,
            last_order_at = NOW(),
            updated_at = NOW()
        WHERE user_id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_order_stats
    AFTER INSERT OR UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_order_stats();

-- =====================================================
-- FUNCTION: Award loyalty points for completed order
-- =====================================================

CREATE OR REPLACE FUNCTION award_order_loyalty_points()
RETURNS TRIGGER AS $$
DECLARE
    v_points INTEGER;
    v_current_balance INTEGER;
BEGIN
    -- Only award points when order is completed
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        -- Calculate points
        v_points := calculate_loyalty_points(NEW.total, NEW.tenant_id);
        
        -- Get current balance
        SELECT loyalty_points INTO v_current_balance
        FROM users
        WHERE user_id = NEW.user_id;
        
        -- Create loyalty transaction
        INSERT INTO loyalty_transactions (
            tenant_id,
            user_id,
            order_id,
            points_change,
            balance_after,
            reason,
            description
        ) VALUES (
            NEW.tenant_id,
            NEW.user_id,
            NEW.order_id,
            v_points,
            v_current_balance + v_points,
            'order',
            'Points earned from order ' || NEW.order_number
        );
        
        -- Update order with points earned
        UPDATE orders
        SET points_earned = v_points
        WHERE order_id = NEW.order_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_award_order_loyalty_points
    AFTER INSERT OR UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION award_order_loyalty_points();

-- =====================================================
-- FUNCTION: Award signup bonus
-- =====================================================

CREATE OR REPLACE FUNCTION award_signup_bonus()
RETURNS TRIGGER AS $$
DECLARE
    v_signup_bonus INTEGER;
BEGIN
    -- Get tenant's signup bonus
    SELECT (loyalty_config->>'signup_bonus')::INTEGER INTO v_signup_bonus
    FROM tenants
    WHERE tenant_id = NEW.tenant_id;
    
    -- Award signup bonus if configured
    IF v_signup_bonus IS NOT NULL AND v_signup_bonus > 0 THEN
        INSERT INTO loyalty_transactions (
            tenant_id,
            user_id,
            points_change,
            balance_after,
            reason,
            description
        ) VALUES (
            NEW.tenant_id,
            NEW.user_id,
            v_signup_bonus,
            v_signup_bonus,
            'signup_bonus',
            'Welcome bonus for joining!'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_award_signup_bonus
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION award_signup_bonus();

-- =====================================================
-- FUNCTION: Increment coupon usage
-- =====================================================

CREATE OR REPLACE FUNCTION increment_coupon_usage()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE coupons
    SET current_uses = current_uses + 1
    WHERE coupon_id = NEW.coupon_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_coupon_usage
    AFTER INSERT ON coupon_usage
    FOR EACH ROW
    EXECUTE FUNCTION increment_coupon_usage();

-- =====================================================
-- FUNCTION: Validate coupon
-- =====================================================

CREATE OR REPLACE FUNCTION validate_coupon(
    p_tenant_id UUID,
    p_code TEXT,
    p_order_total DECIMAL,
    p_user_id UUID DEFAULT NULL
)
RETURNS TABLE(
    valid BOOLEAN,
    discount_amount DECIMAL,
    error_message TEXT,
    coupon_id UUID,
    discount_type discount_type,
    discount_value DECIMAL
) AS $$
DECLARE
    v_coupon RECORD;
BEGIN
    -- Find coupon
    SELECT * INTO v_coupon
    FROM coupons
    WHERE tenant_id = p_tenant_id
    AND code = p_code;
    
    -- Coupon not found
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 0::DECIMAL, 'Coupon code not found', NULL::UUID, NULL::discount_type, NULL::DECIMAL;
        RETURN;
    END IF;
    
    -- Check if active
    IF NOT v_coupon.is_active THEN
        RETURN QUERY SELECT false, 0::DECIMAL, 'This coupon is no longer active', NULL::UUID, NULL::discount_type, NULL::DECIMAL;
        RETURN;
    END IF;
    
    -- Check date validity
    IF v_coupon.valid_from > NOW() THEN
        RETURN QUERY SELECT false, 0::DECIMAL, 'This coupon is not yet valid', NULL::UUID, NULL::discount_type, NULL::DECIMAL;
        RETURN;
    END IF;
    
    IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < NOW() THEN
        RETURN QUERY SELECT false, 0::DECIMAL, 'This coupon has expired', NULL::UUID, NULL::discount_type, NULL::DECIMAL;
        RETURN;
    END IF;
    
    -- Check usage limit
    IF v_coupon.max_uses IS NOT NULL AND v_coupon.current_uses >= v_coupon.max_uses THEN
        RETURN QUERY SELECT false, 0::DECIMAL, 'This coupon has reached its usage limit', NULL::UUID, NULL::discount_type, NULL::DECIMAL;
        RETURN;
    END IF;
    
    -- Check minimum order amount
    IF p_order_total < v_coupon.min_order_amount THEN
        RETURN QUERY SELECT 
            false, 
            0::DECIMAL, 
            'Minimum order amount of ' || v_coupon.min_order_amount || ' required',
            NULL::UUID,
            NULL::discount_type,
            NULL::DECIMAL;
        RETURN;
    END IF;
    
    -- Calculate discount
    DECLARE
        v_discount DECIMAL;
    BEGIN
        CASE v_coupon.discount_type
            WHEN 'percentage' THEN
                v_discount := p_order_total * (v_coupon.discount_value / 100);
            WHEN 'fixed_amount' THEN
                v_discount := LEAST(v_coupon.discount_value, p_order_total);
            ELSE
                v_discount := 0;
        END CASE;
        
        -- Return valid coupon
        RETURN QUERY SELECT 
            true,
            v_discount,
            NULL::TEXT,
            v_coupon.coupon_id,
            v_coupon.discount_type,
            v_coupon.discount_value;
    END;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Get sales analytics
-- =====================================================

CREATE OR REPLACE FUNCTION get_sales_analytics(
    p_tenant_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    WITH stats AS (
        SELECT
            COUNT(*) as total_orders,
            COUNT(DISTINCT user_id) as unique_customers,
            SUM(total) as total_revenue,
            AVG(total) as average_order_value,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
            SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders,
            SUM(points_earned) as total_points_awarded
        FROM orders
        WHERE tenant_id = p_tenant_id
        AND created_at BETWEEN p_start_date AND p_end_date
    ),
    daily_revenue AS (
        SELECT
            DATE(created_at) as date,
            SUM(total) as revenue,
            COUNT(*) as orders
        FROM orders
        WHERE tenant_id = p_tenant_id
        AND created_at BETWEEN p_start_date AND p_end_date
        AND status = 'completed'
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at)
    ),
    top_items AS (
        SELECT
            mi.name,
            mi.image_url,
            SUM(oi.quantity) as total_quantity,
            SUM(oi.subtotal) as total_revenue
        FROM order_items oi
        JOIN orders o ON o.order_id = oi.order_id
        LEFT JOIN menu_items mi ON mi.item_id = oi.item_id
        WHERE o.tenant_id = p_tenant_id
        AND o.created_at BETWEEN p_start_date AND p_end_date
        AND o.status = 'completed'
        GROUP BY mi.item_id, mi.name, mi.image_url
        ORDER BY total_quantity DESC
        LIMIT 10
    )
    SELECT json_build_object(
        'summary', (SELECT row_to_json(s) FROM stats s),
        'daily_revenue', (SELECT json_agg(d) FROM daily_revenue d),
        'top_items', (SELECT json_agg(t) FROM top_items t)
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Get customer analytics
-- =====================================================

CREATE OR REPLACE FUNCTION get_customer_analytics(
    p_tenant_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    WITH new_customers AS (
        SELECT COUNT(*) as count
        FROM users
        WHERE tenant_id = p_tenant_id
        AND created_at BETWEEN p_start_date AND p_end_date
    ),
    active_customers AS (
        SELECT COUNT(DISTINCT user_id) as count
        FROM orders
        WHERE tenant_id = p_tenant_id
        AND created_at BETWEEN p_start_date AND p_end_date
    ),
    tier_distribution AS (
        SELECT
            loyalty_tier,
            COUNT(*) as count
        FROM users
        WHERE tenant_id = p_tenant_id
        GROUP BY loyalty_tier
    ),
    top_customers AS (
        SELECT
            u.full_name,
            u.email,
            u.loyalty_tier,
            u.total_orders,
            u.total_spent,
            u.loyalty_points
        FROM users u
        WHERE u.tenant_id = p_tenant_id
        ORDER BY u.total_spent DESC
        LIMIT 20
    )
    SELECT json_build_object(
        'new_customers', (SELECT count FROM new_customers),
        'active_customers', (SELECT count FROM active_customers),
        'tier_distribution', (SELECT json_agg(td) FROM tier_distribution td),
        'top_customers', (SELECT json_agg(tc) FROM top_customers tc)
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Get loyalty analytics
-- =====================================================

CREATE OR REPLACE FUNCTION get_loyalty_analytics(
    p_tenant_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    WITH points_summary AS (
        SELECT
            SUM(CASE WHEN points_change > 0 THEN points_change ELSE 0 END) as total_earned,
            SUM(CASE WHEN points_change < 0 THEN ABS(points_change) ELSE 0 END) as total_redeemed,
            COUNT(DISTINCT user_id) as active_users
        FROM loyalty_transactions
        WHERE tenant_id = p_tenant_id
        AND created_at BETWEEN p_start_date AND p_end_date
    ),
    redemption_reasons AS (
        SELECT
            reason,
            COUNT(*) as count,
            SUM(ABS(points_change)) as points
        FROM loyalty_transactions
        WHERE tenant_id = p_tenant_id
        AND created_at BETWEEN p_start_date AND p_end_date
        AND points_change < 0
        GROUP BY reason
    )
    SELECT json_build_object(
        'summary', (SELECT row_to_json(ps) FROM points_summary ps),
        'redemption_reasons', (SELECT json_agg(rr) FROM redemption_reasons rr)
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION generate_order_number IS 
    'Generates unique order number in format #YYYYMMDD-XXXX';

COMMENT ON FUNCTION calculate_loyalty_points IS 
    'Calculates loyalty points based on order total and tenant config';

COMMENT ON FUNCTION calculate_loyalty_tier IS 
    'Determines loyalty tier based on lifetime points';

COMMENT ON FUNCTION validate_coupon IS 
    'Validates coupon code and calculates discount';

COMMENT ON FUNCTION get_sales_analytics IS 
    'Returns comprehensive sales analytics for date range';

COMMENT ON FUNCTION get_customer_analytics IS 
    'Returns customer analytics including new customers, tiers, and top spenders';

COMMENT ON FUNCTION get_loyalty_analytics IS 
    'Returns loyalty program analytics including points earned and redeemed';
