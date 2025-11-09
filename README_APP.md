# Caffi.pro Admin Dashboard

A beautiful, responsive analytics dashboard for the Caffi.pro multi-tenant coffee shop SaaS platform.

Built with **Next.js 14**, **TypeScript**, **Supabase**, **Recharts**, and **Tailwind CSS**.

## 🎯 Features

### Analytics Dashboard (`/analytics`)

1. **Summary Cards** - Key metrics at a glance:
   - Total revenue from completed orders
   - Total order count
   - New user signups
   - Growth percentages vs previous period

2. **Revenue Line Chart**:
   - Daily revenue trends over time
   - Interactive tooltips with exact values
   - Clean, modern design

3. **Orders Bar Chart**:
   - Orders per day broken down by status
   - Color-coded by order status:
     - ✅ Completed (green)
     - 🔄 Preparing (orange)
     - ✔️ Confirmed (blue)
     - ⏳ Pending (gray)
     - ❌ Cancelled (red)
   - Stacked visualization

4. **User Growth Area Chart**:
   - Cumulative user growth over time
   - Beautiful gradient fill
   - Shows total user base expansion

5. **Date Range Filters**:
   - Quick filters: 7 days, 30 days, 90 days, All time
   - Automatically updates all charts and metrics
   - Calculates growth vs previous period

6. **Top 5 Tenants Table**:
   - Ranked by total revenue
   - Medal-style badges for top 3
   - Formatted currency display

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase project with the Caffi.pro schema applied
- Supabase Service Role Key

### Installation

1. **Install dependencies**:
```bash
npm install
```

2. **Set up environment variables**:
```bash
# Copy the example file
cp .env.local.example .env.local

# Edit .env.local and add your Supabase credentials:
# - SUPABASE_URL (your project URL)
# - SUPABASE_SERVICE_ROLE_KEY (from Supabase Dashboard > Settings > API)
```

3. **Run the development server**:
```bash
npm run dev
```

4. **Open your browser**:
```
http://localhost:3000
```

## 📊 Database Schema

The analytics dashboard queries the following Supabase tables:

- `orders` - Order data with totals, status, and timestamps
- `users` - Customer signup data
- `tenants` - Café business information

Make sure you have the migrations applied from the `/supabase/migrations` directory.

## 🎨 Design

The dashboard features:
- **Responsive design** - Works beautifully on desktop, tablet, and mobile
- **Professional color scheme** - Based on Caffi.pro brand colors
- **Smooth animations** - Loading states and hover effects
- **Accessible** - High contrast, keyboard navigation support
- **Modern UI** - Clean cards, charts, and typography

## 🔧 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Charts**: Recharts
- **Styling**: Tailwind CSS
- **Date handling**: date-fns

## 📁 Project Structure

```
/workspace
├── app/
│   ├── analytics/
│   │   └── page.tsx          # Analytics dashboard page
│   ├── layout.tsx             # Root layout
│   ├── page.tsx               # Homepage
│   └── globals.css            # Global styles
├── lib/
│   └── supabase.ts            # Supabase client configuration
├── supabase/
│   └── migrations/            # Database migrations
├── .env.local.example         # Environment variables template
├── package.json               # Dependencies
├── tailwind.config.ts         # Tailwind configuration
└── tsconfig.json              # TypeScript configuration
```

## 🔒 Security

- Uses Supabase Service Role Key for server-side queries
- Service role key should **NEVER** be exposed to the client
- Keep `.env.local` in `.gitignore` (already configured)
- Row Level Security (RLS) policies are applied in Supabase

## 📈 Performance

- Client-side data fetching with loading states
- Efficient date range filtering
- Optimized chart rendering with Recharts
- Fast page loads with Next.js App Router

## 🛠️ Development

### Building for production:
```bash
npm run build
npm start
```

### Linting:
```bash
npm run lint
```

## 📝 License

See LICENSE file for details.

## 🎉 Next Steps

- Add real-time data updates with Supabase subscriptions
- Implement user authentication for the admin dashboard
- Add export functionality (CSV, PDF)
- Create more detailed reports (menu items, locations, etc.)
- Add data visualization for loyalty programs
- Implement tenant-specific dashboards

---

Built with ❤️ for coffee shop owners everywhere ☕
<<<<<<< HEAD
=======

>>>>>>> origin/main
