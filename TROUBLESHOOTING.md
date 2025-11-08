# 🔧 Troubleshooting Guide

## Common Issues and Solutions

---

## Issue 1: "column is_active does not exist"

### Problem
When running the initial schema migration, you get:
```
Error: Failed to run sql query: ERROR: 42703: column "is_active" does not exist
```

### Root Cause
The `menu_items` table was missing the `is_active` column, but the index creation section tried to create an index on it.

### Solution ✅ (FIXED)
This has been fixed in the migration files. If you encountered this error:

#### Step 1: Reset Your Database

Go to **SQL Editor** in Supabase Dashboard and run:

```sql
-- Use the reset script
```

Or copy the contents of `/workspace/supabase/reset_database.sql` and run it.

#### Step 2: Re-run the Fixed Migration

Now run the **fixed** migration file:
- Copy contents of `/workspace/supabase/migrations/20250107000001_initial_schema.sql`
- Paste into SQL Editor
- Click **"Run"**

You should now see: ✅ **Success**

---

## Issue 2: "permission denied for schema auth"

### Problem
When running the RLS policies migration, you get:
```
Error: Failed to run sql query: ERROR: 42501: permission denied for schema auth
```

### Root Cause
The migration tried to create helper functions in the `auth` schema, but regular users don't have permission to create functions there.

### Solution ✅ (FIXED)
This has been fixed in the migration files. The helper functions now use the `public` schema instead.

If you already ran the failed migration:

#### Step 1: Clean up
```sql
-- Try to drop any partially created functions
DROP FUNCTION IF EXISTS auth.user_tenant_id() CASCADE;
DROP FUNCTION IF EXISTS auth.is_super_admin() CASCADE;
DROP FUNCTION IF EXISTS auth.is_authenticated() CASCADE;
```

#### Step 2: Re-run the Fixed Migration
- Copy contents of `/workspace/supabase/migrations/20250107000002_rls_policies.sql`
- Paste into SQL Editor
- Click **"Run"**

You should now see: ✅ **Success**

---

## Issue 3: "npm install -g supabase" fails

### Problem
Running `npm install -g supabase` shows error:
```
Installing Supabase CLI as a global module is not supported.
```

### Root Cause
Supabase CLI no longer supports npm global installation.

### Solution ✅ (FIXED)

**Linux/macOS:**
```bash
curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz -o /tmp/supabase.tar.gz
cd /tmp && tar -xzf supabase.tar.gz
sudo mv supabase /usr/local/bin/supabase
supabase --version
```

**Windows:**
Download installer from: https://github.com/supabase/cli/releases

**Verify:**
```bash
supabase --version
# Should show: 2.54.11 (or later)
```

---

## Issue 4: Migration partially applied

### Problem
You started applying a migration but it failed halfway, now you have partial tables.

### Solution

#### Option A: Via SQL Editor (Easiest)
1. Copy contents of `/workspace/supabase/reset_database.sql`
2. Go to **SQL Editor** in Supabase Dashboard
3. Paste and click **"Run"**
4. Re-apply migrations from the beginning

#### Option B: Via CLI
```bash
cd /workspace/supabase
supabase db reset
supabase db push
```

⚠️ **Warning:** This will delete ALL data. Only use in development.

---

## Issue 5: RLS blocking queries

### Problem
You can't read data even though tables exist.

### Root Cause
Row-Level Security (RLS) is enabled and you're not authenticated.

### Solution

#### For Testing (Disable RLS temporarily)
⚠️ **Only for development/testing!**

```sql
-- Disable RLS on specific table
ALTER TABLE menu_items DISABLE ROW LEVEL SECURITY;
```

#### For Production (Authenticate properly)
```javascript
// Use service role key (bypasses RLS)
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'YOUR_URL',
  'YOUR_SERVICE_ROLE_KEY' // Not anon key!
)

// Or authenticate as a user
await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
})
```

---

## Issue 6: Tables not visible in Table Editor

### Problem
Ran migration successfully but don't see tables in Supabase Dashboard.

### Solution
1. Hard refresh the page (Ctrl+Shift+R / Cmd+Shift+R)
2. Check you're on correct project
3. Verify migration ran:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

Should return 14 tables.

---

## Issue 7: Seed data fails

### Problem
Can't insert seed data, getting foreign key errors.

