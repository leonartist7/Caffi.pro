# Caffi.pro Admin Dashboard

A Next.js 14 admin dashboard for managing café businesses with full CRUD operations for locations, menu categories, and menu items.

## Features

### Location Management
- ✅ Create, Read, Update, Delete locations
- ✅ Operating hours editor (Monday-Sunday with open/close times)
- ✅ Location settings (active status, mobile orders, dine-in orders)
- ✅ Estimated prep time configuration
- ✅ Full address and contact information

### Category Management
- ✅ Create, Read, Update, Delete categories
- ✅ Display order configuration
- ✅ Active/inactive status
- ✅ Description and metadata

### Menu Item Management
- ✅ Create, Read, Update, Delete menu items
- ✅ Category assignment
- ✅ Pricing and images
- ✅ Tags and allergens
- ✅ Calorie information
- ✅ Availability toggle

## Project Structure

```
/workspace/
├── app/
│   ├── api/
│   │   ├── locations/
│   │   │   ├── route.ts              # GET (all), POST (create)
│   │   │   └── [id]/route.ts         # GET, PATCH, DELETE (single)
│   │   ├── categories/
│   │   │   ├── route.ts              # GET (all), POST (create)
│   │   │   └── [id]/route.ts         # GET, PATCH, DELETE (single)
│   │   └── menu-items/
│   │       ├── route.ts              # GET (all), POST (create)
│   │       └── [id]/route.ts         # GET, PATCH, DELETE (single)
│   ├── tenants/
│   │   └── [id]/page.tsx             # Tenant detail page with CRUD UI
│   ├── globals.css                   # Global styles with Tailwind
│   └── layout.tsx                    # Root layout
├── components/
│   ├── HoursEditor.tsx               # Operating hours editor component
│   ├── LocationModal.tsx             # Location create/edit modal
│   ├── CategoryModal.tsx             # Category create/edit modal
│   └── MenuItemModal.tsx             # Menu item create/edit modal
├── lib/
│   └── supabase.ts                   # Supabase admin client
└── Configuration files (package.json, tsconfig.json, etc.)
```

## Getting Started

### Prerequisites
- Node.js 18+ installed
- Supabase account and project
- Supabase migrations applied (in `/workspace/supabase/migrations/`)

### Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment variables:**
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

3. **Run the development server:**
```bash
npm run dev
```

4. **Access the dashboard:**
Open [http://localhost:3000/tenants/[tenant-id]](http://localhost:3000/tenants/[tenant-id]) in your browser

## API Routes

### Locations API

**GET /api/locations?tenant_id={id}**
- Fetch all locations for a tenant

**POST /api/locations**
- Create a new location
- Body: `{ tenant_id, name, address, city, postal_code, country, phone, email, hours, is_active, accepts_mobile_orders, accepts_dine_in_orders, estimated_prep_time }`

**GET /api/locations/{id}**
- Fetch a single location

**PATCH /api/locations/{id}**
- Update a location
- Body: Partial location object

**DELETE /api/locations/{id}**
- Delete a location

### Categories API

**GET /api/categories?tenant_id={id}**
- Fetch all categories for a tenant

**POST /api/categories**
- Create a new category
- Body: `{ tenant_id, name, description, display_order, is_active }`

**GET /api/categories/{id}**
- Fetch a single category

**PATCH /api/categories/{id}**
- Update a category
- Body: Partial category object

**DELETE /api/categories/{id}**
- Delete a category

### Menu Items API

**GET /api/menu-items?tenant_id={id}&category_id={id}**
- Fetch menu items for a tenant (optionally filtered by category)

**POST /api/menu-items**
- Create a new menu item
- Body: `{ tenant_id, category_id, name, description, price, image_url, tags, allergens, calories, is_available }`

**GET /api/menu-items/{id}**
- Fetch a single menu item

**PATCH /api/menu-items/{id}**
- Update a menu item
- Body: Partial menu item object

**DELETE /api/menu-items/{id}**
- Delete a menu item

## Components

### HoursEditor
Reusable component for editing operating hours with:
- 7 rows for each day of the week
- Open and close time inputs
- "Closed" checkbox for each day
- Returns hours in format: `{ "monday": "07:00-19:00", "tuesday": "closed", ... }`

### LocationModal
Modal dialog for creating/editing locations with:
- Form validation
- Operating hours integration (uses HoursEditor)
- Toggle switches for settings
- Error handling and loading states

### CategoryModal
Simple modal for category management with:
- Name and description fields
- Display order configuration
- Active/inactive toggle

### MenuItemModal
Comprehensive menu item editor with:
- Category selection dropdown
- Price input with currency formatting
- Tags and allergens (comma-separated)
- Image URL input
- Calorie tracking
- Availability toggle

## Technology Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth (service role key for admin operations)

## Security

- All API routes use the Supabase service role key for administrative access
- Service role key bypasses Row Level Security (RLS) policies
- **Important:** Keep the service role key secure and never expose it to the client

## Database Schema

The dashboard interacts with the following tables:
- `tenants` - Café businesses
- `locations` - Physical café locations
- `categories` - Menu categories
- `menu_items` - Products/menu items

See `/workspace/supabase/migrations/20250107000001_initial_schema.sql` for the complete schema.

## Validation

### Location Validation
- Name, address, city, and country are required
- Phone and email are optional but validated if provided
- Operating hours must be in format "HH:MM-HH:MM" or "closed"
- Estimated prep time must be a positive number

### Category Validation
- Name is required
- Display order defaults to 0
- Active status defaults to true

### Menu Item Validation
- Name, price, and category are required
- Price must be a positive number
- Tags and allergens are arrays of strings
- Calories must be a positive integer if provided

## Responsive Design

All components and pages are fully responsive:
- Mobile-first design approach
- Grid layouts adapt to screen size
- Modals are scrollable on small screens
- Touch-friendly buttons and inputs

## Future Enhancements

Potential improvements:
- [ ] Image upload functionality (instead of URL input)
- [ ] Bulk operations (delete multiple items)
- [ ] Search and filter functionality
- [ ] Drag-and-drop display order management
- [ ] Menu item modifiers (sizes, add-ons)
- [ ] Location-specific menu availability
- [ ] Import/export functionality
- [ ] Activity logs and audit trails

## Troubleshooting

**Modal not closing:**
- Check if the onClose prop is properly connected
- Verify no JavaScript errors in console

**API errors:**
- Verify Supabase credentials in .env.local
- Check that migrations have been applied
- Ensure service role key has proper permissions

**Styling issues:**
- Run `npm run dev` to ensure Tailwind is compiled
- Clear browser cache
- Check for conflicting CSS

## License

See LICENSE file in root directory.

