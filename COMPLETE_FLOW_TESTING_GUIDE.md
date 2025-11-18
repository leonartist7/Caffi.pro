# 📱 Complete Multi-Tenant Flow Testing Guide

## 🎯 Overview

This guide walks you through testing the **complete end-to-end flow** of your Caffi.pro multi-tenant coffee shop platform:

**Customer Mobile App** → **Admin Dashboard** → **Staff Portal** → **Real-Time Sync**

---

## 🔧 Prerequisites

### 1. Deploy Latest Changes

```bash
# Your changes are deployed to Vercel
# Wait 3-5 minutes after the last push
```

### 2. Have 3 Devices/Browsers Ready

- **Device 1 (Mobile)**: Customer app
- **Device 2 (Desktop)**: Admin dashboard
- **Device 3 (Tablet/Desktop)**: Staff portal

### 3. Test Accounts Needed

- **Admin**: Your main account
- **Customer**: Test customer account per tenant
- **Staff**: Test staff account per tenant

---

## 📋 Complete Testing Flow

### **Phase 1: Admin Setup (Desktop)**

#### Step 1.1: Create a Test Tenant

1. Open: `https://your-app.vercel.app/clients`
2. Click **"Create Client"**
3. Fill in:
   ```
   Business Name: "Test Coffee Shop"
   Contact Email: admin@testcoffee.com
   Contact Phone: +1234567890
   Primary Color: #8D4004 (or any color)
   ```
4. Click **Save**
5. ✅ **Verify**: Slug auto-generated (e.g., `test-coffee-shop`)
6. ✅ **Verify**: Client appears in dropdown

#### Step 1.2: Configure Menu

1. **Select tenant** from dropdown
2. Navigate to **Menu** page
3. Click **"Manage Categories"**
4. **Add categories**:
   ```
   - Espresso Drinks
   - Cold Brew
   - Pastries
   ```
5. For each category, click **"Add Item"**:

   ```
   Espresso Drinks:
   - Cappuccino | €3.50
   - Latte | €4.00
   - Americano | €2.50

   Cold Brew:
   - Cold Brew | €4.50
   - Iced Latte | €4.75

   Pastries:
   - Croissant | €2.00
   - Muffin | €2.50
   ```

6. ✅ **Verify**: Items appear immediately (real-time working)
7. ✅ **Verify**: Click **"View Shop"** button opens customer app

#### Step 1.3: Create Staff User

1. Navigate to **Staff** page
2. Click **"Add Staff Member"**
3. Fill in:
   ```
   Name: Barista Test
   Email: barista@testcoffee.com
   Phone: +1234567890
   Role: Barista
   Permissions: ✅ Manage Orders
   ```
4. Click **Save**
5. ✅ **Verify**: Staff member appears in list

---

### **Phase 2: Mobile App Setup (Phone)**

#### Step 2.1: Install PWA

1. Open on your phone: `https://your-app.vercel.app/shop/test-coffee-shop`
2. **Chrome (Android)**:
   - Tap **⋮** menu → **"Add to Home Screen"**
3. **Safari (iOS)**:
   - Tap **Share** → **"Add to Home Screen"**
4. ✅ **Verify**: Caffi.pro icon appears on home screen
5. Launch the PWA from home screen

#### Step 2.2: Create Customer Account

1. In the app, tap **"Sign Up"**
2. Fill in:
   ```
   Full Name: Test Customer
   Email: customer@testcoffee.com
   Password: TestPass123!
   ```
3. Tap **"Create Account"**
4. ✅ **Verify**: Redirected to shop home
5. ✅ **Verify**: "Welcome back, Test Customer" appears

#### Step 2.3: Browse Menu

1. Tap **"Browse Menu"**
2. ✅ **Verify**: All menu items from admin appear
3. ✅ **Verify**: Categories filter works
4. ✅ **Verify**: Search works
5. Tap on **"Cappuccino"**
6. ✅ **Verify**: Item detail modal opens
7. ✅ **Verify**: Can select size (if modifiers exist)

---

### **Phase 3: Place Order (Mobile → Admin Real-Time)**

#### Step 3.1: Add Items to Cart

