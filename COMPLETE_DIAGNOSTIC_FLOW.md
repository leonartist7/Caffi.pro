# 🔍 Complete Diagnostic: Why "Coffee Shop Not Found"?

## The Real Question

You're right to ask - maybe the shop page was never properly created! Let's verify step by step.

---

## 🎯 Diagnostic Steps (Do These in Order)

### Step 1: Check if Tenant Exists in Database

**Go to Supabase Dashboard → SQL Editor, run:**

```sql
-- Check if ANY tenants exist with slugs
SELECT
    tenant_id,
    business_name,
    slug,
    created_at,
    CASE
        WHEN slug IS NULL THEN '❌ NO SLUG'
        WHEN slug = '' THEN '❌ EMPTY SLUG'
        ELSE '✅ HAS SLUG: ' || slug
    END as slug_status
FROM tenants
ORDER BY created_at DESC
LIMIT 5;
```

**What to look for:**

- Do you see your recently created client?
- Does it have a slug?
- What is the exact slug value?

📝 **Write down the slug value here: ********\_**********

---

### Step 2: Try to Create a Brand New Client

**In Admin Dashboard:**

1. Go to **Clients** page
2. Click **"Create Client"**
3. Fill in:
   - Business Name: `Test Coffee Shop`
   - Slug: `test-coffee-shop`
   - Contact Email: `test@test.com`
   - Logo URL: (leave blank for now)
   - Primary Color: `#6b3410`
4. Click **"Save"**

**Expected behaviors:**

**If it succeeds:**

- ✅ Toast: "Client created successfully!"
- ✅ Modal closes
- ✅ New client appears in list
- ✅ Client is auto-selected in dropdown

**If it fails:**

- ❌ Error: "Failed to save client: Failed to create manifest: Could not find the 'design_tokens' column"
  - **Cause:** Schema cache not refreshed yet
  - **Fix:** Run `NOTIFY pgrst, 'reload schema';` in SQL Editor
  - **Wait 30 seconds, try again**

- ❌ Error: "Slug is already taken"
  - **Cause:** Client already exists
  - **Fix:** Use a different slug like `test-coffee-shop-2`

---

### Step 3: Verify Tenant Saved to Database

**After successful client creation, run in SQL Editor:**

```sql
-- Find the tenant you just created
SELECT
    t.tenant_id,
    t.business_name,
    t.slug,
    t.created_at,
    CASE
        WHEN tm.manifest_id IS NOT NULL THEN '✅ HAS MANIFEST'
        ELSE '❌ NO MANIFEST (ERROR DURING CREATION)'
    END as manifest_status
FROM tenants t
LEFT JOIN tenant_manifests tm ON t.tenant_id = tm.tenant_id
WHERE t.slug = 'test-coffee-shop'  -- or whatever slug you used
ORDER BY t.created_at DESC;
```

**What you should see:**

- ✅ One row with your tenant
- ✅ Manifest status: "✅ HAS MANIFEST"
- ✅ Slug matches what you entered

**If manifest status shows "❌ NO MANIFEST":**

- The tenant was created, but manifest creation failed
- This could cause issues with the shop page
- **Fix:** Manually create the manifest (instructions below)

---

### Step 4: Check What URL "View Shop" Takes You To

**In Admin Dashboard:**

1. Select the client you just created from dropdown (top-right)
2. Go to **Menu** page
3. **Hover over** the "View Shop" button (don't click yet)
4. Look at the URL in the bottom-left corner of your browser

**Expected URL:**

```
https://your-app.vercel.app/shop/test-coffee-shop
```

**Check:**

- ✅ Does the slug match what's in the database?
- ✅ Is there a slug at all (not `/shop/null` or `/shop/undefined`)?

📝 **URL shown: ****************\_******************

---

### Step 5: Click "View Shop" and Check Browser Console

1. **Click "View Shop"**
2. **Immediately open Browser Console** (F12)
3. **Look for these logs:**

**If tenant found (SUCCESS):**

```
(No errors)
Shop page loads with "Welcome to Test Coffee Shop"
```

**If tenant NOT found (FAILURE):**

```
[getTenantBySlug] No tenant found for slug: test-coffee-shop
```

OR

```
[getTenantBySlug] Database error: {
  slug: "test-coffee-shop",
  errorMessage: "...",
  errorCode: "...",
}
```

📝 **What error message do you see: ****************\_******************

---

### Step 6: Manually Test getTenantBySlug Query

**In SQL Editor, run the EXACT query that getTenantBySlug uses:**

```sql
-- This is what the code runs
SELECT
    tenant_id,
    business_name,
    slug,
    custom_domain,
    app_name,
    features_enabled,
    loyalty_config,
    currency,
    timezone
FROM tenants
WHERE slug = 'test-coffee-shop'  -- CHANGE THIS TO YOUR SLUG
LIMIT 1;
```

**Expected result:**

- ✅ One row with your tenant data

**If NO rows:**

- ❌ Tenant doesn't exist in database (creation failed)
- OR slug doesn't match (typo, case sensitivity)

**Then test the manifest query:**

```sql
-- This is what getTenantBySlug runs next
SELECT
    design_tokens,
    logo_url
FROM tenant_manifests
WHERE tenant_id = 'PASTE-TENANT-ID-FROM-ABOVE';
```

**Expected result:**

- ✅ One row with design_tokens (JSON) and logo_url

**If NO rows:**

- ❌ Manifest doesn't exist
- This is the problem!

---

## 🔧 Fix Based on Diagnostic Results

### Scenario A: Tenant exists, manifest exists, but still "not found"

**Likely cause:** URL slug doesn't match database slug

**Fix:**

```sql
-- Check for exact slug match (case-sensitive)
SELECT slug FROM tenants;

-- Update slug if needed
UPDATE tenants
SET slug = 'correct-slug-here'
WHERE tenant_id = 'your-tenant-id';
```

### Scenario B: Tenant exists, but NO manifest

**Likely cause:** Manifest creation failed due to schema cache issue

**Fix - Manually create manifest:**

```sql
-- Replace 'YOUR-TENANT-ID' with actual tenant_id from Step 3
INSERT INTO tenant_manifests (tenant_id, design_tokens, logo_url)
VALUES (
    'YOUR-TENANT-ID',
    '{
        "colors": {
            "primary": "#6b3410",
            "secondary": "#8D4004"
        }
    }'::jsonb,
    NULL
)
ON CONFLICT (tenant_id) DO UPDATE
SET design_tokens = EXCLUDED.design_tokens;
```

### Scenario C: Tenant doesn't exist at all

**Likely cause:** Client creation failed silently

**Fix:**

1. Refresh PostgREST schema cache: `NOTIFY pgrst, 'reload schema';`
2. Wait 30 seconds
3. Try creating client again
4. Check for success toast message

---

## 📊 Report Back With:

Please run through these steps and tell me:

1. ✅ Does tenant exist in database? (Step 1)
2. ✅ Can you create a new client successfully? (Step 2)
3. ✅ Does the tenant have a manifest? (Step 3)
4. ✅ What URL does "View Shop" show? (Step 4)
5. ✅ What error appears in console? (Step 5)
6. ✅ Does the manual SQL query return data? (Step 6)

With these answers, I can pinpoint the exact issue and give you the precise fix! 🎯