### Root Cause
Migrations not fully applied or applied in wrong order.

### Solution
Apply migrations in correct order:
1. `20250107000001_initial_schema.sql` (creates tables)
2. `20250107000002_rls_policies.sql` (security)
3. `20250107000003_database_functions.sql` (functions)
4. `20250107000004_auth_setup.sql` (authentication)
5. **Then** run seed: `01_test_tenants.sql`

---

## Issue 8: Phone OTP not sending

### Problem
Can't receive phone OTP for customer authentication.

### Solution

#### Development/Testing
Use Supabase's built-in phone auth (no Twilio needed):
1. Go to **Authentication** > **Providers**
2. Enable **Phone**
3. Leave on default settings
4. Use test phone numbers

#### Production
Configure Twilio:
1. Sign up at https://www.twilio.com
2. Get credentials (Account SID, Auth Token, Phone Number)
3. Go to **Authentication** > **Settings** > **Phone Auth**
4. Enter Twilio credentials
5. Test with real phone number

---

## Issue 9: JWT custom claims not working

### Problem
User tokens don't contain `tenant_id` or `role` claims.

### Solution

#### Step 1: Verify Hook is Enabled
1. Go to **Authentication** > **Hooks**
2. Check **"Custom Access Token"** is enabled
3. Should point to: `public.custom_access_token_hook`

#### Step 2: Verify Function Exists
Run in SQL Editor:
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'custom_access_token_hook';
```

Should return 1 row.

#### Step 3: Re-login
User must log out and log back in for new token format.

---

## Issue 10: Can't connect to Supabase

### Problem
Client can't connect, timeout errors.

### Checklist
- [ ] Project URL correct? (`https://xxxxx.supabase.co`)
- [ ] Anon key correct? (starts with `eyJhbGci...`)
- [ ] Project not paused? (free tier pauses after 1 week inactivity)
- [ ] Network/firewall allows HTTPS?

### Test Connection
```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'YOUR_PROJECT_URL',
  'YOUR_ANON_KEY'
)

const { data, error } = await supabase
  .from('tenants')
  .select('business_name')
  .limit(1)

console.log('Connection test:', { data, error })
```

---

## Issue 11: Supabase CLI not found

### Problem
```
bash: supabase: command not found
```

### Solution

#### Check Installation
```bash
which supabase
```

If empty, Supabase CLI not installed.

#### Install (Linux/macOS)
```bash
curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz -o /tmp/supabase.tar.gz
cd /tmp && tar -xzf supabase.tar.gz
sudo mv supabase /usr/local/bin/supabase
```

#### Verify
```bash
supabase --version
# Should show version number
```

---

## Quick Diagnostic Commands

### Check Database Schema
```sql
-- List all tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' ORDER BY table_name;

-- Count rows in each table
SELECT 
  schemaname,
  tablename,
  (xpath('/row/cnt/text()', xml_count))[1]::text::int as row_count
FROM (
  SELECT 
    schemaname, 
    tablename, 
    query_to_xml(format('SELECT count(*) as cnt FROM %I.%I', schemaname, tablename), false, true, '') as xml_count
  FROM pg_tables
  WHERE schemaname = 'public'
) t
ORDER BY tablename;
```

### Check RLS Policies
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Check Functions
```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;
```

---

## Getting More Help

### Documentation
- **GETTING_STARTED.md** - Setup guide
- **docs/SETUP.md** - Detailed setup
- **docs/DATABASE.md** - Schema reference
- **docs/AUTHENTICATION.md** - Auth guide

### Official Support
- **Supabase Docs:** https://supabase.com/docs
- **Supabase Discord:** https://discord.supabase.com
- **GitHub Issues:** https://github.com/supabase/supabase/issues

### Debug Mode
Enable verbose logging:
```bash
# CLI
supabase --debug db push

# Client
const supabase = createClient(url, key, {
  auth: {
    debug: true
  }
})
```

---

## Prevention Tips

1. **Always run migrations in order**
2. **Test in development first**
3. **Backup before major changes**
4. **Read error messages carefully**
5. **Check Supabase Dashboard logs**
6. **Use version control (git)**
7. **Document custom changes**
8. **Test RLS policies before enabling**

---

**Need help?** Check the documentation or open an issue with:
- Error message (full output)
- Steps to reproduce
- Your environment (OS, Node version, etc.)
- What you've tried so far