1. On mobile app (**"Browse Menu"**)
2. Tap **"Cappuccino"** → **"Add to Cart"** (€3.50)
3. Tap **"Croissant"** → **"Add to Cart"** (€2.00)
4. ✅ **Verify**: Cart badge shows "2"
5. Tap **Cart icon** (bottom navigation)
6. ✅ **Verify**: Both items appear
7. ✅ **Verify**: Total shows €5.50

#### Step 3.2: Checkout

1. Tap **"Checkout"**
2. Select:
   ```
   Order Type: Pickup
   Location: Main Cafe (or available location)
   Special Instructions: "Extra hot, please"
   ```
3. Tap **"Place Order"**
4. ✅ **Verify**: Order confirmation appears
5. ✅ **Verify**: Order number displayed (e.g., "#ORD-1234")
6. ✅ **Copy the order number**

#### Step 3.3: Watch Real-Time Admin Update ⚡

**On Desktop (Admin Dashboard)**:

1. Navigate to **Orders** page
2. ✅ **Verify**: 🔔 **Toast notification** appears: "New order received! Order #ORD-1234"
3. ✅ **Verify**: Order appears in **"Pending"** column (Kanban board)
4. ✅ **Verify**: Customer name, items, total all correct
5. ✅ **Check browser console**: "✅ Real-time orders subscription active"

---

### **Phase 4: Order Processing (Admin → Mobile Real-Time)**

#### Step 4.1: Confirm Order (Admin)

**On Desktop (Admin Dashboard - Orders page)**:

1. Find the new order in **"Pending"** column
2. Click **"Confirm"** button
3. ✅ **Verify**: Order moves to **"Confirmed"** column
4. ✅ **Verify**: Toast appears: "Order confirmed"

#### Step 4.2: Watch Mobile Update ⚡

**On Mobile App (Customer)**:

1. Tap **"My Orders"** (bottom nav)
2. Tap on the recent order
3. ✅ **Verify**: Order status shows **"Confirmed"** 🔔
4. ✅ **Verify**: Progress bar updates
5. ✅ **Check**: Status timeline shows checkmark on "Confirmed"

#### Step 4.3: Complete Order Flow

**On Admin Dashboard**:

1. Click **"Start Preparing"**
   - ✅ Moves to **"Preparing"** column
   - ✅ Mobile updates to "Preparing" ☕
2. Click **"Mark Ready"**
   - ✅ Moves to **"Ready"** column
   - ✅ Mobile updates to "Ready for Pickup" 📦
3. Click **"Complete"**
   - ✅ Moves to **"Recently Completed"** section
   - ✅ Mobile updates to "Completed" ✅

**On Mobile App**:

- ✅ **Verify**: Each status change updates **instantly** (no refresh needed)
- ✅ **Verify**: Order timeline animates through steps
- ✅ **Verify**: Points earned display appears (if loyalty enabled)

---

### **Phase 5: Staff Portal Testing**

#### Step 5.1: Staff Login

1. Open new browser tab
2. Navigate to: `https://your-app.vercel.app/staff/login`
3. Login with:
   ```
   Email: barista@testcoffee.com
   Password: (password you set)
   ```
4. ✅ **Verify**: Redirected to staff dashboard
5. ✅ **Verify**: Tenant name appears in header

#### Step 5.2: View Orders as Staff

1. Click **"Orders"** in sidebar
2. ✅ **Verify**: Same Kanban board as admin
3. ✅ **Verify**: Can see all orders for this tenant
4. ✅ **Verify**: Can update order statuses
5. **Place a new order from mobile** (repeat Phase 3)
6. ✅ **Verify**: Staff dashboard updates with **toast notification** ⚡

---

## 🔄 Real-Time Sync Test Matrix

| Action                     | Admin Dashboard          | Staff Portal             | Customer Mobile       |
| -------------------------- | ------------------------ | ------------------------ | --------------------- |
| **Customer places order**  | 🔔 Toast + Order appears | 🔔 Toast + Order appears | Order confirmation    |
| **Admin confirms order**   | Status → Confirmed       | Status → Confirmed ⚡    | Status → Confirmed ⚡ |
| **Staff starts preparing** | Status → Preparing ⚡    | Status → Preparing       | Status → Preparing ⚡ |
| **Admin marks ready**      | Status → Ready           | Status → Ready ⚡        | Status → Ready ⚡     |
| **Any role completes**     | Status → Completed ⚡    | Status → Completed ⚡    | Status → Completed ⚡ |

✅ **All ⚡ should happen WITHOUT page refresh!**

