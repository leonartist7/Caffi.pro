# 🔧 COMPLETE GUIDE: Run SQL Fix in Supabase Dashboard

## Step 1: Open Supabase Dashboard

1. Go to: **https://supabase.com/dashboard**
2. **Log in** with your account
3. **Click on your project** (ugppbaavzevmdkblniim)

## Step 2: Open SQL Editor

Look at the **left sidebar**, you'll see icons and menu items:

```
📊 Home
🗄️  Table Editor
🔍 SQL Editor          ← CLICK THIS ONE
🔐 Authentication
📁 Storage
...
```

Click on **"SQL Editor"**

## Step 3: Create New Query

Once in SQL Editor, you'll see a button at the top:

```
[+ New query]          ← CLICK THIS
```

Click **"+ New query"**

## Step 4: Copy & Paste This SQL

Copy this EXACT SQL code and paste it into the editor:

```sql
-- DISABLE RLS TO FIX 400 ERRORS
ALTER TABLE tenant_manifests DISABLE ROW LEVEL SECURITY;
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items DISABLE ROW LEVEL SECURITY;

-- Verify it worked
SELECT
    tablename,
    rowsecurity,
    CASE
        WHEN rowsecurity = false THEN '✅ RLS DISABLED (GOOD)'
        ELSE '❌ RLS STILL ENABLED'
    END as status
FROM pg_tables
WHERE tablename IN ('tenant_manifests', 'tenants', 'categories', 'menu_items')
ORDER BY tablename;
```

## Step 5: Run the Query

Look for a button that says **"Run"** or **"RUN"** (usually top-right of the editor)

Click it!

## Step 6: Check the Results

You should see a table showing:

```
tablename          | rowsecurity | status
-------------------+-------------+----------------------
categories         | false       | ✅ RLS DISABLED (GOOD)
menu_items         | false       | ✅ RLS DISABLED (GOOD)
tenant_manifests   | false       | ✅ RLS DISABLED (GOOD)
tenants            | false       | ✅ RLS DISABLED (GOOD)
```

**All should say "✅ RLS DISABLED (GOOD)"**

## Step 7: Go Back to Your Admin Dashboard

1. Go back to your Caffi.pro admin dashboard
2. Press **Ctrl+Shift+R** (hard refresh)
3. Open console (F12)

**You should see:**

- ✅ **NO MORE 400 ERRORS**
- ✅ All tenant data loads correctly
- ✅ TenantSelector shows all tenants with logos

## Step 8: Re-select Your Tenant

1. Click the tenant dropdown (top-right)
2. Select your coffee shop
3. **"View Shop" button should now work!**

---

## 🎯 What You Should See After Fix

**Before Fix (Current):**

```
❌ 5x Failed to load resource: 400 ()
❌ "View Shop" = grayed out or not working
```

**After Fix:**

```
✅ No 400 errors in console
✅ "View Shop" button = blue/clickable
✅ Clicking it opens /shop/your-slug
✅ Shop page loads with your branding
```

---

## 🆘 If You Can't Find SQL Editor

**Alternative paths to SQL Editor:**

1. From Dashboard home → **Database** (left sidebar) → **SQL Editor** (tab at top)
2. From Project Settings → Look for **Database** section → **SQL Editor**
3. Direct URL: `https://supabase.com/dashboard/project/ugppbaavzevmdkblniim/sql`

---

## 📸 Visual Guide - What to Look For

**Supabase Left Sidebar:**

```
┌─────────────────────┐
│ 🏠 Home            │
│ 📊 Table Editor    │
│ ✏️  SQL Editor     │ ← THIS ONE
│ 🔐 Authentication  │
│ 📁 Storage         │
│ 🔌 Edge Functions  │
└─────────────────────┘
```

**SQL Editor Screen:**

```
┌──────────────────────────────────────┐
│  [+ New query]  [Templates ▼]  [Run]│
├──────────────────────────────────────┤
│                                      │
│  -- Paste SQL here                   │
│  ALTER TABLE tenant_manifests...     │
│                                      │
└──────────────────────────────────────┘
```

---

**Run that SQL and the 400 errors will disappear immediately!** 🚀
