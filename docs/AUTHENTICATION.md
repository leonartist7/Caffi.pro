# Caffi.pro - Authentication Guide

## Overview

Caffi.pro uses **three separate authentication flows** for different user types:

1. **Super Admin** (Caffi.pro team) - Email + Password
2. **Tenant Owners** (Café owners) - Email + Password  
3. **Customers** (Mobile app users) - Phone OTP or Email Magic Link

All authentication is handled by Supabase Auth with custom JWT claims for multi-tenancy.

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│            Supabase Auth (auth.users)           │
│                                                 │
│  All users stored here with metadata            │
└─────────────────────────────────────────────────┘
                    ↓
        ┌───────────┴───────────┐
        ↓                       ↓
┌───────────────┐      ┌────────────────┐
│ super_admins  │      │  public.users  │
│ (platform)    │      │  (customers)   │
└───────────────┘      └────────────────┘
                               ↓
                    ┌──────────┴─────────┐
                    ↓                    ↓
              ┌──────────┐         ┌──────────┐
              │ Tenant A │         │ Tenant B │
              │ Data     │         │ Data     │
              └──────────┘         └──────────┘
```

### JWT Token Structure

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "customer",  // or "tenant_owner" or "super_admin"
  "tenant_id": "tenant-uuid",  // only for non-super-admin users
  "iat": 1234567890,
  "exp": 1234571490
}
```

---

## Authentication Flows

### 1. Super Admin Authentication

**Used by:** Caffi.pro team to manage platform

**Flow:**
1. Admin enters email + password on admin.caffi.pro
2. Supabase Auth validates credentials
3. Custom JWT hook checks `app_metadata.role === 'super_admin'`
4. JWT includes `role: 'super_admin'` (no tenant_id)
5. RLS policies grant access to all data

**Implementation:**

```typescript
// admin-dashboard/lib/auth.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function signInSuperAdmin(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  if (error) throw error
  
  // Verify user is super admin
  const { data: adminData } = await supabase
    .from('super_admins')
    .select('*')
    .eq('auth_id', data.user.id)
    .single()
  
  if (!adminData) {
    await supabase.auth.signOut()
    throw new Error('Not authorized as super admin')
  }
  
  return data
}
```

**Creating Super Admins:**

```sql
-- Step 1: Create auth user via Supabase Dashboard
-- Go to Authentication > Users > Add User

-- Step 2: Add to super_admins table
INSERT INTO public.super_admins (auth_id, email, full_name)
VALUES (
    '<auth_user_id>',
    'admin@caffi.pro',
    'Admin Name'
);

-- Step 3: Set role in auth metadata
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "super_admin"}'::jsonb
WHERE id = '<auth_user_id>';
```

---

### 2. Tenant Owner Authentication

**Used by:** Café owners to access client dashboard

**Flow:**
1. Owner enters email + password on dashboard.caffi.pro
2. Supabase Auth validates credentials
3. Custom JWT hook finds tenant by owner_email
4. JWT includes `tenant_id` and `role: 'tenant_owner'`
5. RLS policies filter data by tenant_id

**Implementation:**

```typescript
// client-dashboard/lib/auth.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function signInTenantOwner(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  if (error) throw error
  
  // Verify user owns a tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('owner_email', email)
    .single()
  
  if (!tenant) {
    await supabase.auth.signOut()
    throw new Error('No tenant found for this email')
  }
  
  return { user: data.user, tenant }
}

export async function signUpTenantOwner(
  email: string,
  password: string,
  tenantData: any
) {
  // First create the tenant
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({
      business_name: tenantData.businessName,
      slug: tenantData.slug,
      owner_email: email,
      owner_phone: tenantData.phone,
      app_name: tenantData.appName,
      bundle_id: `com.${tenantData.slug}.app`,
    })
    .select()
    .single()
  
  if (tenantError) throw tenantError
  
  // Then create auth user
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        tenant_id: tenant.tenant_id,
        full_name: tenantData.ownerName,
      }
    }
  })
  
  if (error) throw error
  
  return { user: data.user, tenant }
}
```