---

## 📊 Feature Testing Checklist

### **Customer App (Mobile)**

- [ ] PWA installation works
- [ ] Sign up / Login works
- [ ] Menu browsing (search, filter, categories)
- [ ] Add to cart
- [ ] Checkout flow (pickup/dine-in/delivery)
- [ ] Order tracking with real-time updates
- [ ] Order history
- [ ] Profile page
- [ ] Rewards/loyalty (if enabled)
- [ ] Dark mode toggle
- [ ] Responsive design on mobile

### **Admin Dashboard (Desktop)**

- [ ] Client CRUD operations
- [ ] Menu management (categories + items)
- [ ] Real-time order notifications
- [ ] Order status updates
- [ ] Staff management
- [ ] Analytics charts
- [ ] Tenant selector dropdown
- [ ] Dark mode toggle
- [ ] "View Shop" link works

### **Staff Portal (Tablet/Desktop)**

- [ ] Staff login with role-based auth
- [ ] Order kanban board
- [ ] Real-time order updates
- [ ] Can update order statuses
- [ ] Filtered by tenant
- [ ] Responsive design

---

## 🐛 Troubleshooting

### Issue: Orders Not Appearing in Real-Time

**Diagnosis**:

1. Open browser console (F12)
2. Look for: `"✅ Real-time orders subscription active"`
3. If missing, check Supabase project settings

**Fix**:

```sql
-- Enable Realtime on orders table (Supabase Dashboard → Database → Replication)
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
```

### Issue: "Coffee Shop Not Found" on /shop/[slug]

**Diagnosis**:

1. Check console for: `Selected Tenant: { slug: "???" }`
2. If slug is `null`, run this migration:

**Fix**:

```sql
-- Generate slugs for existing tenants
UPDATE tenants
SET slug = LOWER(REGEXP_REPLACE(business_name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;
```

### Issue: PWA Won't Install

**Diagnosis**:

- Icons missing (404)
- Manifest.json not loading
- HTTPS not enabled

**Fix**:

1. Verify files exist: `/icon-192.svg`, `/icon-512.svg`
2. Check manifest.json loads: `https://your-app.vercel.app/manifest.json`
3. Convert SVGs to PNGs for better compatibility

### Issue: Menu Items Not Updating

**Diagnosis**:

1. Check browser console for errors
2. Verify `categories.refetch()` is called

**Fix**: Already fixed in latest commit (uses `refetch()` instead of `invalidateQueries()`)

---

## 🎨 Theme Testing

### Test Custom Branding Per Tenant

1. **Admin Dashboard** → **Clients**
2. Edit a client
3. Change **Primary Color** to `#FF5733` (bright orange)
4. Save
5. Open customer app: `/shop/{tenant-slug}`
6. ✅ **Verify**: Buttons, gradients use new color
7. Check CSS variables in inspector: `--tenant-primary: #FF5733`

---

## 📈 Success Criteria

### ✅ Platform is Ready for Production When:

- [ ] Customer can install PWA on mobile home screen
- [ ] Customer can place order and track status in real-time
- [ ] Admin sees new orders instantly (< 2 sec latency)
- [ ] Staff can manage orders from tablets
- [ ] All 3 roles (Customer, Admin, Staff) can log in
- [ ] Menu items update across all views instantly
- [ ] Dark mode works everywhere
- [ ] Responsive on all screen sizes
- [ ] No console errors
- [ ] Supabase RLS policies prevent unauthorized access
- [ ] Each tenant's data is isolated (can't see other tenants)

---

## 🚀 Next Steps After Testing

1. **Payments**: Integrate Stripe for real transactions
2. **Inventory**: Add stock tracking to prevent overselling
3. **Push Notifications**: Enable FCM for order status alerts
4. **Analytics**: Connect real revenue data to dashboard charts
5. **Delivery**: Add driver assignment and tracking
6. **Marketing**: Build campaign creation UI for push_campaigns table

---

## 📞 Support

If you encounter issues during testing:

1. Check browser console for errors
2. Check Supabase logs: Dashboard → Logs
3. Verify RLS policies: Dashboard → Database → Policies
4. Check real-time subscriptions: Dashboard → Database → Replication

---

**Happy Testing! ☕️**

_Last Updated_: 2025-01-18
_Platform Version_: v1.0 (Multi-Tenant with Real-Time)
