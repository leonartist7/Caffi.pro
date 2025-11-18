# 🔍 View Shop Link Troubleshooting Guide

The "View Shop" button is showing "Coffee Shop Not Found". Let's diagnose this step by step.

## Step 1: Check Browser Console

1. Open your admin dashboard: `/menu` page
2. Open browser DevTools (F12)
3. Look for this console log:
   ```
   Selected Tenant: {
     business_name: "...",
     tenant_id: "...",
     slug: "...",      ← CHECK THIS
     hasSlug: true/false
   }
   ```

**If `slug` is `null` or `undefined`:**

- Problem: TenantSelector has cached old data from localStorage
- Solution: See Step 2

**If `slug` has a value (e.g., "test-coffee-shop"):**

- Problem: Something else is wrong
- Solution: See Step 3

---

## Step 2: Clear Cached Tenant Data

The TenantSelector stores selected tenant in localStorage. If you ran the slug migration AFTER selecting the tenant, localStorage still has the old data without the slug.

### Quick Fix:

**Option A: Re-select the tenant**

1. Click on the tenant dropdown in the top-right
2. Click on a different tenant (if you have one)
3. Click back to your original tenant
4. Check if "View Shop" button now works

**Option B: Clear localStorage (more thorough)**

1. Open DevTools Console (F12)
2. Run this command:
   ```javascript
   localStorage.removeItem('selectedTenant')
   ```
3. Refresh the page (Ctrl+R or Cmd+R)
4. Re-select your tenant from the dropdown
5. "View Shop" should now show the correct link

**Option C: Hard Refresh**

1. Press `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
2. This clears cache and reloads everything
3. Re-select your tenant

---

## Step 3: Verify Slugs Exist in Database

If the tenant STILL doesn't have a slug after clearing cache, run this SQL in your Supabase dashboard:

```sql
-- Check if slugs exist
SELECT
  tenant_id,
  business_name,
  slug,
  CASE
    WHEN slug IS NULL OR slug = '' THEN '❌ MISSING'
    ELSE '✅ OK'
  END as slug_status
FROM tenants
ORDER BY created_at DESC;
```

**If any tenants show "❌ MISSING":**

Run this migration to fix them:

```sql
-- Auto-generate slugs from business_name
UPDATE tenants
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(business_name, '[^a-zA-Z0-9]+', '-', 'g'),
    '^-+|-+$', '', 'g'
  )
)
WHERE slug IS NULL OR slug = '';

-- Verify it worked
SELECT business_name, slug FROM tenants;
```

---

## Step 4: Test the Shop Link

Once you've cleared the cache and re-selected the tenant:

1. Check the "View Shop" button - should now be blue/clickable
2. Hover over it - URL should be `/shop/{your-slug}`
3. Click it - should open your shop page
4. Should see: "Welcome to {Your Coffee Shop}"

---

## Step 5: If Still Not Working

If you've tried all the above and it's still broken:

1. Check the browser console for the "Selected Tenant" log
2. Copy the ENTIRE log output
3. Share it so we can see exactly what data is being loaded

Also share:

- What does the "View Shop" button look like? (Grayed out or clickable?)
- What URL does it try to open when you click it?
- Any error messages in the console?

---

## Quick Diagnostic Script

Run this in your browser console while on the `/menu` page:

```javascript
// Check what tenant data is stored
const storedTenant = localStorage.getItem('selectedTenant')
console.log('Stored Tenant:', JSON.parse(storedTenant))

// Check if slug exists
const tenant = JSON.parse(storedTenant)
if (!tenant.slug) {
  console.error('❌ PROBLEM: No slug in stored tenant!')
  console.log('🔧 FIX: Clear localStorage and re-select tenant')
} else {
  console.log('✅ Slug exists:', tenant.slug)
  console.log('🔗 Shop URL should be:', `/shop/${tenant.slug}`)
}
```

---

## Expected Working State

When everything is working correctly:

1. **TenantSelector** fetches tenant from database (with slug)
2. **localStorage** stores tenant including slug
3. **Menu page** reads selectedTenant from context (has slug)
4. **"View Shop" button** shows as clickable blue button
5. **Clicking it** opens `/shop/{slug}` in new tab
6. **Shop page** loads successfully with tenant branding

---

**Most Common Cause**: Cached data in localStorage from before slug migration.
**Most Common Fix**: Clear localStorage with `localStorage.removeItem('selectedTenant')` and re-select tenant.
