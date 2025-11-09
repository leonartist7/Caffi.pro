# Caffi.Pro Admin Dashboard

A comprehensive tenant management dashboard for the Caffi.Pro multi-tenant coffee shop SaaS platform.

## 🚀 Features

This dashboard allows you to manage all aspects of your coffee shop app:

### 📱 **Menu Management**
- Create and organize menu categories
- Add menu items with prices, descriptions, and images
- Manage item availability and featured items
- Add tags, allergen information, and calorie counts
- Upload product images

### 🎟️ **Coupon Management**
- Create discount coupons (percentage, fixed amount, or free items)
- Set usage limits and expiration dates
- Track coupon redemptions
- Toggle coupon active status

### 🔔 **Push Notifications**
- Create targeted push notification campaigns
- Schedule notifications or send immediately
- Target specific audiences (all users, by tier, by location, etc.)
- Track delivery, open, and click rates
- Add rich media (images) and deep links

### 📍 **Locations Management**
- Add and manage physical café locations
- Set operating hours and contact information
- Configure mobile ordering and dine-in options
- Track location status (active/inactive)

### 🎁 **Rewards Catalog**
- Create loyalty rewards for customers
- Set point requirements for each reward
- Manage reward stock and availability
- Support different reward types (free items, discounts, coupons)

### ⚙️ **Tenant Settings**
- **General Settings**: Business info, timezone, currency, language
- **Features Toggle**: Enable/disable app features (ordering, loyalty, delivery, etc.)
- **Loyalty Configuration**: Set points per euro, signup bonuses, and tier thresholds
- **Branding**: Customize colors, logos, and app icons

## 🛠️ Technology Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **Data Fetching**: TanStack Query (React Query)
- **Forms**: React Hook Form
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Icons**: Lucide React
- **Notifications**: Sonner

## 📦 Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Set up Supabase**:
   - Apply the database migrations in the `supabase/migrations` folder
   - Set up Supabase Storage bucket named `images` for image uploads
   - Configure Row Level Security (RLS) policies

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Access the dashboard**:
   Open [http://localhost:3000](http://localhost:3000) in your browser

## 🗄️ Database Setup

The dashboard works with the existing database schema that includes:

- `tenants` - Café business information
- `tenant_manifests` - Design tokens and branding
- `categories` - Menu categories
- `menu_items` - Products/menu items
- `coupons` - Discount codes
- `push_campaigns` - Marketing notifications
- `locations` - Physical café locations
- `rewards_catalog` - Loyalty rewards

Refer to `/supabase/migrations/` for the complete schema.

## 🎨 Customization

### Colors
The dashboard uses a coffee-themed color palette:
- Primary: Teal/Green (#2D5F5D)
- Secondary: Warm Orange (#F4A259)
- Accent: Coral (#E07A5F)

Customize colors in `tailwind.config.js`.

### Tenant Context
Currently, the dashboard uses placeholder tenant IDs. In production:
1. Implement authentication using Supabase Auth
2. Create a tenant context to track the current user's tenant
3. Replace `'YOUR_TENANT_ID'` placeholders with actual tenant IDs from auth

## 📸 Image Uploads

The dashboard includes an image upload utility (`src/lib/imageUpload.ts`) that:
- Validates file types and sizes
- Uploads to Supabase Storage
- Returns public URLs for use in the database
- Provides a React hook for easy integration

To enable image uploads:
1. Create a Supabase Storage bucket named `images`
2. Configure the bucket to be publicly accessible
3. Update the upload buttons in modal components to use the `useImageUpload` hook

## 🔐 Authentication

To add authentication:

1. Enable Supabase Auth in your project
2. Create an auth context:
   ```typescript
   // src/contexts/AuthContext.tsx
   import { createContext, useContext, useEffect, useState } from 'react'
   import { supabase } from '@/lib/supabase'
   
   export function AuthProvider({ children }) {
     const [user, setUser] = useState(null)
     const [tenant, setTenant] = useState(null)
     
     // Implement auth logic
     
     return (
       <AuthContext.Provider value={{ user, tenant }}>
         {children}
       </AuthContext.Provider>
     )
   }
   ```

3. Wrap your app with the AuthProvider
4. Use the tenant ID from context in all mutations

## 🚢 Deployment

### Build for production:
```bash
npm run build
```

### Deploy to Vercel, Netlify, or your preferred hosting:
```bash
# Example for Vercel
vercel deploy
```

Make sure to set environment variables in your hosting platform.

## 📝 TODO / Future Enhancements

- [ ] Add user authentication and tenant context
- [ ] Implement real-time updates using Supabase subscriptions
- [ ] Add analytics dashboard with charts
- [ ] Implement drag-and-drop for reordering items
- [ ] Add bulk operations (import/export menu items)
- [ ] Create customer management section
- [ ] Add order management and tracking
- [ ] Implement role-based access control
- [ ] Add multi-language support for the dashboard
- [ ] Create mobile-responsive improvements

## 🤝 Contributing

This is a custom dashboard for Caffi.Pro. For questions or support, contact the development team.

## 📄 License

Proprietary - All rights reserved

---

Built with ☕ for Caffi.Pro

