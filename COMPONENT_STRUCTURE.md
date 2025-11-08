# Analytics Dashboard - Component Structure

## 📐 Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│                    ANALYTICS DASHBOARD                       │
│                   Track Your Performance                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  [7D]  [30D]  [90D]  [ALL TIME]  ← Date Range Filters      │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┬──────────────────┬──────────────────────┐
│  Total Revenue   │  Total Orders    │  Total Users         │
│  €12,345.67     │   1,234          │   567                │
│  +15.3% ↑       │   +8.2% ↑        │   +12.1% ↑          │
└──────────────────┴──────────────────┴──────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Revenue Over Time                                          │
│  ┌────────────────────────────────────────────────────┐    │
│  │         📈 LINE CHART                              │    │
│  │  €200 ┤     ╱╲    ╱╲                              │    │
│  │  €150 ┤   ╱    ╲╱    ╲╱╲                         │    │
│  │  €100 ┤ ╱                ╲╱╲                     │    │
│  │       └───────────────────────────                │    │
│  │         Jan 1  Jan 8  Jan 15  Jan 22             │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Orders by Status                                           │
│  ┌────────────────────────────────────────────────────┐    │
│  │         📊 BAR CHART (Stacked)                     │    │
│  │       ███  ███  ███  ███  ███                     │    │
│  │       ███  ███  ███  ███  ███                     │    │
│  │       ███  ███  ███  ███  ███                     │    │
│  │       Jan1 Jan8 Jan15 Jan22 Jan29                 │    │
│  │       ▓ Completed  ▓ Preparing  ▓ Confirmed       │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  User Growth                                                │
│  ┌────────────────────────────────────────────────────┐    │
│  │         📈 AREA CHART (Gradient)                   │    │
│  │  500 ┤                            ╱▓▓▓▓▓▓▓        │    │
│  │  400 ┤                      ╱▓▓▓▓▓               │    │
│  │  300 ┤              ╱▓▓▓▓▓▓                      │    │
│  │  200 ┤      ╱▓▓▓▓▓▓                             │    │
│  │       └───────────────────────────               │    │
│  │         Jan 1  Jan 8  Jan 15  Jan 22            │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Top 5 Tenants by Revenue                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │ 🥇  Coffee House A          €5,432.10            │    │
│  │ 🥈  Café Mocha B             €4,123.45            │    │
│  │ 🥉  Espresso Bar C           €3,876.20            │    │
│  │ 4️⃣   Bean & Brew D            €2,543.80            │    │
│  │ 5️⃣   Java Joint E             €1,987.50            │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## 🧩 Component Breakdown

### Main Component: `AnalyticsPage`
```typescript
AnalyticsPage
├── Date Range Filter (Buttons)
│   ├── 7D Button
│   ├── 30D Button (default)
│   ├── 90D Button
│   └── ALL TIME Button
│
├── Summary Cards (Grid)
│   ├── Revenue Card (Green border)
│   │   ├── Total Revenue (EUR)
│   │   └── Growth Badge (+/- %)
│   ├── Orders Card (Blue border)
│   │   ├── Total Orders Count
│   │   └── Growth Badge (+/- %)
│   └── Users Card (Purple border)
│       ├── Total Users Count
│       └── Growth Badge (+/- %)
│
├── Revenue Chart (Card)
│   └── LineChart (Recharts)
│       ├── X-Axis (Dates)
│       ├── Y-Axis (EUR)
│       ├── Tooltip (Interactive)
│       └── Legend
│
├── Orders Chart (Card)
│   └── BarChart (Recharts, Stacked)
│       ├── X-Axis (Dates)
│       ├── Y-Axis (Order Count)
│       ├── Bars by Status (5 colors)
│       ├── Tooltip (Interactive)
│       └── Legend
│
├── User Growth Chart (Card)
│   └── AreaChart (Recharts)
│       ├── X-Axis (Dates)
│       ├── Y-Axis (User Count)
│       ├── Gradient Fill
│       ├── Tooltip (Interactive)
│       └── Legend
│
└── Top Tenants Table (Card)
    └── Table
        ├── Header Row
        │   ├── Rank
        │   ├── Business Name
        │   └── Revenue
        └── Data Rows (5)
            ├── Medal Badge (🥇🥈🥉)
            ├── Business Name
            └── Revenue (EUR)
```

