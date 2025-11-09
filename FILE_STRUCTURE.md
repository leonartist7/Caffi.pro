# 📂 Project File Structure

Complete overview of your Caffi.Pro Admin Dashboard file organization.

## 🌳 Directory Tree

```
/workspace/
├── 📄 Configuration Files
│   ├── package.json                 # Dependencies and scripts
│   ├── tsconfig.json               # TypeScript config
│   ├── tsconfig.node.json          # TypeScript Node config
│   ├── vite.config.ts              # Vite build config
│   ├── tailwind.config.js          # Tailwind CSS config
│   ├── postcss.config.js           # PostCSS config
│   ├── .eslintrc.cjs               # ESLint rules
│   ├── .gitignore                  # Git exclusions
│   └── .env.example                # Environment template
│
├── 📚 Documentation
│   ├── PROJECT_SUMMARY.md          # ⭐ Start here - Complete overview
│   ├── QUICKSTART.md               # Quick setup guide
│   ├── DASHBOARD_README.md         # Full documentation
│   ├── DASHBOARD_FEATURES.md       # Feature reference
│   └── FILE_STRUCTURE.md           # This file
│
├── 🗄️ Database (Supabase)
│   └── supabase/
│       ├── migrations/
│       │   ├── 20250107000001_initial_schema.sql
│       │   ├── 20250107000002_rls_policies.sql
│       │   ├── 20250107000003_database_functions.sql
│       │   └── 20250107000004_auth_setup.sql
│       ├── seed/
│       │   └── 01_test_tenants.sql
│       └── supabase/
│           └── config.toml
│
├── 🌐 Public Assets
│   ├── index.html                  # Entry HTML
│   └── public/
│       └── vite.svg                # Vite logo
│
└── 💻 Source Code (src/)
    ├── 🚀 Application Core
    │   ├── main.tsx                # React initialization
    │   ├── App.tsx                 # Main app + routing
    │   └── index.css               # Global styles
    │
    ├── 📚 Libraries & Utilities
    │   └── lib/
    │       ├── supabase.ts         # Supabase client
    │       ├── database.types.ts   # TypeScript types
    │       └── imageUpload.ts      # Image upload utilities
    │
    ├── 🎨 Layout Components
    │   └── components/
    │       └── layout/
    │           └── DashboardLayout.tsx  # Main layout + nav
    │
    ├── 📄 Feature Pages (7 pages)
    │   └── pages/
    │       ├── Overview.tsx             # Dashboard home
    │       ├── MenuManagement.tsx       # Menu & categories
    │       ├── CouponManagement.tsx     # Discount coupons
    │       ├── NotificationsManagement.tsx  # Push campaigns
    │       ├── LocationsManagement.tsx  # Café locations
    │       ├── RewardsManagement.tsx    # Loyalty rewards
    │       └── TenantSettings.tsx       # Settings (4 tabs)
    │
    └── 🔧 Feature Components
        └── components/
            ├── menu/
            │   ├── MenuItemModal.tsx    # Add/edit menu items
            │   └── CategoryModal.tsx    # Add/edit categories
            ├── coupons/
            │   └── CouponModal.tsx      # Add/edit coupons
            ├── notifications/
            │   └── NotificationModal.tsx # Create campaigns
            ├── locations/
            │   └── LocationModal.tsx    # Add/edit locations
            └── rewards/
                └── RewardModal.tsx      # Add/edit rewards
```

---

## 📊 File Count by Type

| Type | Count | Purpose |
|------|-------|---------|
| **React Components** | 14 | UI pages and modals |
| **TypeScript Files** | 4 | Utilities and types |
| **Configuration** | 9 | Build and tool config |
| **Documentation** | 5 | Guides and references |
| **Database** | 5 | SQL migrations and seeds |
| **Styles** | 1 | Global CSS |
| **HTML** | 1 | Entry point |
| **Total** | **39 files** | Complete dashboard |

---

## 🎯 Key Files to Know

### 🚀 Start Here
1. **`PROJECT_SUMMARY.md`** - Overview of everything
2. **`QUICKSTART.md`** - Get started in 5 minutes
3. **`package.json`** - Install dependencies with `npm install`
4. **`.env.example`** - Copy to `.env` and configure

### 📝 Configuration
- **`vite.config.ts`** - Adjust build settings
- **`tailwind.config.js`** - Customize colors and theme
- **`tsconfig.json`** - TypeScript compiler options

### 💻 Application Entry
- **`src/main.tsx`** - React app initialization
- **`src/App.tsx`** - Routing configuration
- **`src/index.css`** - Global styles and Tailwind

### 🔌 Core Libraries
- **`src/lib/supabase.ts`** - Database client
- **`src/lib/database.types.ts`** - Type definitions
- **`src/lib/imageUpload.ts`** - Image upload logic

### 🎨 Layout
- **`src/components/layout/DashboardLayout.tsx`** - Navigation and layout

