# 🔧 Fix: "Could not find 'design_tokens' column" Error

**Error:** `Failed to create manifest: Could not find the 'design_tokens' column of 'tenant_manifests' in the schema cache`

**Root Cause:** The `tenant_manifests` table doesn't exist in your Supabase database yet.

---

## ✅ QUICK FIX (5 Minutes)

### Step 1: Open Supabase SQL Editor

1. Go to: https://supabase.com/dashboard/project/ugppbaavzevmdkblniim/sql/new
2. Or: Supabase Dashboard → Your Project → SQL Editor → New Query

### Step 2: Copy & Paste This SQL

Copy the entire contents of this file:
👉 `supabase/migrations/20250117000001_add_tenant_manifests.sql`

Or copy this directly:

```sql
-- CREATE TENANT_MANIFESTS TABLE
CREATE TABLE IF NOT EXISTS tenant_manifests (
    manifest_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID UNIQUE NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,

    logo_url TEXT,

    design_tokens JSONB DEFAULT '{
        "colors": {
            "primary": "#2D5F5D",
            "secondary": "#F4A259",
            "accent": "#E07A5F",
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
        },
        "branding": {
            "logo_url": null
        }
    }'::JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE tenant_manifests ENABLE ROW LEVEL SECURITY;

-- Dev mode policy (allows everything)
CREATE POLICY "Dev mode: Allow all operations on tenant_manifests" ON tenant_manifests
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_tenant_manifests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenant_manifests_updated_at
    BEFORE UPDATE ON tenant_manifests
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_manifests_updated_at();
```

### Step 3: Run It

1. Click **"Run"** button (or press Ctrl+Enter)
2. You should see: **"Success. No rows returned"**
3. Done! ✅

### Step 4: Test Creating a Client

1. Go back to your Vercel app: https://your-app.vercel.app/clients
2. Click **"+ Add Client"** (or "New Tenant")
3. Fill in the form:
   - Business name: "Test Coffee Shop"
   - Slug: "test-cafe"
   - Email: "owner@test.com"
4. Click **"Save"**
5. It should work now! 🎉

---

## 🔍 VERIFY IT WORKED

Run this in Supabase SQL Editor:

```sql
-- Check if table exists
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'tenant_manifests';
```

You should see:

```
tenant_manifests | manifest_id   | uuid
tenant_manifests | tenant_id     | uuid
tenant_manifests | logo_url      | text
tenant_manifests | design_tokens | jsonb
tenant_manifests | created_at    | timestamp with time zone
tenant_manifests | updated_at    | timestamp with time zone
```

---

## 📝 WHAT DOES THIS TABLE DO?

The `tenant_manifests` table stores **design tokens** for each coffee shop client:

- **Colors** - Primary, secondary, accent colors
- **Typography** - Font families, sizes, weights
- **Spacing** - Padding/margin values
- **Border radius** - Button/card roundness
- **Logo URL** - Shop's logo image

This allows each coffee shop to have their own **branded app** with custom colors and logo!

---

## 🎨 AFTER FIXING

Once the table is created, you can:

1. ✅ Create new clients (tenants)
2. ✅ Set custom logos for each client
3. ✅ Customize primary color per client
4. ✅ Each client's shop will use their branding

The shop will load these design tokens automatically and apply them to:

- Header colors
- Button colors
- App theme
- Logo display

---

## 🆘 STILL NOT WORKING?

### Error: "relation 'tenant_manifests' does not exist"

Run this to check what tables you have:

```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

If `tenant_manifests` is missing, the SQL didn't run. Try again.

### Error: "column 'design_tokens' does not exist"

The table exists but is missing the column. Drop and recreate:

```sql
DROP TABLE IF EXISTS tenant_manifests CASCADE;
-- Then run the CREATE TABLE script again
```

### Still stuck?

Share the exact error message with Claude!

---

## ✅ CHECKLIST

- [ ] Opened Supabase SQL Editor
- [ ] Copied the migration SQL
- [ ] Ran it (got "Success" message)
- [ ] Verified table exists
- [ ] Tested creating a client
- [ ] Client created successfully! 🎉

---

**Once this is done, your multi-tenant branding system will work perfectly!** ☕✨
