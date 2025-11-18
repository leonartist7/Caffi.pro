# ☕ Caffi.Pro - Local Development Setup

Complete guide to run the coffee shop platform locally in VS Code.

---

## 🚀 Quick Start (3 Steps)

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev:local
```

### 3. Open Browser
```
http://localhost:3000
```

**That's it! You're running locally!** 🎉

---

## 📋 Detailed Setup Guide

### Prerequisites

Make sure you have installed:
- **Node.js** 18.x or higher ([Download](https://nodejs.org/))
- **npm** or **yarn**
- **VS Code** ([Download](https://code.visualstudio.com/))
- **Git**

### Step-by-Step Setup

#### 1. Clone the Repository (if not already done)
```bash
git clone https://github.com/leonartist7/Caffi.pro.git
cd Caffi.pro
```

#### 2. Install Dependencies
```bash
npm install
```

This installs:
- Next.js 14
- React 18
- Supabase Client
- TanStack React Query
- Tailwind CSS
- TypeScript
- And more...

#### 3. Environment Variables (Already Configured!)

Your `.env.local` file is already set up with:
```bash
# Server-side (API routes)
SUPABASE_URL=https://ugppbaavzevmdkblniim.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]

# Client-side (browser)
NEXT_PUBLIC_SUPABASE_URL=https://ugppbaavzevmdkblniim.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
```

✅ **No changes needed!** The file is ready to use.

#### 4. Run the Development Server
```bash
npm run dev:local
```

Or for network access (access from other devices):
```bash
npm run dev
```

#### 5. Open in Browser
Navigate to:
- **Main App**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3000/clients
- **Diagnostics Tool**: http://localhost:3000/diagnostics
- **Sample Shop**: http://localhost:3000/shop/green-landscaping-services

---

## 🛠️ Available Commands

### Development
```bash
npm run dev:local     # Start dev server (localhost only)
npm run dev           # Start dev server (network accessible)
```

### Building
```bash
npm run build         # Build for production
npm run start         # Start production server
npm run build:vercel  # Build with type checking + linting
```

### Code Quality
```bash
npm run type-check    # TypeScript type checking
npm run lint          # ESLint
npm run lint:strict   # ESLint with zero warnings
```

---

## 📂 Project Structure

```
Caffi.pro/
├── app/                          # Next.js 14 App Router
│   ├── (dashboard)/             # Admin dashboard routes
│   │   ├── clients/             # Client management
│   │   ├── diagnostics/         # Coffee shop builder & diagnostics
│   │   ├── analytics/           # Analytics dashboard
│   │   └── ...
│   ├── shop/[slug]/             # Customer-facing shop pages
│   │   ├── menu/                # Menu browsing
│   │   ├── checkout/            # Checkout flow
│   │   ├── orders/              # Order tracking
│   │   └── ...
│   └── staff/                   # Staff dashboard
├── components/                   # React components
│   ├── LiveClock.tsx            # Clock with motivation ☕
│   ├── MenuItem.tsx             # Menu item cards
│   ├── CartSidebar.tsx          # Shopping cart
│   └── ...
├── contexts/                     # React contexts
│   ├── CartContext.tsx          # Shopping cart state
│   └── AuthContext.tsx          # Authentication state
├── lib/                         # Utilities
│   ├── supabase.ts              # Supabase client
│   ├── get-tenant.ts            # Tenant fetching
│   └── ...
├── supabase/                    # Database
│   └── migrations/              # SQL migrations
├── public/                      # Static assets
├── .env.local                   # Environment variables ✅
├── BUILD_SUMMARY.md             # Complete build documentation
└── LOCAL_DEVELOPMENT_GUIDE.md   # This file
```

---

## 🔍 Testing Your Local Setup

### 1. Check the Motivational Phrase
Open any dashboard page and look for the live clock. You should see:
```
• Brew Excellence Daily ☕
```
✅ This confirms you're running the **latest version**!

### 2. Test the Diagnostics Page
1. Go to http://localhost:3000/diagnostics
2. Click **"Run Diagnostics"**
3. All tests should pass (green ✅)

### 3. Create a Test Coffee Shop
1. Still on `/diagnostics`
2. Fill in shop details
3. Check "Create sample menu"
4. Click **"🚀 Create Coffee Shop"**
5. Visit the shop at `/shop/[your-slug]`

### 4. Test Admin Features
- **Clients**: http://localhost:3000/clients
- **Analytics**: http://localhost:3000/analytics
- **Orders**: http://localhost:3000/orders

### 5. Test Customer Shop
- **Menu**: http://localhost:3000/shop/green-landscaping-services/menu
- **Checkout**: Add items to cart and checkout
- **Orders**: View order history

---

## 🗄️ Database Setup (Already Done!)

Your Supabase database is already configured and running at:
```
https://ugppbaavzevmdkblniim.supabase.co
```

### Run the SQL Fix (If Shop Pages Don't Load)

If you see "Coffee Shop Not Found", run this in Supabase SQL Editor:

```sql
-- Clean up policies
DROP POLICY IF EXISTS "Public read tenants" ON tenants;
DROP POLICY IF EXISTS "Public read manifests" ON tenant_manifests;
DROP POLICY IF EXISTS "Public can view tenant manifests" ON tenant_manifests;

-- Create public read access
CREATE POLICY "Public read tenants" ON tenants FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read manifests" ON tenant_manifests FOR SELECT TO anon, authenticated USING (true);

-- Fix trigger
DROP TRIGGER IF EXISTS trigger_create_tenant_manifest ON tenants;
DROP FUNCTION IF EXISTS public.create_default_manifest();