**Password Reset:**

```typescript
export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://dashboard.caffi.pro/reset-password',
  })
  
  if (error) throw error
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  })
  
  if (error) throw error
}
```

---

### 3. Customer Authentication (Mobile)

**Used by:** Coffee shop customers via mobile app

**Flow:**
1. Customer enters phone number
2. Supabase sends OTP via Twilio
3. Customer enters OTP code
4. If first-time: Create user record with signup bonus
5. JWT includes `tenant_id` and `role: 'customer'`
6. RLS policies filter data by tenant_id

**Implementation:**

```typescript
// mobile/lib/auth.ts (for FlutterFlow or React Native)
import { createClient } from '@supabase/supabase-js'

const TENANT_ID = 'your-tenant-id' // Set per app build

export const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_ANON_KEY'
)

export async function signInWithPhone(phone: string) {
  // Step 1: Send OTP
  const { error } = await supabase.auth.signInWithOtp({
    phone,
    options: {
      data: {
        tenant_id: TENANT_ID,
      }
    }
  })
  
  if (error) throw error
  
  return { success: true }
}

export async function verifyOTP(phone: string, token: string) {
  // Step 2: Verify OTP
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: 'sms',
  })
  
  if (error) throw error
  
  // Check if user exists
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', data.user!.id)
    .single()
  
  return { user: data.user, profile: user }
}

export async function signInWithEmail(email: string) {
  // Magic link authentication
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      data: {
        tenant_id: TENANT_ID,
      }
    }
  })
  
  if (error) throw error
  
  return { success: true }
}
```

**Flutter/FlutterFlow Integration:**

In FlutterFlow:
1. Go to **Settings > Supabase**
2. Enter Supabase URL and Anon Key
3. Enable **Phone Auth**
4. Use built-in auth widgets:
   - Phone Sign In
   - OTP Verification
   - Auth Guard (protect pages)

---

## Custom JWT Hook Details

The `custom_access_token_hook` function runs on every login and token refresh.

```sql
-- Located in: supabase/migrations/20250107000004_auth_setup.sql

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb AS $$
DECLARE
    claims jsonb;
    user_tenant_id uuid;
    user_role text;
BEGIN
    claims := event->'claims';
    
    -- Check if super admin
    IF (event->'claims'->'app_metadata'->>'role') = 'super_admin' THEN
        claims := jsonb_set(claims, '{role}', to_jsonb('super_admin'));
    ELSE
        -- Get tenant_id from users table
        SELECT u.tenant_id INTO user_tenant_id
        FROM public.users u
        WHERE u.auth_id = (event->'claims'->>'sub')::uuid;
        
        -- If not found, check if tenant owner
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
        
        -- Add to claims
        IF user_tenant_id IS NOT NULL THEN
            claims := jsonb_set(claims, '{tenant_id}', to_jsonb(user_tenant_id::text));
            claims := jsonb_set(claims, '{role}', to_jsonb(user_role));
        END IF;
    END IF;
    
    event := jsonb_set(event, '{claims}', claims);
    RETURN event;
END;
$$ LANGUAGE plpgsql;
```

---

## Row-Level Security (RLS)

### How RLS Uses JWT Claims

```sql
-- Helper function to get tenant_id from JWT
CREATE OR REPLACE FUNCTION auth.user_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(
        current_setting('request.jwt.claims', true)::json->>'tenant_id',
        ''
    )::uuid;
END;
$$ LANGUAGE plpgsql;

-- Example policy
CREATE POLICY "Tenant can view their own orders"
    ON orders FOR SELECT
    USING (tenant_id = auth.user_tenant_id());
```

### Testing RLS

```typescript
// Test as different users
const { data: orders } = await supabase
  .from('orders')
  .select('*')

// Returns only orders for authenticated user's tenant
// Super admin sees all orders
```

