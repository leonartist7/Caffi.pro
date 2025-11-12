# ☕ Caffi.pro - Multi-Tenant Coffee Shop Management Platform

**Version:** 2.0
**Status:** ~50% Complete (Phase 1-5 Done)
**Tech Stack:** Next.js 14 + TypeScript + Supabase + Tailwind CSS

---

## 🎯 What is Caffi.pro?

Caffi.pro is a **white-label SaaS platform** that enables independent coffee shops to launch their own branded mobile ordering apps without technical knowledge. Each tenant (coffee shop) gets their own:

- ✅ Custom branded storefront (`app.caffi.pro/shop/their-slug`)
- ✅ Optional custom domain (`www.theircoffeeshop.com`)
- ✅ Full ordering, loyalty, and customer management system
- ✅ Real-time kitchen dashboard for staff
- ✅ Inventory management and analytics
- ✅ PWA capabilities (install to home screen)

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18
- npm or yarn
- Supabase account

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials

# Apply database migrations in Supabase SQL Editor
# See MASTER_BUILD_DOCUMENT.md for migration order

# Start development server
npm run dev

# Access at http://localhost:3000
```

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

---

## 📚 Documentation

### Essential Reading

1. **[MASTER_BUILD_DOCUMENT.md](./MASTER_BUILD_DOCUMENT.md)** - Complete build reference for AI agents
2. **[PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md)** - Comprehensive project overview (1,150 lines)
3. **[PROJECT_ANALYSIS_COMPREHENSIVE.md](./PROJECT_ANALYSIS_COMPREHENSIVE.md)** - Technical analysis (1,113 lines)

### Setup Guides

4. **[ENABLE_DEV_MODE.md](./ENABLE_DEV_MODE.md)** - Dev RLS policies setup (⚠️ Required)
5. **[CUSTOM_DOMAIN_SETUP.md](./CUSTOM_DOMAIN_SETUP.md)** - Custom domain configuration
6. **[MOBILE_TESTING_GUIDE.md](./MOBILE_TESTING_GUIDE.md)** - Mobile testing on Windows 11

---

## 🏗️ Architecture

### Multi-Tenant SaaS

```
┌─────────────────────────────────────┐
│     app.caffi.pro (Main Domain)     │
├─────────────────────────────────────┤
│  Admin Dashboard (/)                │
│  - Tenant, Menu, Orders, Analytics  │
├─────────────────────────────────────┤
│  Customer Shop (/shop/[slug])       │
│  - Menu, Cart, Checkout, Loyalty    │
├─────────────────────────────────────┤
│  Staff Portal (/staff)              │
│  - Kitchen, Inventory, Team, Reports│
└─────────────────────────────────────┘
```

### Tech Stack

- **Frontend:** Next.js 14 (App Router) + React 18 + TypeScript (strict)
- **Styling:** Tailwind CSS 3.4
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **State:** React Context API + TanStack React Query
- **Forms:** React Hook Form + Sonner (toasts)
- **Charts:** Recharts
- **Quality:** ESLint + Prettier + Husky

---

## ✨ Features

### Phase 1-3: Foundation ✅
- Admin dashboard with sidebar navigation
- Multi-tenant architecture with RLS
- Tenant management and onboarding

### Phase 4: Customer Shop ✅
- Menu browsing with categories and search
- Shopping cart with modifiers
- Checkout and order placement
- Real-time order tracking (5-stage timeline)
- Loyalty rewards and points
- User profile management
- Multi-domain support
- PWA capabilities

### Phase 5: Staff Operations ✅
- Real-time kitchen dashboard (Supabase Realtime)
- Order queue management with sound notifications
- Inventory tracking with low stock alerts
- Staff team management with role-based permissions
- Reports & analytics (daily/weekly/monthly)
- Order search and filtering

### Phase 6: Payments & Integrations ⏳ (Next)
- Stripe payment integration
- Email notifications (SendGrid/Resend)
- SMS notifications (Twilio)
- Analytics (Google Analytics, Mixpanel)

### Phase 7: Advanced Features ⏳
- Customer reviews and ratings
- Scheduled orders
- Subscription plans
- Gift cards
- Referral program

### Phase 8: Production Polish ⏳
- Production authentication
- Error boundaries
- Rate limiting
- Monitoring (Sentry)
- Performance optimization
- SEO optimization

---

## 🗄️ Database Schema

**24 Tables:**
- `tenants` - Coffee shop businesses
- `locations` - Physical café locations
- `categories` - Menu categories
- `menu_items` - Products with modifiers
- `customers` - Customer accounts with loyalty points
- `orders` - Orders with status tracking
- `order_items` - Line items with snapshots
- `staff_users` - Staff with roles and permissions
- `inventory_items` - Stock tracking
- `inventory_transactions` - Inventory movements
- `rewards`, `coupons`, `loyalty_transactions`, and more

See **PROJECT_CONTEXT.md** for complete schema.

---

## 💻 Development

### Commands

```bash
npm run dev              # Start dev server
npm run build            # Production build
npm run start            # Start production server
npm run lint             # ESLint
npm run lint:strict      # ESLint with no warnings
npm run type-check       # TypeScript check
```

### Pre-commit Hooks

Husky automatically runs on every commit:
1. ESLint --fix
2. TypeScript type-check
3. Prettier format

---

## ⚠️ Critical Issues

| Issue | Severity | Fix Time |
|-------|----------|----------|
| NO TEST COVERAGE (0%) | 🔴 CRITICAL | ~1 week |
| Auth bypass in dev mode | 🔴 CRITICAL | 5 mins |
| Hardcoded 10% tax rate | 🟡 HIGH | 30 mins |
| Modal duplication (1,161 lines) | 🟡 HIGH | 2 hours |

See **PROJECT_ANALYSIS_COMPREHENSIVE.md** for complete technical debt analysis.

---

## 📊 Project Metrics

- **TypeScript Files:** 85 files (~8,000 LOC)
- **Components:** 24 reusable components
- **Pages:** 38+ routes
- **Database:** 24 tables (4,813 SQL lines)
- **Test Coverage:** 0% ⚠️
- **Type Safety:** TypeScript strict ✓
- **Dependencies:** 11 core + 12 dev (all used, no bloat)

---

## 🔒 Security

- Multi-tenant Row-Level Security (RLS) on all tables
- JWT-based authentication with Supabase Auth
- Separate auth contexts for admin, customer, and staff
- ⚠️ Currently in dev mode (auth bypassed) - must enable for production

---

## 📱 PWA Support

- Manifest configured (`public/manifest.json`)
- Service worker ready (`public/sw.js`)
- Installable to home screen
- Offline capabilities
- **Note:** PWA icons need to be generated (see `public/ICONS_NEEDED.md`)

---

## 🤝 Contributing

This project uses AI agents (Claude) for development. When working on this project:

1. Read **MASTER_BUILD_DOCUMENT.md** first
2. Follow TypeScript strict mode
3. Respect multi-tenancy (never leak data across tenants)
4. Use existing contexts (don't create new state management)
5. Follow naming conventions (see best practices in master doc)
6. Run `npm run lint:strict` before committing
7. Apply dev mode RLS migration before creating tenants

---

## 📝 License

[Add your license here]

---

## 🎉 Acknowledgments

Built with Next.js, Supabase, and Tailwind CSS.
Developed with assistance from Claude (Anthropic AI).

---

**For complete documentation, see [MASTER_BUILD_DOCUMENT.md](./MASTER_BUILD_DOCUMENT.md)**
