# Caffi.pro - White-Label Coffee Shop SaaS Platform

> **"Shopify for coffee loyalty apps"** - One platform, multiple café brands, each with their unique app.

## 🎯 Overview

Caffi.pro gives independent coffee shops their own branded mobile apps with:
- **Loyalty Programs** - Points, tiers, and rewards
- **Mobile Ordering** - Browse menu, order, and pay in-app
- **Push Notifications** - Marketing campaigns and order updates
- **Real-time Dashboard** - Manage menu, orders, and customers

### Business Model
- Setup Fee: €500 per café (one-time)
- Monthly Subscription: €200/month per café
- Optional Add-on: €200/month for social media management

## 🏗️ Tech Stack

**Backend:**
- Supabase (PostgreSQL + Auth + Storage + Realtime + Edge Functions)
- Multi-tenant architecture with Row-Level Security (RLS)

**Admin & Client Dashboards:**
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + Shadcn/ui
- React Query

**Mobile Apps:**
- FlutterFlow (visual app builder)
- Firebase Cloud Messaging (push notifications)

**Deployment:**
- Supabase Cloud (backend)
- Vercel (dashboards)
- FlutterFlow Cloud Build (mobile apps)

## 📁 Project Structure

```
caffi-pro/
├── supabase/              # Database, auth, and edge functions
│   ├── migrations/        # Database schema migrations
│   ├── functions/         # Edge functions (API)
│   └── seed/              # Test data
├── admin-dashboard/       # Super admin dashboard (Next.js)
├── client-dashboard/      # Café owner dashboard (Next.js)
├── mobile/                # FlutterFlow project files
└── docs/                  # Documentation
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase CLI
- Git

### Setup

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd caffi-pro
   ```

2. **Set up Supabase**
   ```bash
   cd supabase
   supabase init
   supabase start
   supabase db push
   ```

3. **Seed test data**
   ```bash
   supabase db seed
   ```

4. **Set up Admin Dashboard**
   ```bash
   cd admin-dashboard
   npm install
   cp .env.example .env.local
   # Add your Supabase credentials
   npm run dev
   ```

5. **Set up Client Dashboard**
   ```bash
   cd client-dashboard
   npm install
   cp .env.example .env.local
   # Add your Supabase credentials
   npm run dev
   ```

## 📋 Development Phases

- [x] **MODULE 1:** Database & Supabase Setup (Week 1)
- [ ] **MODULE 2:** Authentication System (Week 1-2)
- [ ] **MODULE 3:** Super Admin Dashboard (Week 2-3)
- [ ] **MODULE 4:** Client Dashboard (Week 3-4)
- [ ] **MODULE 5:** API Layer - Edge Functions (Week 4)
- [ ] **MODULE 6:** Mobile App - FlutterFlow (Week 5-7)
- [ ] **MODULE 7:** White-Label Deployment System (Week 7-8)
- [ ] **MODULE 8:** Push Notifications & Final Integration (Week 8)

## 🗄️ Database Schema

The system uses 13 tables with multi-tenant isolation:

**Core Tables:**
- `tenants` - Café business information
- `tenant_manifests` - Design tokens for white-labeling
- `users` - Customers
- `locations` - Physical café locations
- `categories` - Menu categories
- `menu_items` - Products
- `orders` - Customer orders
- `order_items` - Items within orders
- `loyalty_transactions` - Point history
- `rewards_catalog` - Redeemable rewards
- `coupons` - Discount codes
- `coupon_usage` - Redemption tracking
- `push_campaigns` - Marketing notifications

All tables have Row-Level Security (RLS) enabled with tenant isolation.

## 🔐 Authentication

**Three authentication systems:**
1. **Super Admin** - Email + password (for Caffi.pro team)
2. **Café Owners** - Email + password (for client dashboard)
3. **Customers** - Phone OTP or email magic link (for mobile app)

## 🎨 White-Label System

Each café gets their own:
- Unique app name and logo
- Custom color scheme
- Unique bundle ID (e.g., `com.bluebottle.app`)
- Separate App Store listing

Design tokens are stored in the `tenant_manifests` table and loaded dynamically.

## 📚 Documentation

- [Complete Project Specification](./docs/SPECIFICATION.md)
- [Database Schema](./docs/DATABASE.md)
- [API Reference](./docs/API.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)

## 🎯 Success Metrics

**Technical KPIs:**
- API uptime: > 99.5%
- API response time: < 200ms (p95)
- App crash rate: < 1%

**Business KPIs:**
- Target: 50 cafés in Year 1
- MRR Goal: €10,000/month
- Customer Churn: < 5% per month

## 📝 License

Proprietary - All rights reserved

## 👥 Team

Built by [Your Team Name]

---

**Let's build something amazing! 🚀**
