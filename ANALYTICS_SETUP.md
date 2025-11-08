# Analytics Dashboard Setup Guide

Welcome! You now have a complete Next.js 14 analytics dashboard for Caffi.pro. 

## ✅ What's Been Created

### Application Structure
```
/workspace
├── app/
│   ├── analytics/
│   │   └── page.tsx          ✨ Analytics dashboard (main feature)
│   ├── layout.tsx             📐 Root layout with Inter font
│   ├── page.tsx               🏠 Homepage with navigation
│   └── globals.css            🎨 Global styles with Tailwind
│
├── lib/
│   └── supabase.ts            🔌 Supabase client configuration
│
├── Configuration files
├── package.json               📦 All dependencies included
├── tsconfig.json              ⚙️ TypeScript configuration
├── tailwind.config.ts         🎨 Tailwind with brand colors
├── next.config.js             ⚙️ Next.js configuration
├── postcss.config.js          ⚙️ PostCSS for Tailwind
└── .eslintrc.json             ✅ ESLint configuration
```

## 🚀 Quick Start (3 steps)

### Step 1: Install Dependencies
```bash
npm install
```

This will install:
- ✅ Next.js 14
- ✅ React 18
- ✅ TypeScript
- ✅ Supabase client
- ✅ Recharts (for charts)
- ✅ date-fns (for date handling)
- ✅ Tailwind CSS

### Step 2: Configure Environment Variables
```bash
# Copy the example file
cp .env.local.example .env.local

# Then edit .env.local and add your actual service role key
```

Get your `SUPABASE_SERVICE_ROLE_KEY` from:
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project (ugppbaavzevmdkblniim)
3. Settings > API
4. Copy the `service_role` key (⚠️ keep this secret!)

Your `.env.local` should look like:
```env
NEXT_PUBLIC_SUPABASE_URL=https://ugppbaavzevmdkblniim.supabase.co
SUPABASE_URL=https://ugppbaavzevmdkblniim.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (your actual key here)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc... (already provided)
```

### Step 3: Run the Development Server
```bash
npm run dev
```

Then open: **http://localhost:3000** 🎉

## 📊 Analytics Dashboard Features

Navigate to `/analytics` to see:

### 1. Summary Cards (Top Row)
- 💰 **Total Revenue** - Sum of all completed orders
- 📦 **Total Orders** - Count of all orders
- 👥 **New Users** - User signups
- 📈 **Growth %** - Comparison with previous period

### 2. Revenue Line Chart
- Shows daily revenue over time
- Interactive tooltips
- Smooth line with highlighted points
- Formatted in EUR currency

### 3. Orders Bar Chart
- Orders per day broken down by status
- Stacked bars with color coding:
  - 🟢 Completed
  - 🟠 Preparing
  - 🔵 Confirmed
  - ⚫ Pending
  - 🔴 Cancelled

### 4. User Growth Area Chart
- **Cumulative** user count over time
- Beautiful gradient fill effect
- Shows total user base expansion

### 5. Date Range Filters
Four quick filters at the top:
- **7D** - Last 7 days
- **30D** - Last 30 days (default)
- **90D** - Last 90 days
- **ALL TIME** - All available data

When you change the filter:
- All charts update automatically
- Summary cards recalculate
- Growth percentages adjust to match the period

### 6. Top 5 Tenants Table
- Ranked by total revenue
- Medal-style badges (🥇🥈🥉)
- Formatted currency display
- Shows business names

## 🎨 Design Details

### Colors
Based on your Caffi.pro brand:
- **Primary**: `#2D5F5D` (Teal)
- **Secondary**: `#F4A259` (Orange)
- **Accent**: `#E07A5F` (Coral)

### Typography
- Font: Inter (clean, modern, readable)
- Responsive sizing
- Proper hierarchy

### Responsive Design
- ✅ Mobile (320px+)
- ✅ Tablet (768px+)
- ✅ Desktop (1024px+)
- ✅ Large screens (1920px+)

## 🔍 How It Works

### Data Flow
1. **Client Component** (`'use client'` directive)
2. **React State** for loading and data management
3. **useEffect Hook** triggers data fetching on mount and date change
4. **Supabase Queries** fetch from your database:
   - `orders` table (revenue, counts, status)
   - `users` table (signups, growth)
   - `tenants` table (business names)
5. **Data Processing** groups and formats for charts
6. **Recharts** renders beautiful, interactive visualizations

### Growth Calculation
The dashboard calculates growth by:
1. Getting current period data (e.g., last 30 days)
2. Getting previous period data (e.g., 30 days before that)
3. Calculating percentage change: `((current - previous) / previous) * 100`
4. Showing with green (positive) or red (negative) badges

## 📦 Database Requirements

Make sure your Supabase database has:
- ✅ `orders` table with columns: `created_at`, `status`, `total`, `tenant_id`
- ✅ `users` table with columns: `created_at`, `user_id`
- ✅ `tenants` table with columns: `tenant_id`, `business_name`

These should already be set up from your migrations in `/supabase/migrations/`.

## 🧪 Testing with Sample Data

If you don't have data yet, you can add test data:

```sql
-- Run this in Supabase SQL Editor
INSERT INTO orders (tenant_id, user_id, location_id, order_number, status, subtotal, total, created_at)
SELECT 
  (SELECT tenant_id FROM tenants LIMIT 1),
  (SELECT user_id FROM users LIMIT 1),
  (SELECT location_id FROM locations LIMIT 1),
  '#' || generate_series(1, 100),
  (ARRAY['pending', 'completed', 'cancelled'])[floor(random() * 3 + 1)],
  random() * 50 + 10,
  random() * 50 + 10,
  NOW() - (random() * interval '30 days');
```

## 🚀 Production Build

When ready to deploy:

```bash
# Build for production
npm run build

# Start production server
npm start
```

## 🔐 Security Best Practices

✅ **Already Implemented:**
- Service role key is server-side only (not exposed to browser)
- `.env.local` is in `.gitignore`
- TypeScript for type safety
- Next.js 14 App Router (secure by default)

⚠️ **Remember:**
- Never commit `.env.local` to git
- Never share your service role key
- Keep dependencies updated: `npm audit`

## 🐛 Troubleshooting

### "Cannot find module '@supabase/supabase-js'"
```bash
npm install
```

### "Missing environment variables"
Check that `.env.local` exists and has all required keys.

### "No data showing"
1. Check that migrations are applied to Supabase
2. Verify database has data
3. Check browser console for errors
4. Confirm service role key is correct

### Port 3000 already in use
```bash
# Use a different port
npm run dev -- -p 3001
```

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Recharts Documentation](https://recharts.org)
- [Tailwind CSS](https://tailwindcss.com/docs)

## 🎉 What's Next?

Consider adding:
- 🔐 Admin authentication
- 📧 Email reports
- 📊 More chart types (pie charts, heatmaps)
- 📥 Export to CSV/PDF
- 🔔 Real-time updates with Supabase subscriptions
- 📱 Mobile app version
- 🎯 Tenant-specific dashboards
- 🏆 Leaderboards
- 📈 Predictive analytics

---

**You're all set!** 🎉 

Run `npm install && npm run dev` and visit `http://localhost:3000/analytics` to see your dashboard.

Questions? Check the README_APP.md for more details.
