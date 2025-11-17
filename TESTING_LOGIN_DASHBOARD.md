# 🔐 Testing Admin Login & Dashboard

**Current Status:** Your app is in **DEVELOPMENT MODE** - it skips login automatically.

---

## 🚀 QUICK TEST (No Setup Required)

### Option 1: Use Dev Mode (Already Active)

**Your app automatically bypasses login right now!**

1. **Go to your Vercel app:**

   ```
   https://your-app.vercel.app
   ```

2. **You'll be redirected to:**

   ```
   https://your-app.vercel.app/dashboard
   ```

3. **You should see:**
   - ✅ Dashboard Overview
   - ✅ KPI Cards (Active Locations, Revenue, Orders, Customers)
   - ✅ Sidebar navigation
   - ✅ Top navigation bar

**That's it!** No login needed in dev mode.

---

## 🔒 OPTION 2: Test Real Login (Recommended for Production)

If you want to test the actual login flow, follow these steps:

### Step 1: Create Super Admin Table (Run in Supabase SQL Editor)

```sql
-- Create super_admins table if not exists
CREATE TABLE IF NOT EXISTS super_admins (
    admin_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id UUID UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;

-- Dev mode policy
CREATE POLICY "Dev mode: Allow all on super_admins" ON super_admins
    FOR ALL USING (true) WITH CHECK (true);
```

### Step 2: Create Your Admin Account in Supabase

**Go to Supabase Authentication:**
https://supabase.com/dashboard/project/ugppbaavzevmdkblniim/auth/users

1. Click **"Add user"** button
2. **Fill in:**
   - Email: `admin@caffi.pro` (or your email)
   - Password: `YourSecurePassword123!`
   - Auto Confirm User: **✓ Checked**
3. Click **"Create user"**
4. **Copy the User ID** (it looks like: `a1b2c3d4-...`)

### Step 3: Add Yourself to super_admins Table

Run this in Supabase SQL Editor (replace the auth_id):

```sql
INSERT INTO super_admins (auth_id, email, full_name)
VALUES (
    'PASTE-THE-USER-ID-HERE',  -- Replace with the User ID you copied
    'admin@caffi.pro',          -- Your email
    'Your Name'                 -- Your name
);
```

### Step 4: Enable Login (Disable Dev Mode)

**Edit this file on GitHub or VS Code:**
`app/page.tsx`

**Change line 12 from:**

```typescript
router.push('/dashboard')
```

**To:**

```typescript
router.push('/login')
```

**Or just comment it out:**

```typescript
// DEVELOPMENT MODE: Skip login
// TODO: Re-enable by changing to '/login'
router.push('/login') // Changed from '/dashboard'
```

### Step 5: Test Login

1. Go to: `https://your-app.vercel.app`
2. You'll see the login page
3. Enter:
   - Email: `admin@caffi.pro`
   - Password: `YourSecurePassword123!`
4. Click **"Sign In"**
5. You should be redirected to the dashboard!

---

## 📱 WHAT YOU'LL SEE ON THE DASHBOARD

### Top Navigation:

- ✅ **Caffi.pro logo** (top left)
- ✅ **Tenant Selector** (switch between coffee shops)
- ✅ **Theme Toggle** (light/dark mode)
- ✅ **User Profile** icon

### Sidebar Navigation (Desktop):

- 📊 Dashboard
- ☕ Cafés (Tenants)
- 📋 Menu
- 🛒 Orders
- 👥 Clients
- 👨‍💼 Staff
- 🎟️ Coupons
- 🎁 Rewards
- 🔔 Notifications
- 📈 Analytics
- ⚙️ Settings

### Dashboard Overview Cards:

- **Active Locations** - 12 (demo data)
- **Monthly Revenue** - €2,400
- **Pending Orders** - 8
- **Total Customers** - 324

### Quick Actions:

- ➕ Add New Café
- ➕ Add Menu Item
- 📤 Send Notification
- 📊 View Reports
- 📋 View Activity

---

## 🎨 DASHBOARD FEATURES TO TEST

### 1. **Cafés (Tenants) Page** `/cafes`

- ✅ View all coffee shop clients
- ✅ Create new café/client
- ✅ Edit café details
- ✅ Set logo and branding
- ✅ Manage locations
- ✅ Feature toggles

### 2. **Menu Management** `/menu`

- ✅ Create categories (Coffee, Pastries, etc.)
- ✅ Add menu items with modifiers
- ✅ Upload images (needs Storage buckets)
- ✅ Set prices
- ✅ Toggle availability

### 3. **Orders Dashboard** `/orders`

- ✅ Real-time order list
- ✅ Filter by status
- ✅ Update order status
- ✅ View order details

### 4. **Clients (Customers)** `/clients`

- ✅ Customer database
- ✅ Loyalty points tracking
- ✅ Order history
- ✅ Customer insights

### 5. **Staff Management** `/staff`

- ✅ Add staff members
- ✅ Assign roles
- ✅ Location assignment
- ✅ Activity tracking

### 6. **Coupons** `/coupons`