CREATE OR REPLACE FUNCTION public.create_default_manifest()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM tenant_manifests WHERE tenant_id = NEW.tenant_id) THEN
        INSERT INTO tenant_manifests (tenant_id, name, short_name, design_tokens)
        VALUES (
            NEW.tenant_id,
            NEW.business_name || ' App',
            SUBSTRING(NEW.business_name FROM 1 FOR 30),
            jsonb_build_object(
                'colors', jsonb_build_object('primary', '#6b3410', 'secondary', '#F4A259', 'accent', '#E07A5F', 'background', '#FFFFFF', 'surface', '#F8F9FA', 'error', '#DC3545', 'success', '#28A745', 'text_primary', '#212529', 'text_secondary', '#6C757D'),
                'typography', jsonb_build_object('font_family', 'Inter', 'heading_font', 'Poppins', 'font_size_base', 16, 'font_size_heading', 24, 'font_weight_regular', 400, 'font_weight_bold', 700),
                'spacing', jsonb_build_object('xs', 4, 'sm', 8, 'md', 16, 'lg', 24, 'xl', 32),
                'border_radius', jsonb_build_object('sm', 4, 'md', 8, 'lg', 16, 'full', 9999),
                'branding', jsonb_build_object('logo_url', NULL)
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_create_tenant_manifest AFTER INSERT ON tenants FOR EACH ROW EXECUTE FUNCTION create_default_manifest();

-- Backfill existing tenants
INSERT INTO tenant_manifests (tenant_id, name, short_name, design_tokens)
SELECT t.tenant_id, t.business_name || ' App', SUBSTRING(t.business_name FROM 1 FOR 30),
    jsonb_build_object('colors', jsonb_build_object('primary', '#6b3410', 'secondary', '#F4A259', 'accent', '#E07A5F', 'background', '#FFFFFF', 'surface', '#F8F9FA', 'error', '#DC3545', 'success', '#28A745', 'text_primary', '#212529', 'text_secondary', '#6C757D'), 'typography', jsonb_build_object('font_family', 'Inter', 'heading_font', 'Poppins', 'font_size_base', 16, 'font_size_heading', 24, 'font_weight_regular', 400, 'font_weight_bold', 700), 'spacing', jsonb_build_object('xs', 4, 'sm', 8, 'md', 16, 'lg', 24, 'xl', 32), 'border_radius', jsonb_build_object('sm', 4, 'md', 8, 'lg', 16, 'full', 9999), 'branding', jsonb_build_object('logo_url', NULL))
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM tenant_manifests tm WHERE tm.tenant_id = t.tenant_id);
```

---

## 🎨 VS Code Recommended Extensions

Install these for the best development experience:

1. **ES7+ React/Redux/React-Native snippets**
2. **Tailwind CSS IntelliSense**
3. **Prettier - Code formatter**
4. **ESLint**
5. **TypeScript Error Translator**
6. **GitLens**

Install via VS Code Extensions (Ctrl+Shift+X / Cmd+Shift+X)

---

## 🌙 Dark Mode

The app supports dark mode automatically based on system preferences.

Toggle in your OS settings or use the theme switcher in the app.

---

## 🐛 Troubleshooting

### Port 3000 Already in Use
```bash
# Kill the process using port 3000
npx kill-port 3000

# Or use a different port
PORT=3001 npm run dev:local
```

### TypeScript Errors
```bash
npm run type-check
```

### Module Not Found
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Environment Variables Not Working
```bash
# Restart the dev server after changing .env.local
# Stop server (Ctrl+C) then:
npm run dev:local
```

### Supabase Connection Issues
- Check `.env.local` has correct keys
- Verify internet connection
- Check Supabase dashboard is accessible

---

## 📊 Key Features You Can Test Locally

### ☕ Customer Shop Experience
1. Browse menu with search & filters
2. Add items to cart with modifiers (sizes, add-ons)
3. Checkout with pickup/dine-in/delivery options
4. Real-time order tracking
5. Loyalty rewards system
6. User authentication & profiles

### 🏢 Admin Dashboard
1. Multi-tenant client management
2. Menu & category CRUD operations
3. Order management
4. Analytics with charts
5. Coffee shop builder (diagnostics page)
6. Brand customization

### 🔧 Diagnostic Tools
1. Run automated tests
2. Create test shops with sample menus
3. Verify database schema
4. Test RLS policies
5. Schema detection

---

## 🚀 Next Steps

1. **Explore the code** - Start with `app/(dashboard)/diagnostics/page.tsx`
2. **Create test data** - Use `/diagnostics` to create test shops
3. **Customize branding** - Edit colors, logos in `/clients`
4. **Build features** - Add new pages, components, or functionality
5. **Read BUILD_SUMMARY.md** - Understand the complete system

---

## 📚 Additional Resources

- **Next.js Docs**: https://nextjs.org/docs
- **Supabase Docs**: https://supabase.com/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **React Query**: https://tanstack.com/query/latest

---

## ✅ Success Checklist

Before you start coding, verify:

- [ ] `npm install` completed without errors
- [ ] `npm run dev:local` starts successfully
- [ ] http://localhost:3000 loads
- [ ] See "Brew Excellence Daily ☕" on the clock
- [ ] `/diagnostics` page runs tests successfully
- [ ] Shop pages load without "Not Found" errors
- [ ] Can create test shops via diagnostics
- [ ] No TypeScript errors (`npm run type-check`)

---

## 🎉 You're All Set!

Your local development environment is ready. Happy coding! ☕

**Questions?** Check `BUILD_SUMMARY.md` for complete documentation.

**Need help?** Run diagnostics at `/diagnostics` to debug issues.

---

**Built with ❤️ and ☕**
*Local setup guide - Running on: `claude/fix-coffee-shop-view-01ASnUpSSMghgMFmsfdnsBfP`*
