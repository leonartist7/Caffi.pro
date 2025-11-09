# 🔧 Fix: RLS Error When Creating Tenants

## The Problem

You're seeing this error:
```
new row violates row-level security policy for table "tenants"
```

## The Solution (2 Minutes)

### ✅ I've Already Fixed the Code

The code now uses the **service role key** which bypasses RLS. You just need to set the key!

### 📝 Step-by-Step Fix

#### **1. Get Your Service Role Key**

Go to Supabase Dashboard:
```
https://supabase.com/dashboard/project/ugppbaavzevmdkblniim/settings/api
```

Or:
1. Open https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** (gear icon)
4. Click **API**
5. Scroll to **Project API keys**
6. Find **service_role** (marked as "secret")
7. Click to reveal and copy it

#### **2. Update Your .env.local File**

Open the file:
```bash
# Windows
notepad admin-dashboard\.env.local

# Or in VS Code
code admin-dashboard\.env.local
```

Find this line:
```
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

Replace it with your actual key:
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3M...
```

**Save the file!**

#### **3. Restart Your Dev Server**

In your terminal:
```bash
# Press Ctrl+C to stop the server

# Then restart:
npm run dev
```

#### **4. Test It!**

1. Go to: http://localhost:3000/tenants
2. Click **"Add Tenant"**
3. Fill in:
   - Business Name: "My Test Café"
   - Owner Email: "test@mycafe.com"
   - App Name: "My Test Café"
4. Click **"Create Tenant"**
5. ✅ It should work now!

---

## What Changed

I updated these files to use the service role key:
- ✅ `app/api/tenants/route.ts` - API endpoints
- ✅ `app/tenants/page.tsx` - Tenant list
- ✅ `app/page.tsx` - Dashboard stats

Now all admin operations bypass RLS properly.

---

## Verify It's Working

After restarting, you should see:
- ✅ Dashboard shows correct stats
- ✅ Tenant list loads
- ✅ Can create new tenants
- ✅ No more RLS errors

---

## Troubleshooting

### Still getting errors?

**Check 1: Is the key correct?**
```bash
# The key should start with: eyJ
# And be very long (200+ characters)
```

**Check 2: Did you restart the server?**
```bash
# Stop with Ctrl+C
# Start with: npm run dev
```

**Check 3: Is the file saved?**
```bash
# Make sure you saved .env.local after editing
```

### Can't find the service role key?

1. Go to: https://supabase.com/dashboard
2. Click on your project
3. Settings → API
4. Look for "service_role" under "Project API keys"
5. Click the eye icon to reveal it
6. Copy the entire key

---

## Security Note

✅ **Safe:** The service role key is only used server-side (API routes)  
✅ **Safe:** It's in `.env.local` which is not committed to git  
❌ **Never:** Don't use it in client components  
❌ **Never:** Don't commit it to git  

---

## After This Fix

You'll be able to:
- ✅ Create tenants
- ✅ View all tenants
- ✅ Edit tenants (when we build it)
- ✅ Delete tenants (when we build it)
- ✅ All admin operations

---

**Quick Summary:**
1. Get service role key from Supabase Dashboard
2. Paste it in `admin-dashboard/.env.local`
3. Restart server with `npm run dev`
4. Try creating a tenant again!

**It should work now! 🎉**

