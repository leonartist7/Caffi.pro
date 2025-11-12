-- CAFFI.PRO - Database Functions
-- Module 1: Business logic functions for orders, loyalty, analytics
-- Created: 2025-01-XX

-- ============================================================================
-- ORDER MANAGEMENT FUNCTIONS
-- ============================================================================

-- Generate unique order number per tenant
CREATE OR REPLACE FUNCTION generate_order_number(p_tenant_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_order_number TEXT;
    v_last_number INTEGER;
BEGIN
    -- Get the last order number for this tenant
    SELECT COALESCE(
        MAX(CAST(REPLACE(order_number, '#', '') AS INTEGER)),
        0
    ) INTO v_last_number
    FROM orders
    WHERE tenant_id = p_tenant_id;
    
    -- Increment and format
    v_order_number := '#' || LPAD((v_last_number + 1)::TEXT, 4, '0');
    
    RETURN v_order_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate order number
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
        NEW.order_number := generate_order_number(NEW.tenant_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_order_number
    BEFORE INSERT ON orders
    FOR EACH ROW
    WHEN (NEW.order_number IS NULL OR NEW.order_number = '')
    EXECUTE FUNCTION set_order_number();

-- ============================================================================
-- LOYALTY SYSTEM FUNCTIONS
-- ============================================================================

-- Calculate loyalty points for an order
CREATE OR REPLACE FUNCTION calculate_loyalty_points(
    p_order_total DECIMAL,
    p_tenant_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    v_points_per_euro INTEGER;
BEGIN
    -- Get points per euro from tenant config
    SELECT (loyalty_config->>'points_per_euro')::INTEGER
    INTO v_points_per_euro
    FROM tenants
    WHERE tenant_id = p_tenant_id;
    
    -- Default to 10 if not set
    IF v_points_per_euro IS NULL THEN
        v_points_per_euro := 10;
    END IF;
    
    -- Calculate points (round down)
    RETURN FLOOR(p_order_total * v_points_per_euro);
END;
$$ LANGUAGE plpgsql;

-- Update user loyalty points after transaction
CREATE OR REPLACE FUNCTION update_user_loyalty()
RETURNS TRIGGER AS $$
DECLARE
    v_new_balance INTEGER;
BEGIN
    -- Update user's loyalty_points
    UPDATE users
    SET loyalty_points = NEW.balance_after,
        lifetime_points = lifetime_points + ABS(NEW.points_change)
    WHERE user_id = NEW.user_id;
    
    -- Recalculate tier
    PERFORM calculate_loyalty_tier(NEW.user_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_loyalty
    AFTER INSERT ON loyalty_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_loyalty();

-- Calculate loyalty tier based on lifetime points
CREATE OR REPLACE FUNCTION calculate_loyalty_tier(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_user_record RECORD;
    v_tenant_record RECORD;
    v_tiers JSONB;
    v_current_tier TEXT;
    v_new_tier TEXT;
BEGIN
    -- Get user and tenant data
    SELECT u.*, t.loyalty_config
    INTO v_user_record, v_tenant_record
    FROM users u
    JOIN tenants t ON u.tenant_id = t.tenant_id
    WHERE u.user_id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    
    v_current_tier := v_user_record.loyalty_tier;
    v_tiers := v_tenant_record.loyalty_config->'tiers';
    
    -- Default tiers if not configured
    IF v_tiers IS NULL OR jsonb_array_length(v_tiers) = 0 THEN
        IF v_user_record.lifetime_points >= 1000 THEN
            v_new_tier := 'platinum';
        ELSIF v_user_record.lifetime_points >= 500 THEN
            v_new_tier := 'gold';
        ELSIF v_user_record.lifetime_points >= 200 THEN
            v_new_tier := 'silver';
        ELSE
            v_new_tier := 'bronze';
        END IF;
    ELSE
        -- Use configured tiers (would need more complex logic)
        -- For now, use default
        IF v_user_record.lifetime_points >= 1000 THEN
            v_new_tier := 'platinum';
        ELSIF v_user_record.lifetime_points >= 500 THEN
            v_new_tier := 'gold';
        ELSIF v_user_record.lifetime_points >= 200 THEN
            v_new_tier := 'silver';
        ELSE
            v_new_tier := 'bronze';
        END IF;
    END IF;
    
    -- Update tier if changed
    IF v_new_tier != v_current_tier THEN
        UPDATE users
        SET loyalty_tier = v_new_tier
        WHERE user_id = p_user_id;
        
        -- TODO: Send notification about tier upgrade
    END IF;
    
    RETURN v_new_tier;
END;
$$ LANGUAGE plpgsql;

-- Award signup bonus points
CREATE OR REPLACE FUNCTION award_signup_bonus(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_tenant_id UUID;
    v_signup_bonus INTEGER;
    v_new_balance INTEGER;
BEGIN
    -- Get tenant_id and signup bonus
    SELECT u.tenant_id, COALESCE(
        (t.loyalty_config->>'signup_bonus')::INTEGER,
        50
    )
    INTO v_tenant_id, v_signup_bonus
    FROM users u
    JOIN tenants t ON u.tenant_id = t.tenant_id
    WHERE u.user_id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- Get current balance
    SELECT loyalty_points INTO v_new_balance
    FROM users
    WHERE user_id = p_user_id;
    
    v_new_balance := v_new_balance + v_signup_bonus;
    
    -- Create transaction record
    INSERT INTO loyalty_transactions (
        tenant_id,
        user_id,
        points_change,
        balance_after,
        reason,
        description
    ) VALUES (
        v_tenant_id,
        p_user_id,
        v_signup_bonus,
        v_new_balance,
        'signup_bonus',
        'Welcome bonus points'
    );
    
    RETURN v_signup_bonus;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ORDER STATISTICS FUNCTIONS
-- ============================================================================

-- Update order statistics when order status changes
CREATE OR REPLACE FUNCTION update_order_stats()
RETURNS TRIGGER AS $$
DECLARE
    v_user_record RECORD;
BEGIN
    -- If order is completed, update user stats
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        -- Update user statistics
        UPDATE users
        SET 
            total_orders = total_orders + 1,
            total_spent = total_spent + NEW.total,
            last_order_at = NEW.completed_at
        WHERE user_id = NEW.user_id;
        
        -- Award loyalty points if not already awarded
        IF NEW.points_earned = 0 THEN
            UPDATE orders
            SET points_earned = calculate_loyalty_points(NEW.total, NEW.tenant_id)
            WHERE order_id = NEW.order_id;
            
            -- Create loyalty transaction
            INSERT INTO loyalty_transactions (
                tenant_id,
                user_id,
                order_id,
                points_change,
                balance_after,
                reason,
                description
            )
            SELECT 
                NEW.tenant_id,
                NEW.user_id,
                NEW.order_id,
                calculate_loyalty_points(NEW.total, NEW.tenant_id),
                loyalty_points + calculate_loyalty_points(NEW.total, NEW.tenant_id),
                'order',
                'Points earned from order ' || NEW.order_number
            FROM users
            WHERE user_id = NEW.user_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_order_stats
    AFTER UPDATE OF status ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_order_stats();

-- ============================================================================
-- ANALYTICS FUNCTIONS
-- ============================================================================

-- Get sales analytics for a tenant
CREATE OR REPLACE FUNCTION get_sales_analytics(
    p_tenant_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_revenue', COALESCE(SUM(total), 0),
        'total_orders', COUNT(*),
        'average_order_value', COALESCE(AVG(total), 0),
        'total_items_sold', COALESCE(SUM(
            (SELECT SUM(quantity) FROM order_items WHERE order_id = orders.order_id)
        ), 0),
        'completed_orders', COUNT(*) FILTER (WHERE status = 'completed'),
        'cancelled_orders', COUNT(*) FILTER (WHERE status = 'cancelled'),
        'revenue_by_status', jsonb_object_agg(
            status,
            COALESCE(SUM(total), 0)
        ) FILTER (WHERE status IS NOT NULL),
        'revenue_by_day', (
            SELECT jsonb_object_agg(
                DATE(created_at)::TEXT,
                SUM(total)
            )
            FROM orders
            WHERE tenant_id = p_tenant_id
            AND created_at >= p_start_date
            AND created_at <= p_end_date
            GROUP BY DATE(created_at)
        )
    )
    INTO v_result
    FROM orders
    WHERE tenant_id = p_tenant_id
    AND created_at >= p_start_date
    AND created_at <= p_end_date;
    
    RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Get top menu items
CREATE OR REPLACE FUNCTION get_top_menu_items(
    p_tenant_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    item_id UUID,
    item_name TEXT,
    total_quantity INTEGER,
    total_revenue DECIMAL,
    order_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mi.item_id,
        mi.name AS item_name,
        SUM(oi.quantity)::INTEGER AS total_quantity,
        SUM(oi.subtotal) AS total_revenue,
        COUNT(DISTINCT oi.order_id)::INTEGER AS order_count
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.order_id
    JOIN menu_items mi ON oi.item_id = mi.item_id
    WHERE o.tenant_id = p_tenant_id
    AND o.created_at >= p_start_date
    AND o.created_at <= p_end_date
    AND o.status != 'cancelled'
    GROUP BY mi.item_id, mi.name
    ORDER BY total_quantity DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COUPON VALIDATION FUNCTION
-- ============================================================================

-- Validate coupon code
CREATE OR REPLACE FUNCTION validate_coupon(
    p_tenant_id UUID,
    p_code TEXT,
    p_order_total DECIMAL
)
RETURNS JSONB AS $$
DECLARE
    v_coupon RECORD;
    v_discount DECIMAL;
    v_result JSONB;
BEGIN
    -- Find coupon
    SELECT *
    INTO v_coupon
    FROM coupons
    WHERE tenant_id = p_tenant_id
    AND code = UPPER(p_code)
    AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'Coupon not found'
        );
    END IF;
    
    -- Check validity dates
    IF v_coupon.valid_from > NOW() THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'Coupon not yet valid'
        );
    END IF;
    
    IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < NOW() THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'Coupon has expired'
        );
    END IF;
    
    -- Check usage limit
    IF v_coupon.max_uses IS NOT NULL AND v_coupon.current_uses >= v_coupon.max_uses THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'Coupon usage limit reached'
        );
    END IF;
    
    -- Check minimum order amount
    IF p_order_total < v_coupon.min_order_amount THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'Minimum order amount not met',
            'min_amount', v_coupon.min_order_amount
        );
    END IF;
    
    -- Calculate discount
    IF v_coupon.discount_type = 'percentage' THEN
        v_discount := (p_order_total * v_coupon.discount_value / 100);
    ELSIF v_coupon.discount_type = 'fixed_amount' THEN
        v_discount := LEAST(v_coupon.discount_value, p_order_total);
    ELSE
        v_discount := 0;
    END IF;
    
    RETURN jsonb_build_object(
        'valid', true,
        'discount_amount', v_discount,
        'discount_type', v_coupon.discount_type,
        'coupon_id', v_coupon.coupon_id
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Set tenant context (for admin operations)
CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id UUID)
RETURNS VOID AS $$
BEGIN
    -- This would be used in application code to set JWT claims
    -- For database functions, we use the JWT directly
    -- This is a placeholder for documentation
    RAISE NOTICE 'Tenant context: %', p_tenant_id;
END;
$$ LANGUAGE plpgsql;
