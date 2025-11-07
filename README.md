# Caffi.pro - White-Label Coffee Shop SaaS Platform

A multi-tenant SaaS platform that gives independent coffee shops their own branded mobile apps with loyalty programs, mobile ordering, and push notifications.

## 🏗️ Project Structure

```
caffi-pro/
├── supabase/              # Supabase backend
│   ├── migrations/       # Database migrations
│   ├── seed/             # Seed data
│   └── functions/        # Edge Functions
├── admin-dashboard/       # Super Admin Dashboard (Next.js)
├── client-dashboard/      # Client Dashboard (Next.js)
├── mobile/               # Mobile App (FlutterFlow)
└── docs/                 # Documentation
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase account
- PostgreSQL client (optional, for direct DB access)

### Setup Database

1. Create a new Supabase project at https://supabase.com
2. Run the migrations:
   ```bash
   # Using Supabase CLI
   supabase db push
   
   # Or manually run migrations/schema.sql in Supabase SQL Editor
   ```
3. Seed test data:
   ```bash
   supabase db seed
   ```

### Environment Variables

Create `.env.local` files in each dashboard project:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
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

See `/docs` for detailed documentation:
- Database schema
- API reference
- Deployment guide
- User manuals

## 🎯 Business Model

- Setup Fee: €500 per café (one-time)
- Monthly Subscription: €200/month per café
- Optional Add-on: €200/month for social media management

## 📄 License

Proprietary - All rights reserved
