# CAFFI.PRO - White-Label Coffee Shop SaaS Platform

A multi-tenant SaaS platform that gives independent coffee shops their own branded mobile apps with loyalty programs, mobile ordering, and push notifications.

## 🏗️ Project Structure

```
caffi-pro/
├── supabase/              # Supabase backend
│   ├── migrations/        # Database migrations
│   ├── seed/              # Seed data
│   └── functions/         # Edge Functions
├── admin-dashboard/       # Super Admin Dashboard (Next.js)
├── client-dashboard/      # Client Dashboard (Next.js)
├── mobile/                # Mobile app (FlutterFlow)
└── docs/                  # Documentation
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase account
- PostgreSQL client (optional, for local dev)

### Database Setup

1. Create a new Supabase project at https://supabase.com
2. Run migrations:
   ```bash
   # Using Supabase CLI
   supabase db push
   
   # Or manually via Supabase Dashboard SQL Editor
   # Run files in order: 001_schema.sql, 002_rls.sql, 003_functions.sql, 004_indexes.sql
   ```

3. Seed test data:
   ```bash
   supabase db seed
   # Or run seed.sql manually
   ```

## 📋 Development Modules

- **Module 1:** Database & Supabase Setup ✅
- **Module 2:** Authentication System
- **Module 3:** Super Admin Dashboard
- **Module 4:** Client Dashboard
- **Module 5:** API Layer (Edge Functions)
- **Module 6:** Mobile App (FlutterFlow)
- **Module 7:** White-Label Deployment
- **Module 8:** Push Notifications & Integration

## 📚 Documentation

See `/docs` directory for:
- Architecture overview
- API reference
- Deployment guide
- User manuals

## 🔐 Environment Variables

Create `.env.local` files in each dashboard project:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 📝 License

Proprietary - All rights reserved
