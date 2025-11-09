# 📊 TASK 2: Analytics Dashboard (HIGH PRIORITY)

## 📋 Task Overview
**Estimated Time:** 6-8 hours  
**Difficulty:** Medium  
**Priority:** 🟡 HIGH VALUE

---

## 🎯 What to Build

Create a comprehensive analytics dashboard with charts and metrics.

---

## 📝 Detailed Requirements

### **1. Analytics Page**
**File:** `admin-dashboard/app/analytics/page.tsx`

**Sections:**
1. Summary Cards (Revenue, Orders, Users, Growth %)
2. Revenue Chart (Line chart over time)
3. Orders Chart (Bar chart by day/week)
4. User Growth Chart (Area chart)
5. Top Tenants Table (by revenue)
6. Date Range Filter

---

### **2. Revenue Chart Component**
**File:** `admin-dashboard/components/charts/RevenueChart.tsx`

**Requirements:**
- Line chart showing revenue over time
- X-axis: dates
- Y-axis: revenue in EUR
- Tooltip on hover
- Responsive design
- Use Recharts library

**Data Source:**
```sql
SELECT 
  DATE(created_at) as date,
  SUM(total) as revenue
FROM orders
WHERE status = 'completed'
  AND created_at >= [start_date]
GROUP BY DATE(created_at)
ORDER BY date
```

---

### **3. Orders Chart Component**
**File:** `admin-dashboard/components/charts/OrdersChart.tsx`

**Requirements:**
- Bar chart showing orders per day
- Color-coded by status
- Tooltip with details
- Responsive

**Data Source:**
```sql
SELECT 
  DATE(created_at) as date,
  status,
  COUNT(*) as count
FROM orders
WHERE created_at >= [start_date]
GROUP BY DATE(created_at), status
ORDER BY date
```

---

### **4. User Growth Chart**
**File:** `admin-dashboard/components/charts/UserGrowthChart.tsx`

**Requirements:**
- Area chart showing cumulative users
- Smooth curve
- Gradient fill
- Responsive

**Data Source:**
```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as new_users
FROM users
WHERE created_at >= [start_date]
GROUP BY DATE(created_at)
ORDER BY date
```

---

### **5. Date Range Filter**
**File:** `admin-dashboard/components/DateRangeFilter.tsx`

**Requirements:**
- Quick filters: Today, Last 7 days, Last 30 days, Last 90 days, All time
- Custom date range picker (optional)
- Update all charts when changed
- Persist in URL params

---

## 🔧 Technical Implementation

### **Step 1: Create Analytics Page**

```typescript
import { createClient } from '@supabase/supabase-js'
import RevenueChart from '@/components/charts/RevenueChart'
import OrdersChart from '@/components/charts/OrdersChart'
import UserGrowthChart from '@/components/charts/UserGrowthChart'

async function getAnalyticsData(dateRange: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  // Calculate date range
  const startDate = calculateStartDate(dateRange)
  
  // Fetch revenue data
  const { data: revenueData } = await supabase
    .from('orders')
    .select('created_at, total')
    .eq('status', 'completed')
    .gte('created_at', startDate)
  
  // Process data for charts
  // Return formatted data
}

export default async function AnalyticsPage() {
  const data = await getAnalyticsData('30d')
  
  return (
    <div>
      {/* Summary cards */}
      {/* Charts */}
    </div>
  )
}
```

---

### **Step 2: Create Chart Components**

