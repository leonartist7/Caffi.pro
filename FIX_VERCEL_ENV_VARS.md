# 🔑 Fix: Add Environment Variables to Vercel

## The Problem

Your `.env.local` file has the correct Supabase keys, but they're **only on your local machine**. Vercel doesn't have access to these keys, so all API requests fail with:

```
"No API key found in request"
```

## The Solution: Add Keys to Vercel

### Step 1: Go to Vercel Dashboard

1. Open: **https://vercel.com/dashboard**
2. Find your **Caffi.pro** project
3. Click on it

### Step 2: Open Settings

1. Click **"Settings"** tab at the top
2. Click **"Environment Variables"** in the left sidebar

### Step 3: Add These 3 Variables

Add each of these one by one:

#### Variable 1:

- **Name**: `NEXT_PUBLIC_SUPABASE_URL`
- **Value**: `https://ugppbaavzevmdkblniim.supabase.co`
- **Environment**: ✅ Production, ✅ Preview, ✅ Development
- Click **"Save"**

#### Variable 2:

- **Name**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVncHBiYWF2emV2bWRrYmxuaWltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1NDY1NjUsImV4cCI6MjA3ODEyMjU2NX0.TV1fU_XFu2G_uc4bI1kTZPI8oHIKLe0oRjwXK-2H7l8`
- **Environment**: ✅ Production, ✅ Preview, ✅ Development
- Click **"Save"**

#### Variable 3:

- **Name**: `SUPABASE_SERVICE_ROLE_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVncHBiYWF2emV2bWRrYmxuaWltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjU0NjU2NSwiZXhwIjoyMDc4MTIyNTY1fQ.xob8cvVAPo39Hc2rdpHDBALBAgOvZHUPWqSTYZHHIQU`
- **Environment**: ✅ Production, ✅ Preview, ✅ Development
- Click **"Save"**

### Step 4: Redeploy Your App

After adding the environment variables:

1. Go to **"Deployments"** tab
2. Click the **"..."** menu on the latest deployment
3. Click **"Redeploy"**
4. **OR** just push a small change to trigger auto-deploy

**Wait 2-3 minutes** for the deployment to complete.

### Step 5: Test Again

1. Open your deployed app (e.g., `https://caffi-pro.vercel.app`)
2. Open browser console (F12)
3. **You should now see:**
   - ✅ **NO "No API key found" errors**
   - ✅ **NO 400 errors**
   - ✅ Tenant data loads correctly
   - ✅ "View Shop" button works!

---

## 📸 Visual Guide

**Vercel Environment Variables Screen:**

```
┌──────────────────────────────────────────────────────┐
│  Environment Variables                               │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Name:  NEXT_PUBLIC_SUPABASE_URL                    │
│  Value: https://ugppbaavzevmdkblniim.supabase.co    │
│  Environment: [✓] Production [✓] Preview [✓] Dev    │
│                                          [Save]      │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## ✅ How to Verify It Worked

**Before Fix:**

```
❌ Error: "No API key found in request"
❌ 400 errors on tenant_manifests
❌ TenantSelector shows no tenants
❌ "View Shop" doesn't work
```

**After Fix:**

```
✅ No API key errors
✅ No 400 errors (we already fixed RLS)
✅ Tenants load with logos
✅ "View Shop" button is blue and clickable
✅ Clicking opens /shop/your-slug successfully
```

---

## 🔍 Alternative: Quick Check in Vercel CLI

If you have Vercel CLI installed:

```bash
# List current environment variables
vercel env ls

# Should show:
# NEXT_PUBLIC_SUPABASE_URL (Production, Preview, Development)
# NEXT_PUBLIC_SUPABASE_ANON_KEY (Production, Preview, Development)
# SUPABASE_SERVICE_ROLE_KEY (Production, Preview, Development)
```

---

## 🆘 If You Can't Find Environment Variables

**Path in Vercel Dashboard:**

1. Dashboard → Your Project
2. **Settings** tab (top navigation)
3. **Environment Variables** (left sidebar)
4. Should see "Add New" button

Or direct link:
`https://vercel.com/leonartist7/caffi-pro/settings/environment-variables`

---

**Add those 3 environment variables to Vercel and redeploy. The app will work immediately!** 🚀
