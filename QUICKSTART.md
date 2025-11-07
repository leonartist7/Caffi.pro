# Caffi.pro - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Create Supabase Project

1. Go to https://supabase.com and sign up/login
2. Click "New Project"
3. Fill in:
   - **Name:** Caffi Pro
   - **Database Password:** (save this!)
   - **Region:** Choose closest to you
4. Wait for project to initialize (~2 minutes)

### Step 2: Run Database Migrations

**Option A: Using Supabase Dashboard (Easiest)**

1. Open your Supabase project
2. Go to **SQL Editor**
3. Copy contents of `supabase/migrations/001_schema.sql`
4. Paste and click **Run**
5. Repeat for:
   - `002_rls.sql`
   - `003_functions.sql`
   - `004_indexes.sql`
6. Copy `supabase/seed/seed.sql` and run it

**Option B: Using Supabase CLI**

```bash
# Install CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push

# Seed data
supabase db seed
```

### Step 3: Verify Setup

Run this in SQL Editor:

```sql
-- Should return 2 tenants
SELECT business_name, slug, subscription_status FROM tenants;

-- Should return menu items
SELECT name, price FROM menu_items LIMIT 5;
```

### Step 4: Get Your Credentials

1. Go to **Settings** → **API**
2. Copy:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key**
   - **service_role key** (keep secret!)

### Step 5: Test Authentication

Create a test user in **Authentication** → **Users** → **Add User**

## 📁 Project Structure

```
caffi-pro/
├── supabase/
│   ├── migrations/     # Database schema (run in order)
│   ├── seed/           # Test data
│   └── functions/      # Edge Functions (coming in Module 5)
├── admin-dashboard/    # Super Admin (Module 3)
├── client-dashboard/   # Client Dashboard (Module 4)
├── mobile/             # Mobile App (Module 6)
└── docs/               # Documentation
```

## 🎯 Next Steps

### Module 2: Authentication (Next)
- Set up Supabase Auth
- Configure JWT custom claims
- Create login components

### Module 3: Super Admin Dashboard
- Build tenant management UI
- Create analytics dashboard
- Deploy to Vercel

### Module 4: Client Dashboard
- Build café owner dashboard
- Real-time order board
- Menu management

## 🔑 Important Files

- **`supabase/migrations/001_schema.sql`** - All 13 tables
- **`supabase/migrations/002_rls.sql`** - Security policies
- **`supabase/migrations/003_functions.sql`** - Business logic
- **`supabase/migrations/004_indexes.sql`** - Performance indexes
- **`supabase/seed/seed.sql`** - Test data

## 📚 Documentation

- **`docs/DATABASE_SETUP.md`** - Detailed setup guide
- **`docs/ARCHITECTURE.md`** - System architecture
- **`README.md`** - Project overview

## ⚠️ Common Issues

### Migration Fails
- Check you're running files in order (001, 002, 003, 004)
- Ensure UUID extension is enabled
- Check Supabase logs for errors

### RLS Blocks Queries
- Verify JWT includes `tenant_id` claim
- Check user role in JWT
- Test with super admin role

### Seed Data Missing
- Run seed.sql after migrations
- Check foreign key constraints
- Verify tenant IDs match

## 🎉 Success Checklist

- [ ] Supabase project created
- [ ] All migrations run successfully
- [ ] Seed data loaded
- [ ] Can query tenants table
- [ ] Can query menu_items table
- [ ] RLS policies active
- [ ] Credentials saved securely

## 🆘 Need Help?

1. Check `docs/DATABASE_SETUP.md` for detailed instructions
2. Review Supabase logs in Dashboard
3. Verify migration order
4. Check SQL syntax errors

---

**Ready to build?** Start with Module 2: Authentication System! 🚀