**Use Recharts:**
```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function RevenueChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="revenue" stroke="#2563eb" />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

---

### **Step 3: Add Date Range Filter**

**Create client component:**
```typescript
'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export default function DateRangeFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const handleChange = (range: string) => {
    router.push(`/analytics?range=${range}`)
  }
  
  return (
    <select onChange={(e) => handleChange(e.target.value)}>
      <option value="7d">Last 7 days</option>
      <option value="30d">Last 30 days</option>
      <option value="90d">Last 90 days</option>
      <option value="all">All time</option>
    </select>
  )
}
```

---

## 🎨 UI Layout

```
┌─────────────────────────────────────────────────────────┐
│ Analytics                          [Last 30 days ▼]     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [€12,345]    [1,234]     [567]      [+23%]            │
│  Revenue      Orders      Users      Growth             │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  Revenue Over Time                             │    │
│  │  [Line Chart]                                  │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌──────────────────────┐  ┌──────────────────────┐   │
│  │  Orders by Day       │  │  User Growth         │   │
│  │  [Bar Chart]         │  │  [Area Chart]        │   │
│  └──────────────────────┘  └──────────────────────┘   │
│                                                          │
│  Top Tenants by Revenue                                 │
│  ┌────────────────────────────────────────────────┐    │
│  │ 1. Blue Bottle      €5,432                     │    │
│  │ 2. Sunrise Coffee   €3,211                     │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Data Queries

### **Revenue Over Time:**
```typescript
const { data: revenueData } = await supabase
  .from('orders')
  .select('created_at, total')
  .eq('status', 'completed')
  .gte('created_at', startDate)
  .order('created_at')

// Group by date
const revenueByDate = groupByDate(revenueData, 'created_at', 'total')
```

### **Orders by Status:**
```typescript
const { data: ordersData } = await supabase
  .from('orders')
  .select('created_at, status')
  .gte('created_at', startDate)

// Group by date and status
const ordersByDate = groupByDateAndStatus(ordersData)
```

### **User Growth:**
```typescript
const { data: usersData } = await supabase
  .from('users')
  .select('created_at')
  .gte('created_at', startDate)
  .order('created_at')

// Calculate cumulative count
const userGrowth = calculateCumulative(usersData)
```

### **Top Tenants:**
```typescript
const { data: topTenants } = await supabase
  .from('orders')
  .select(`
    tenant_id,
    tenants(business_name),
    total
  `)
  .eq('status', 'completed')
  .gte('created_at', startDate)

// Group by tenant and sum
const tenantRevenue = groupByTenant(topTenants)
```

---

## 🧪 Testing Checklist

- [ ] Analytics page loads without errors
- [ ] All charts render correctly
- [ ] Revenue chart shows data
- [ ] Orders chart shows data
- [ ] User growth chart shows data
- [ ] Top tenants list shows data
- [ ] Date range filter works
- [ ] Charts update when filter changes
- [ ] Responsive on mobile
- [ ] No console errors

---

## 📚 Resources

**Recharts Examples:**
- [Line Chart](https://recharts.org/en-US/examples/SimpleLineChart)
- [Bar Chart](https://recharts.org/en-US/examples/SimpleBarChart)
- [Area Chart](https://recharts.org/en-US/examples/SimpleAreaChart)

**Date Handling:**
- Use `date-fns` (already installed)
- Format dates: `format(date, 'MMM dd')`
- Calculate ranges: `subDays(new Date(), 30)`

---

## 🚀 Quick Start for Cursor

**Copy this:**

```
I'm working on the Caffi.pro admin dashboard (Next.js 14, TypeScript, Supabase).

TASK: Build analytics dashboard with charts

Requirements:
1. Create app/analytics/page.tsx
2. Add 4 summary cards (revenue, orders, users, growth %)
3. Create RevenueChart component (Recharts line chart)
4. Create OrdersChart component (Recharts bar chart)
5. Create UserGrowthChart component (Recharts area chart)
6. Add date range filter (7d, 30d, 90d, all time)
7. Show top 5 tenants by revenue
8. Make it responsive

Tech:
- Use Recharts for charts (already installed)
- Use date-fns for date handling
- Fetch data from Supabase orders and users tables
- Use service role key (process.env.SUPABASE_SERVICE_ROLE_KEY)

Please implement this with beautiful, professional design.
```

---

**Status:** 📋 Ready to assign  
**Priority:** 🟡 HIGH  
**Dependencies:** None  
**Estimated Completion:** 6-8 hours