## 🔄 Data Flow

```
┌──────────────┐
│   User       │
│   Clicks     │
│   Filter     │
└──────┬───────┘
       │
       ↓
┌──────────────────────────────────┐
│  setDateRange('30d')             │
│  Triggers useEffect              │
└──────┬───────────────────────────┘
       │
       ↓
┌──────────────────────────────────┐
│  fetchAnalyticsData()            │
│  - Calculate date range          │
│  - Set loading = true            │
└──────┬───────────────────────────┘
       │
       ├───→ fetchSummaryData()
       │     ├─→ Query orders
       │     ├─→ Query users
       │     ├─→ Calculate totals
       │     └─→ Calculate growth %
       │
       ├───→ fetchRevenueData()
       │     ├─→ Query completed orders
       │     ├─→ Group by date
       │     └─→ Format for chart
       │
       ├───→ fetchOrdersData()
       │     ├─→ Query all orders
       │     ├─→ Group by date + status
       │     └─→ Format for chart
       │
       ├───→ fetchUserGrowthData()
       │     ├─→ Query users
       │     ├─→ Calculate cumulative
       │     └─→ Format for chart
       │
       └───→ fetchTopTenants()
             ├─→ Query orders + tenants
             ├─→ Group by tenant
             ├─→ Sort by revenue
             └─→ Take top 5
       │
       ↓
┌──────────────────────────────────┐
│  Set state with results          │
│  - setSummary()                  │
│  - setRevenueData()              │
│  - setOrdersData()               │
│  - setUserGrowthData()           │
│  - setTopTenants()               │
│  - setLoading(false)             │
└──────┬───────────────────────────┘
       │
       ↓
┌──────────────────────────────────┐
│  React re-renders                │
│  - Charts update                 │
│  - Cards update                  │
│  - Table updates                 │
└──────────────────────────────────┘
```

## 📊 State Management

```typescript
// Date Range
const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')

// Loading State
const [loading, setLoading] = useState(true)

// Summary Data
const [summary, setSummary] = useState({
  totalRevenue: number,
  totalOrders: number,
  totalUsers: number,
  revenueGrowth: number,
  ordersGrowth: number,
  usersGrowth: number
})

// Chart Data
const [revenueData, setRevenueData] = useState<Array<{date, revenue}>>([])
const [ordersData, setOrdersData] = useState<Array<{date, ...statuses}>>([])
const [userGrowthData, setUserGrowthData] = useState<Array<{date, users}>>([])

// Table Data
const [topTenants, setTopTenants] = useState<Array<{tenant_id, business_name, revenue}>>([])
```

## 🎨 Styling Approach

```css
/* Card Style */
.card {
  @apply bg-white rounded-xl shadow-md p-6;
}

/* Summary Cards */
.summary-card {
  @apply card border-l-4;
  /* border-color: green/blue/purple based on type */
}

/* Growth Badge */
.growth-badge {
  @apply px-2 py-1 rounded text-xs font-semibold;
  /* bg: green-100/red-100 based on positive/negative */
  /* text: green-800/red-800 based on positive/negative */
}

/* Date Filter Buttons */
.filter-button {
  @apply px-4 py-2 rounded-lg font-medium transition-colors;
  /* Active: bg-primary text-white */
  /* Inactive: bg-white text-gray-700 hover:bg-gray-100 */
}

/* Responsive Grid */
.summary-grid {
  @apply grid grid-cols-1 md:grid-cols-3 gap-6;
}
```

## 🚀 Performance Optimizations

1. **Efficient Queries**
   - Only fetch data for selected date range
   - Use indexes (already in migrations)
   - Filter at database level

2. **Client-Side Caching**
   - React state stores results
   - No refetch unless date changes
   - useEffect dependency array

3. **Code Splitting**
   - Next.js 14 automatic splitting
   - Recharts loaded on demand
   - Optimized bundle

4. **Responsive Design**
   - Tailwind's purge removes unused CSS
   - Minimal CSS footprint
   - Fast hydration

---

**Built with React best practices and Next.js 14 App Router**
