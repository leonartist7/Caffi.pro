# ⚠️ Important: Set Your Service Role Key

## The Issue

You're getting an RLS (Row-Level Security) error because the API needs the **service role key** to bypass RLS for admin operations.

## Quick Fix (2 minutes)

### Step 1: Get Your Service Role Key

1. Open **Supabase Dashboard**: https://supabase.com/dashboard/project/ugppbaavzevmdkblniim
2. Go to **Settings** → **API**
3. Find **service_role** key (it's marked as "secret")
4. Copy it (starts with `eyJ...`)

### Step 2: Update .env.local

1. Open: `admin-dashboard/.env.local`
2. Replace this line:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```
   
   With:
   ```
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your-actual-key
   ```

### Step 3: Restart Server

```bash
# Stop the current server (Ctrl+C)
# Then restart:
cd admin-dashboard
npm run dev
```

### Step 4: Try Again

1. Go to: http://localhost:3000/tenants
2. Click "Add Tenant"
3. Fill in the form
4. Click "Create Tenant"
5. It should work now! ✅

---

## Why This Is Needed

- **Anon Key:** Used by frontend, respects RLS policies
- **Service Role Key:** Used by backend/admin, bypasses RLS

For admin operations (creating tenants, etc.), we need to bypass RLS, so we use the service role key.

---

## Security Note

⚠️ **Never expose the service role key to the client!**

✅ **Good:** Using it in API routes (server-side)  
❌ **Bad:** Using it in client components

Our implementation is secure because:
- Service role key is only in `.env.local` (not committed to git)
- Only used in API routes (server-side)
- Never sent to the browser

---

## After You Set It

The error will go away and you'll be able to:
- ✅ Create new tenants
- ✅ Edit tenants
- ✅ Delete tenants
- ✅ All admin operations

---

**Quick Command:**

```bash
# Open .env.local in your editor
code admin-dashboard/.env.local

# Or use notepad
notepad admin-dashboard\.env.local
```

Then paste your service role key and restart the server!