---

## Session Management

### Token Refresh

Supabase automatically refreshes tokens when they expire (1 hour default).

```typescript
// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    console.log('User signed in:', session.user)
  }
  if (event === 'SIGNED_OUT') {
    console.log('User signed out')
  }
  if (event === 'TOKEN_REFRESHED') {
    console.log('Token refreshed:', session.access_token)
  }
})
```

### Logout

```typescript
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
```

---

## Security Best Practices

### 1. Never Expose Service Role Key
- ❌ Don't use in client-side code
- ✅ Only use in Edge Functions and server-side code

### 2. Validate Tenant Context
```typescript
// Always verify tenant_id matches expected tenant
const { data } = await supabase.auth.getUser()
const tenantId = data.user?.user_metadata?.tenant_id

if (tenantId !== EXPECTED_TENANT_ID) {
  throw new Error('Invalid tenant context')
}
```

### 3. Use MFA for Super Admins
```typescript
// Enable MFA for super admin
const { data, error } = await supabase.auth.mfa.enroll({
  factorType: 'totp',
})

// Verify MFA
const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
  factorId: data.id,
  code: '123456',
})
```

### 4. Rate Limiting
Configure in Supabase Dashboard:
- **Auth > Settings > Rate Limits**
- Set limits for:
  - Sign ups: 10/hour per IP
  - OTP requests: 5/hour per phone
  - Password resets: 3/hour per email

---

## Troubleshooting

### JWT doesn't include tenant_id

**Cause:** Custom access token hook not enabled or not working

**Solution:**
1. Check hook is enabled in Dashboard
2. Test hook directly:
```sql
SELECT public.custom_access_token_hook(
  '{"claims": {"sub": "test-user-id", "email": "test@example.com"}}'::jsonb
);
```

### RLS blocking queries

**Cause:** User doesn't have proper tenant_id in JWT

**Solution:**
1. Decode JWT at https://jwt.io
2. Verify `tenant_id` claim exists
3. Check RLS policies match JWT structure

### Phone OTP not sending

**Cause:** Twilio not configured or phone format incorrect

**Solution:**
1. Verify Twilio credentials in Dashboard
2. Check phone format: `+33612345678` (include country code)
3. Check Twilio account balance

---

## Testing Authentication

### Test Script

```typescript
// test-auth.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient('YOUR_URL', 'YOUR_KEY')

async function testAuth() {
  console.log('Testing authentication flows...\n')
  
  // Test 1: Sign up customer
  console.log('1. Testing customer signup...')
  const { data: signupData, error: signupError } = await supabase.auth.signUp({
    phone: '+33612345678',
    password: 'test123456',
    options: {
      data: {
        tenant_id: 'test-tenant-id',
        full_name: 'Test User'
      }
    }
  })
  console.log(signupData ? '✅ Signup successful' : '❌ Signup failed:', signupError)
  
  // Test 2: Sign in tenant owner
  console.log('\n2. Testing tenant owner login...')
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email: 'owner@test.com',
    password: 'password123'
  })
  console.log(loginData ? '✅ Login successful' : '❌ Login failed:', loginError)
  
  // Test 3: Get user session
  console.log('\n3. Testing session...')
  const { data: { session } } = await supabase.auth.getSession()
  console.log('Session:', session)
  
  // Test 4: Verify JWT claims
  console.log('\n4. JWT Claims:')
  console.log('- tenant_id:', session?.user.user_metadata?.tenant_id)
  console.log('- role:', session?.user.user_metadata?.role)
}

testAuth()
```

---

## Next Steps

1. ✅ Database and Auth configured
2. → Build Admin Dashboard with Super Admin login
3. → Build Client Dashboard with Tenant Owner login
4. → Build Mobile App with Phone OTP
5. → Deploy and test end-to-end

---

**Questions? Check the [Setup Guide](./SETUP.md) or [Main Specification](./SPECIFICATION.md)**
