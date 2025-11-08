# 🔧 Troubleshooting: Blank Analytics Page

If your analytics dashboard is showing a blank page, follow these steps:

## Step 1: Check Browser Console

1. Open your browser to `http://localhost:3000/analytics`
2. Press `F12` (or `Ctrl+Shift+I` on Windows, `Cmd+Option+I` on Mac)
3. Click the **Console** tab
4. Look for error messages (they'll be in red)

### Common Errors & Solutions:

**Error: "Cannot find module '@supabase/supabase-js'"**
```bash
# Solution: Install dependencies
npm install
```

**Error: "Missing environment variables"**
```bash
# Solution: Create .env.local file
cp .env.local.example .env.local
# Then add your SUPABASE_SERVICE_ROLE_KEY
```

**Error: "Failed to fetch" or "Network error"**
- Check that your Supabase URL is correct
- Verify your service role key is valid
- Check your internet connection

## Step 2: Test Supabase Connection

Run this test script:

```bash
npm install dotenv
node test-analytics-connection.js
```

This will tell you:
- ✅ If your `.env.local` is configured correctly
- ✅ If Supabase connection works
- ✅ If your database has data
- ❌ What's wrong if it fails

### Expected Output:

```
🔍 Testing Supabase Connection...

✅ Environment variables loaded
   URL: https://ugppbaavzevmdkblniim.supabase.co
   Key: eyJhbGciOiJIUzI1NiIsI...

📊 Checking tenants table...
✅ Found 1 tenants
   - Test Coffee Shop

📦 Checking orders table...
✅ Found 50 total orders
   Recent orders:
   - completed: €15.60 (2024-11-01...)
   - completed: €23.40 (2024-11-02...)

👥 Checking users table...
✅ Found 10 total users

==================================================
✅ CONNECTION SUCCESSFUL!
✅ Database has data - dashboard should work
==================================================
```

## Step 3: Check if Database is Empty

If the test shows **0 orders**, your database is empty. The dashboard will load but show zeros.

### Solution: Add Test Data

**Option A: Run SQL in Supabase Dashboard**

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the contents of `seed-test-data.sql`
6. Click **Run**

**Option B: Use Supabase CLI**

```bash
npx supabase db push
```

## Step 4: Restart Development Server

After making changes to `.env.local`, you **MUST** restart:

```bash
# Press Ctrl+C to stop
# Then run again:
npm run dev
```

## Step 5: Check File Locations

Verify files are in the correct locations:

```
/workspace/
├── .env.local          ← Must be here (not in app/ folder)
├── app/
│   └── analytics/
│       └── page.tsx    ← Dashboard component
├── lib/
│   └── supabase.ts     ← Supabase client
└── package.json
```

## Step 6: Verify .env.local Format

Your `.env.local` should look EXACTLY like this:

```env
NEXT_PUBLIC_SUPABASE_URL=https://ugppbaavzevmdkblniim.supabase.co
SUPABASE_URL=https://ugppbaavzevmdkblniim.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVncHBiYWF2emV2bWRrYmxuaWltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjI5NTU2NSwiZXhwIjoyMDUxODcxNTY1fQ.YOUR_ACTUAL_KEY_HERE
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVncHBiYWF2emV2bWRrYmxuaWltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1NDY1NjUsImV4cCI6MjA3ODEyMjU2NX0.TV1fU_XFu2G_uc4bI1kTZPI8oHIKLe0oRjwXK-2H7l8
```

**Common mistakes:**
- ❌ Extra spaces around `=`
- ❌ Quotes around values (don't use quotes)
- ❌ Missing or incomplete key
- ❌ File named `.env` instead of `.env.local`

## Step 7: Check Network Tab

In browser console:
1. Click **Network** tab
2. Refresh the page
3. Look for failed requests (they'll be red)
4. Click on failed requests to see error details

## Step 8: Check Loading State

The page should show a loading spinner while fetching data. If you see the spinner forever:
- Supabase queries are failing
- Check console for errors
- Run the test script above

## Step 9: Enable Debug Mode

Add this to your `lib/supabase.ts` temporarily:

```typescript
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  // Add this for debugging:
  global: {
    headers: {
      'x-debug': 'true'
    }
  }
})

// Add this to see what's configured
console.log('Supabase URL:', supabaseUrl)
console.log('Service key configured:', !!supabaseServiceRoleKey)
```

## Step 10: Check Row Level Security (RLS)

If using service role key, RLS should be bypassed. But verify in Supabase:

1. Go to **Authentication** > **Policies**
2. Check if policies are blocking queries
3. Service role key should bypass all RLS

## Quick Checklist

- [ ] `.env.local` exists in root folder
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set (very long string)
- [ ] Development server restarted after adding `.env.local`
- [ ] `npm install` completed successfully
- [ ] Browser console shows no errors
- [ ] Database has data (run test script)
- [ ] Supabase project is active (not paused)

## Still Not Working?

### Get Detailed Error Info

1. **Check browser console** - Copy any error messages
2. **Run test script** - Copy the output
3. **Check terminal** - Look for Next.js errors

### Common Issues:

**"Page loads but shows all zeros"**
- Database is empty - run `seed-test-data.sql`

**"Infinite loading spinner"**
- Supabase queries failing - check console errors
- Run `test-analytics-connection.js` to diagnose

**"White screen, no errors"**
- JavaScript error preventing render
- Check console for React errors
- Try clearing browser cache (`Ctrl+Shift+Delete`)

**"Module not found errors"**
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Need More Help?

Share these details:
1. Browser console errors (screenshot or copy/paste)
2. Output from `node test-analytics-connection.js`
3. Terminal output when running `npm run dev`
4. Contents of `.env.local` (hide the actual key, just show if it's there)

---

**Most common fix**: Restart the dev server after creating `.env.local`! 🔄



