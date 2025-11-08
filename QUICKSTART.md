# 🚀 Quick Start Guide

Get your Caffi.Pro Admin Dashboard up and running in minutes!

## Prerequisites

- Node.js 18+ installed
- A Supabase account and project
- Basic knowledge of React and TypeScript

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Supabase

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Get these values from your Supabase project settings → API.

### 3. Set Up Database

Apply the migrations to your Supabase database:

```bash
# Navigate to Supabase SQL Editor and run each migration file in order:
# 1. supabase/migrations/20250107000001_initial_schema.sql
# 2. supabase/migrations/20250107000002_rls_policies.sql
# 3. supabase/migrations/20250107000003_database_functions.sql
# 4. supabase/migrations/20250107000004_auth_setup.sql
```

Alternatively, if using Supabase CLI:

```bash
supabase db push
```

### 4. Set Up Storage (for image uploads)

In your Supabase project:

1. Go to Storage
2. Create a new bucket called `images`
3. Make it publicly accessible:
   - Click on the bucket
   - Go to Policies
   - Add policy: Allow public read access
   - Add policy: Allow authenticated uploads

### 5. Start Development Server

```bash
npm run dev
```

The dashboard will open at [http://localhost:3000](http://localhost:3000)

## First Time Setup

### Add Test Data

You can add test data using the seed file:

```sql
-- In Supabase SQL Editor, run:
-- supabase/seed/01_test_tenants.sql
```

Or manually create your first tenant through the dashboard.

### Navigate the Dashboard

The dashboard includes these main sections:

- **📊 Overview** - Dashboard statistics and quick actions
- **🍽️ Menu** - Manage categories and menu items
- **🎟️ Coupons** - Create and manage discount codes
- **🔔 Notifications** - Send push notifications to customers
- **📍 Locations** - Manage café locations
- **🎁 Rewards** - Configure loyalty rewards
- **⚙️ Settings** - Tenant configuration and branding

## Common Tasks

### Add a Menu Item

1. Go to **Menu** page
2. Click **Add Menu Item**
3. Fill in the details:
   - Name, description, price
   - Select a category
   - Add image URL
   - Set tags and allergens
4. Click **Create Item**

### Create a Coupon

1. Go to **Coupons** page
2. Click **Create Coupon**
3. Configure the coupon:
   - Enter code (or generate one)
   - Select discount type
   - Set discount value
   - Configure usage limits
4. Click **Create Coupon**

### Send a Notification

1. Go to **Notifications** page
2. Click **Create Campaign**
3. Compose your notification:
   - Write title and message
   - Add an image (optional)
   - Select target audience
4. Click **Send Now** or schedule for later

### Customize Branding

1. Go to **Settings** → **Branding** tab
2. Upload your logo and app icon
3. Choose your brand colors
4. Click **Save Changes**

## Troubleshooting

### "Missing Supabase environment variables"

Make sure your `.env` file exists and contains valid credentials.

### Images not uploading

Check that:
- The `images` bucket exists in Supabase Storage
- The bucket has public read access
- You've enabled authenticated uploads

### Data not loading

Verify that:
- Database migrations have been applied
- RLS policies are configured correctly
- Your Supabase anon key has proper permissions

## Next Steps

1. **Add Authentication**: Implement user authentication to manage multiple tenants
2. **Customize UI**: Adjust colors and styling to match your brand
3. **Add More Features**: Extend the dashboard with custom functionality
4. **Deploy**: Build and deploy to Vercel, Netlify, or your preferred host

## Need Help?

- Check the [DASHBOARD_README.md](./DASHBOARD_README.md) for detailed documentation
- Review the database schema in `supabase/migrations/`
- Inspect the component code in `src/pages/` and `src/components/`

---

Happy managing! ☕
