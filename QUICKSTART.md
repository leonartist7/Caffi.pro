# Quick Start Guide - Caffi.pro Admin Dashboard

This guide will get you up and running with the admin dashboard in 5 minutes.

## ✅ What's Been Implemented

**Full CRUD for:**
- 📍 Locations (with operating hours, settings)
- 📂 Categories (menu organization)
- ☕ Menu Items (products with pricing, tags, allergens)

## 🚀 5-Minute Setup

### Step 1: Install Dependencies (2 minutes)
```bash
npm install
```

This will install:
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Supabase JS Client

### Step 2: Configure Environment Variables (1 minute)

Create `.env.local` file in the root directory:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Where to find these:**
1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy "Project URL" for `NEXT_PUBLIC_SUPABASE_URL`
4. Copy "service_role" key for `SUPABASE_SERVICE_ROLE_KEY`

### Step 3: Verify Database Migrations (30 seconds)

Ensure your Supabase database has the required tables:
- `tenants`
- `locations`
- `categories`
- `menu_items`

Migrations are located in: `/workspace/supabase/migrations/`

### Step 4: Start Development Server (30 seconds)
```bash
npm run dev
```

The server will start at: **http://localhost:3000**

### Step 5: Access the Dashboard (1 minute)

1. Open http://localhost:3000 in your browser
2. Enter a tenant ID (you can find one in your database)
3. Start managing locations, categories, and menu items!

**Direct URL:**
```
http://localhost:3000/tenants/[your-tenant-id]
```

---

## 📖 Using the Dashboard

### Managing Locations

1. **Add Location:**
   - Click "Add Location" button
   - Fill in name, address, city, country (required)
   - Set operating hours for each day
   - Configure settings (mobile orders, dine-in, prep time)
   - Click "Save"

2. **Edit Location:**
   - Click "Edit" on any location card
   - Update fields
   - Click "Save"

3. **Delete Location:**
   - Click "Delete" on location card
   - Confirm deletion

### Managing Categories

1. **Add Category:**
   - Click "Add Category" button
   - Enter name (required), description, display order
   - Toggle active status
   - Click "Save"

2. **Edit/Delete:**
   - Use Edit/Delete buttons on category cards

### Managing Menu Items

1. **Add Menu Item:**
   - Click "Add Menu Item" button
   - Select category
   - Enter name, price (required)
   - Add description, image URL
   - Add tags and allergens (comma-separated)
   - Set availability
   - Click "Save"

2. **Edit/Delete:**
   - Use Edit/Delete buttons on menu item cards

---

## 🎨 Features Included

### Location Management
✅ Full address and contact info
✅ Operating hours editor (7 days)
✅ Mobile orders toggle
✅ Dine-in orders toggle
✅ Prep time configuration
✅ Active/inactive status

### Category Management
✅ Name and description
✅ Display order
✅ Active/inactive status

### Menu Item Management
✅ Category assignment
✅ Pricing
✅ Images
✅ Tags (multiple)
✅ Allergens (multiple)
✅ Calorie information
✅ Availability toggle

---

## 🔧 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000
npx kill-port 3000

# Or use different port
npm run dev -- -p 3001
```

### Supabase Connection Error
- Verify `.env.local` file exists
- Check credentials are correct
- Ensure service role key (not anon key)
- Verify database migrations are applied

### TypeScript Errors
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Styling Not Working
```bash
# Rebuild Tailwind
npm run dev
```

---

## 📚 Next Steps

1. **Customize Styling:**
   - Edit `tailwind.config.js` for theme
   - Modify `app/globals.css` for global styles

2. **Add Authentication:**
   - Implement Supabase Auth
   - Protect admin routes

3. **Add Image Upload:**
   - Integrate Supabase Storage
   - Replace URL inputs with file uploads

4. **Enhance Features:**
   - Search and filter
   - Bulk operations
   - Export data
   - Analytics dashboard

---

## 📞 Support

For issues or questions:
1. Check `ADMIN_DASHBOARD_README.md` for detailed documentation
2. Review `IMPLEMENTATION_SUMMARY.md` for technical details
3. Check Supabase logs in your project dashboard

---

## 🎉 You're Ready!

Your admin dashboard is fully functional with:
- ✅ Location CRUD
- ✅ Category CRUD
- ✅ Menu Item CRUD
- ✅ Responsive design
- ✅ Form validation
- ✅ Loading states
- ✅ Error handling

Happy managing! 🚀