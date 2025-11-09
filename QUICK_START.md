# 🚀 Quick Start - Analytics Dashboard

## Install & Run (3 Commands)

```bash
# 1. Install dependencies
npm install

# 2. Set up environment (add your service role key)
cp .env.local.example .env.local
# Edit .env.local and add your SUPABASE_SERVICE_ROLE_KEY

# 3. Run the app
npm run dev
```

Then visit: **http://localhost:3000/analytics**

---

## What You'll See

✅ **4 Summary Cards** - Revenue, Orders, Users, Growth %  
✅ **Revenue Line Chart** - Daily revenue trends  
✅ **Orders Bar Chart** - Orders by status per day  
✅ **User Growth Chart** - Cumulative users over time  
✅ **Date Filters** - 7d, 30d, 90d, All time  
✅ **Top 5 Tenants** - By revenue  

---

## File Structure

```
app/
├── analytics/page.tsx    ← Main dashboard (750+ lines)
├── page.tsx              ← Homepage
├── layout.tsx            ← Root layout
└── globals.css           ← Styles

lib/
└── supabase.ts           ← Supabase client
```

---

## Features Checklist

- [x] Summary cards with growth percentages
- [x] Revenue line chart (Recharts)
- [x] Orders bar chart (color-coded by status)
- [x] User growth area chart (gradient fill)
- [x] Date range filters (7d/30d/90d/all)
- [x] Top 5 tenants table
- [x] Responsive design
- [x] Beautiful UI with Tailwind
- [x] TypeScript
- [x] Service role key for secure queries

---

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: Supabase
- **Charts**: Recharts
- **Styling**: Tailwind CSS
- **Dates**: date-fns

---

See **ANALYTICS_SETUP.md** for detailed documentation.
<<<<<<< HEAD
=======

>>>>>>> origin/main