- ✅ Create discount codes
- ✅ Set expiration dates
- ✅ Usage limits
- ✅ Track redemptions

### 7. **Rewards** `/rewards`

- ✅ Create loyalty rewards
- ✅ Set point thresholds
- ✅ Free items or discounts

### 8. **Analytics** `/analytics`

- ✅ Revenue charts
- ✅ Order trends
- ✅ Popular items
- ✅ Customer insights

---

## 🧪 TESTING WORKFLOW

### Test 1: Create a Coffee Shop Client

1. Go to **Cafés** page
2. Click **"+ Add Client"**
3. Fill in:
   - Business Name: "Test Coffee Shop"
   - Slug: "test-cafe"
   - Email: "owner@test.com"
   - Primary Color: Pick a color
4. Click **"Save"**
5. ✅ Should create successfully (now that tenant_manifests table exists!)

### Test 2: Add a Location

1. In the café card, click **"Add Location"**
2. Fill in:
   - Name: "Downtown Branch"
   - Address: "123 Main St"
   - City: "Your City"
   - Phone: "+1-555-1234"
3. Click **"Save"**
4. ✅ Location created!

### Test 3: Create Menu Items

1. **Select your tenant** from dropdown (top bar)
2. Go to **Menu** page
3. Click **"+ Add Category"**
4. Create "Coffee" category
5. Click **"+ Add Item"**
6. Fill in:
   - Name: "Cappuccino"
   - Description: "Espresso with steamed milk"
   - Price: 4.50
   - Category: Coffee
7. **Add modifiers:**
   - Size: Small (+0), Medium (+1), Large (+2)
   - Extra shot (+1.50)
8. Click **"Save"**
9. ✅ Menu item created!

### Test 4: Visit the Shop (Customer View)

1. Go to: `https://your-app.vercel.app/shop/test-cafe`
2. You should see:
   - ✅ Shop landing page
   - ✅ Browse Menu button
   - ✅ Custom branding (your chosen color)
3. Click **"Browse Menu"**
4. See your menu items!
5. Click an item → Add to cart
6. Test checkout flow

---

## 🔍 TROUBLESHOOTING

### Issue: "Access denied. Only super admins can log in."

**Fix:** You need to add yourself to the `super_admins` table (see Step 3 above)

### Issue: Still going to dashboard without login

**Fix:** You're still in dev mode. Change `app/page.tsx` line 12 to redirect to `/login`

### Issue: Can't create café - tenant_manifests error

**Fix:** Run the migration SQL we created earlier (`20250117000001_add_tenant_manifests.sql`)

### Issue: No data showing

**Fix:** You need to create some data! Start with creating a café, then add locations and menu items.

---

## 📊 RECOMMENDED TESTING ORDER

1. ✅ Test dashboard access (dev mode - already works!)
2. ✅ Create a coffee shop client (Cafés page)
3. ✅ Add a location to that client
4. ✅ Select that tenant from dropdown
5. ✅ Create menu categories
6. ✅ Add menu items
7. ✅ Visit the shop: `/shop/[your-slug]`
8. ✅ Test customer flow (browse, cart, checkout)
9. ✅ Check orders dashboard
10. ✅ Test other features (coupons, rewards, etc.)

---

## 🎯 QUICK LINKS

**Admin Dashboard:**

- Home: `https://your-app.vercel.app/dashboard`
- Login: `https://your-app.vercel.app/login`
- Cafés: `https://your-app.vercel.app/cafes`
- Menu: `https://your-app.vercel.app/menu`
- Orders: `https://your-app.vercel.app/orders`

**Customer Shop:**

- Landing: `https://your-app.vercel.app/shop/[slug]`
- Menu: `https://your-app.vercel.app/shop/[slug]/menu`
- Checkout: `https://your-app.vercel.app/shop/[slug]/checkout`

**Supabase:**

- Dashboard: https://supabase.com/dashboard/project/ugppbaavzevmdkblniim
- SQL Editor: https://supabase.com/dashboard/project/ugppbaavzevmdkblniim/sql/new
- Auth Users: https://supabase.com/dashboard/project/ugppbaavzevmdkblniim/auth/users

---

## ✅ CURRENT STATUS

**What's Working:**

- ✅ Dashboard loads (dev mode)
- ✅ All pages accessible
- ✅ Tenant management
- ✅ Menu management
- ✅ Orders dashboard
- ✅ Customer shop
- ✅ Real-time features

**What Needs Setup:**

- ⏳ Super admin account (optional - for testing login)
- ⏳ Supabase Storage buckets (for images)
- ⏳ Demo/seed data (optional - for realistic testing)

---

## 🚀 NEXT STEPS

**Right now, you can:**

1. Visit your Vercel app dashboard (dev mode active)
2. Create coffee shop clients
3. Add menu items
4. Test the full multi-tenant system!

**Tell me:**

- Did you access the dashboard successfully?
- Did you create a client?
- What do you want to test next?

**I can help you:**

- Create seed data for realistic testing
- Set up proper authentication
- Fix any issues you encounter
- Build new features!

---

Happy testing! ☕✨