### 📄 Pages (Routes)
- **`src/pages/Overview.tsx`** → `/overview`
- **`src/pages/MenuManagement.tsx`** → `/menu`
- **`src/pages/CouponManagement.tsx`** → `/coupons`
- **`src/pages/NotificationsManagement.tsx`** → `/notifications`
- **`src/pages/LocationsManagement.tsx`** → `/locations`
- **`src/pages/RewardsManagement.tsx`** → `/rewards`
- **`src/pages/TenantSettings.tsx`** → `/settings`

---

## 🗂️ Component Organization

### Modal Components
All modals follow the same pattern:
- Props: `isOpen`, `onClose`, `item` (optional for editing)
- Form validation with React Hook Form
- Mutation with TanStack Query
- Toast notifications for feedback

### Page Components
All pages follow the same pattern:
- Header with title and action buttons
- Data fetching with React Query
- Grid/list view of items
- Modal for create/edit operations
- Delete confirmations

---

## 🎨 Styling Structure

### Tailwind Utilities (`src/index.css`)
- **`.btn`** - Button base styles
- **`.btn-primary`** - Primary button
- **`.btn-secondary`** - Secondary button
- **`.btn-danger`** - Danger button
- **`.input`** - Form input styles
- **`.card`** - Card container
- **`.badge`** - Status badges

### Color Palette (`tailwind.config.js`)
- **Primary**: Teal/Green - `#2D5F5D`
- **Accent**: Warm Orange - `#F4A259`
- **Secondary**: Coral - `#E07A5F`

---

## 📦 Dependencies

### Production
- `react` & `react-dom` - UI framework
- `react-router-dom` - Navigation
- `@supabase/supabase-js` - Database
- `@tanstack/react-query` - Data fetching
- `react-hook-form` - Forms
- `date-fns` - Date utilities
- `lucide-react` - Icons
- `sonner` - Notifications
- `zustand` - State (optional)
- `recharts` - Charts (optional)

### Development
- `vite` - Build tool
- `typescript` - Type checking
- `tailwindcss` - Styling
- `eslint` - Linting
- `@types/*` - Type definitions

---

## 🔄 Data Flow

```
User Action
    ↓
Component Event Handler
    ↓
React Query Mutation
    ↓
Supabase Client
    ↓
PostgreSQL Database
    ↓
Response
    ↓
Query Cache Invalidation
    ↓
UI Update + Toast Notification
```

---

## 🚀 Build Output

When you run `npm run build`:

```
dist/
├── assets/
│   ├── index-[hash].js      # Bundled JavaScript
│   └── index-[hash].css     # Bundled CSS
└── index.html               # Optimized HTML
```

---

## 📱 Responsive Breakpoints

The dashboard is responsive with Tailwind breakpoints:
- **Mobile**: < 640px (sm)
- **Tablet**: 640px - 1024px (md, lg)
- **Desktop**: > 1024px (lg, xl)

---

## 🎯 Navigation Structure

```
Dashboard (/)
├── Overview (/overview)
├── Menu (/menu)
│   ├── Categories (sidebar)
│   └── Menu Items (grid)
├── Coupons (/coupons)
│   └── Coupon List (table)
├── Notifications (/notifications)
│   └── Campaign List (cards)
├── Locations (/locations)
│   └── Location Cards (grid)
├── Rewards (/rewards)
│   └── Reward Catalog (grid)
└── Settings (/settings)
    ├── General (tab)
    ├── Features (tab)
    ├── Loyalty (tab)
    └── Branding (tab)
```

---

## 🔐 Environment Variables

Required in `.env`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Optional:
```
VITE_ENABLE_DEBUG=true
VITE_API_TIMEOUT=30000
```

---

## 📝 Quick Commands

```bash
# Development
npm run dev          # Start dev server
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # Run ESLint

# Common Tasks
npm install          # Install dependencies
npm run build        # Build for production
npm run preview      # Test production build
```

---

## 🎓 Learning Path

1. **Start with**: `PROJECT_SUMMARY.md`
2. **Setup**: `QUICKSTART.md`
3. **Explore**: `src/pages/Overview.tsx`
4. **Understand patterns**: Compare similar pages
5. **Customize**: Modify colors, add features
6. **Deploy**: Build and host

---

## ✨ Pro Tips

### Finding Things
- **All pages**: Look in `src/pages/`
- **All modals**: Look in `src/components/*/`
- **Types**: Check `src/lib/database.types.ts`
- **Styles**: See `src/index.css` and `tailwind.config.js`

### Adding Features
1. Create page in `src/pages/`
2. Add route in `src/App.tsx`
3. Add navigation in `src/components/layout/DashboardLayout.tsx`
4. Create modal if needed in `src/components/`

### Debugging
- Check browser console for errors
- Review React Query DevTools (add package)
- Check Supabase logs for database issues
- Verify environment variables are set

---

**Your dashboard is fully organized and ready to use!** 🎉

