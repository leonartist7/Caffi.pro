# 🔧 Fix: Supabase Schema Cache Issue

## The Problem

Error: **"Could not find the 'design_tokens' column of 'tenant_manifests' in the schema cache"**

This happens when:

1. The `design_tokens` column exists in the database ✅
2. BUT Supabase's schema cache hasn't updated to include it ❌

## 🚀 Quick Fix (Option 1: Refresh Schema Cache)

### Step 1: Go to Supabase Dashboard

1. Open: https://supabase.com/dashboard
2. Select your project: **ugppbaavzevmdkblniim**

### Step 2: Restart PostgREST

**Method A: Via Settings**

1. Click **Settings** (gear icon in left sidebar)
2. Click **API**
3. Look for **"PostgREST"** section
4. Click **"Restart"** button
5. Wait 10-30 seconds

**Method B: Via SQL (If Method A doesn't exist)**

1. Go to **SQL Editor**
2. Run this command:

```sql
NOTIFY pgrst, 'reload schema';
```

3. Wait 10-30 seconds

### Step 3: Verify Column Exists

In SQL Editor, run:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'tenant_manifests'
ORDER BY ordinal_position;
```

**Expected output should include:**

```
manifest_id     | uuid
tenant_id       | uuid
design_tokens   | jsonb      ← THIS ONE!
logo_url        | text
created_at      | timestamp
updated_at      | timestamp
```

### Step 4: Test Creating a Client

1. Go to your admin dashboard
2. Try creating a client again
3. ✅ Should work now!

---

## 🔨 Alternative Fix (Option 2: Add Column Manually)

If the column is actually missing (not just cached incorrectly):

### Run This SQL in Supabase SQL Editor:

```sql
-- Add design_tokens column if it doesn't exist
ALTER TABLE tenant_manifests
ADD COLUMN IF NOT EXISTS design_tokens JSONB DEFAULT '{
  "colors": {
    "primary": "#6b3410",
    "secondary": "#8D4004",
    "accent": "#D2691E",
    "background": "#FFFFFF",
    "surface": "#F8F9FA",
    "error": "#DC3545",
    "success": "#28A745",
    "text_primary": "#212529",
    "text_secondary": "#6C757D"
  },
  "typography": {
    "font_family": "Inter",
    "heading_font": "Poppins",
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
}'::jsonb;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';
```

---

## 🔍 Diagnostic: Which Option to Use?

Run this SQL first to check if the column exists:

```sql
SELECT
    EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'tenant_manifests'
          AND column_name = 'design_tokens'
    ) as design_tokens_exists;
```

**If Result is `true`:**

- Column exists ✅
- Problem is **stale schema cache**
- **Use Option 1** (Restart PostgREST)

**If Result is `false`:**

- Column doesn't exist ❌
- Migrations didn't run properly
- **Use Option 2** (Add column manually)

---

## 📋 Other Console Warnings (Low Priority)

The other errors you mentioned are less critical:

### CSP (Content Security Policy) Warnings

```
Loading the script 'https://a-cdn.anthropic.com/analytics.js/v1/...' violates CSP
```

**Impact:** Analytics/tracking scripts blocked (cosmetic issue)
**Fix:** Not urgent, can add to CSP later

### 503 Errors on /v1/sessions

```
Failed to load resource: 503
```

**Impact:** Third-party service unavailable (temporary)
**Fix:** Retry later, external service issue

### Viewport Meta Tag Warning

```
The 'viewport' meta element should not contain 'maximum-scale'
```

**Impact:** Accessibility warning (minor UX issue)
**Fix:** Can update later, not blocking

---

## ✅ Success Criteria

After the fix:

**Before:**

```
❌ Error: Could not find 'design_tokens' column
❌ Cannot create clients
```

**After:**

```
✅ No schema cache errors
✅ Can create clients successfully
✅ Manifests created with design_tokens
```

---

## 🆘 If Still Not Working

1. **Check which migrations have run:**

```sql
SELECT * FROM supabase_migrations.schema_migrations
ORDER BY version DESC;
```

2. **Manually run the initial schema migration:**
   - Open `/supabase/migrations/20250107000001_initial_schema.sql`
   - Copy the entire file
   - Paste in SQL Editor
   - Run it

3. **Restart your entire Supabase project:**
   - Settings → General → Pause Project
   - Wait 10 seconds
   - Resume Project
   - Wait 30 seconds

---

**Try Option 1 first (Restart PostgREST), then test creating a client!** 🚀
