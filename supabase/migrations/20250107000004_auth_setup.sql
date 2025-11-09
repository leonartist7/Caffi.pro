-- =====================================================
-- CAFFI.PRO - AUTHENTICATION SETUP
-- Custom JWT claims and auth hooks
-- =====================================================

-- =====================================================
-- FUNCTION: Custom access token hook
-- Adds tenant_id and role to JWT claims
-- =====================================================

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    claims jsonb;
    user_tenant_id uuid;
    user_role text;
    user_metadata jsonb;
BEGIN
    -- Get the user's metadata
    user_metadata := event->'claims'->'app_metadata';
    
    -- Extract existing claims
    claims := event->'claims';
    
    -- Check if user is super admin (set in app_metadata)
    user_role := user_metadata->>'role';
    
    IF user_role = 'super_admin' THEN
        -- Super admin doesn't need tenant_id
        claims := jsonb_set(claims, '{role}', to_jsonb('super_admin'));
    ELSE
        -- Get tenant_id from users table (for customers)
        SELECT u.tenant_id INTO user_tenant_id
        FROM public.users u
        WHERE u.auth_id = (event->'claims'->>'sub')::uuid;
        
        -- If not found in users table, check if it's a tenant owner
        IF user_tenant_id IS NULL THEN
            SELECT t.tenant_id INTO user_tenant_id
            FROM public.tenants t
            WHERE t.owner_email = event->'claims'->>'email';
            
            IF user_tenant_id IS NOT NULL THEN
                user_role := 'tenant_owner';
            END IF;
        ELSE
            user_role := 'customer';
        END IF;
        
        -- Add tenant_id and role to claims
        IF user_tenant_id IS NOT NULL THEN
            claims := jsonb_set(claims, '{tenant_id}', to_jsonb(user_tenant_id::text));
            claims := jsonb_set(claims, '{role}', to_jsonb(user_role));
        END IF;
    END IF;
    
    -- Update the event
    event := jsonb_set(event, '{claims}', claims);
    
    RETURN event;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- =====================================================
-- FUNCTION: Handle new user signup
-- Creates user record in public.users table
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    user_tenant_id uuid;
    user_phone text;
    user_email text;
BEGIN
    -- Extract phone or email from user metadata
    user_phone := NEW.raw_user_meta_data->>'phone';
    user_email := NEW.email;
    
    -- Get tenant_id from metadata (set during signup)
    user_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::uuid;
    
    -- Only create user record if tenant_id is provided (not for admins)
    IF user_tenant_id IS NOT NULL THEN
        INSERT INTO public.users (
            auth_id,
            tenant_id,
            phone,
            email,
            full_name
        ) VALUES (
            NEW.id,
            user_tenant_id,
            user_phone,
            user_email,
            COALESCE(NEW.raw_user_meta_data->>'full_name', 'New Customer')
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for new user signups
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- FUNCTION: Link existing user to auth
-- Updates user record when auth is created
-- =====================================================

CREATE OR REPLACE FUNCTION public.link_user_to_auth(
    p_tenant_id uuid,
    p_phone text,
    p_auth_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.users
    SET auth_id = p_auth_id
    WHERE tenant_id = p_tenant_id
    AND phone = p_phone
    AND auth_id IS NULL;
END;
$$;

-- =====================================================
-- TABLE: Super Admin Users
-- Separate table for platform administrators
-- =====================================================

CREATE TABLE IF NOT EXISTS public.super_admins (
    admin_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id UUID UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- Super admins can view all super admins
CREATE POLICY "Super admins can view super admins"
    ON public.super_admins FOR SELECT
    USING (public.is_super_admin());

-- Super admins can view their own record
CREATE POLICY "Super admins can view themselves"
    ON public.super_admins FOR SELECT
    USING (auth_id = auth.uid());

-- Index
CREATE INDEX idx_super_admins_auth_id ON public.super_admins(auth_id);
CREATE INDEX idx_super_admins_email ON public.super_admins(email);

-- Trigger for updated_at
CREATE TRIGGER update_super_admins_updated_at 
    BEFORE UPDATE ON public.super_admins
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED: Create initial super admin
-- =====================================================

-- Note: This will be created manually via Supabase Auth UI
-- Then we link it here. Example:
-- INSERT INTO public.super_admins (auth_id, email, full_name)
-- VALUES ('<auth_uuid>', 'admin@caffi.pro', 'Admin User');

-- =====================================================
-- HELPER FUNCTION: Create super admin
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_super_admin(
    p_email text,
    p_full_name text,
    p_password text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_admin_id uuid;
BEGIN
    -- This function should be called from Edge Function with Supabase Admin API
    -- For now, it's a placeholder
    -- Actual implementation requires Supabase Admin SDK
    
    RAISE EXCEPTION 'Use Supabase Admin SDK to create super admin users';
END;
$$;

-- =====================================================
-- FUNCTION: Update last login
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_last_login()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update super_admins last login
    UPDATE public.super_admins
    SET last_login_at = NOW()
    WHERE auth_id = NEW.id
    AND EXISTS (SELECT 1 FROM public.super_admins WHERE auth_id = NEW.id);
    
    RETURN NEW;
END;
$$;

-- Note: This trigger would go on auth.sessions if we had access
-- For now, we'll handle this in the application layer

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION public.custom_access_token_hook IS 
    'Adds tenant_id and role to JWT claims for RLS';

COMMENT ON FUNCTION public.handle_new_user IS 
    'Automatically creates user record when customer signs up';

COMMENT ON TABLE public.super_admins IS 
    'Platform administrators (Caffi.pro team)';

COMMENT ON FUNCTION public.link_user_to_auth IS 
    'Links existing user record to auth.users after OTP verification';
