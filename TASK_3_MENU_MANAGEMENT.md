# 🍕 TASK 3: Menu & Location Management (MEDIUM PRIORITY)

## 📋 Task Overview
**Estimated Time:** 8-10 hours  
**Difficulty:** Medium  
**Priority:** 🟠 MEDIUM (Core Feature)

---

## 🎯 What to Build

Add full menu and location management to the tenant detail page.

---

## Part A: Location Management (4-5 hours)

### **1. Add Location Button & Modal**
**File:** `admin-dashboard/components/LocationModal.tsx`

**Requirements:**
- Form fields: name, address, city, postal code, country, phone, email
- Operating hours editor (Monday-Sunday)
- Active/Inactive toggle
- Estimated prep time
- Accepts mobile orders toggle
- Accepts dine-in orders toggle

**Form Fields:**
```typescript
interface LocationForm {
  name: string
  address: string
  city: string
  postal_code: string
  country: string
  phone: string
  email: string
  hours: {
    monday: string
    tuesday: string
    // ... etc
  }
  is_active: boolean
  accepts_mobile_orders: boolean
  accepts_dine_in_orders: boolean
  estimated_prep_time: number
}
```

---

### **2. Hours Editor Component**
**File:** `admin-dashboard/components/HoursEditor.tsx`

**Requirements:**
- 7 rows (Monday-Sunday)
- Each row: Open time, Close time
- "Closed" checkbox
- 24-hour format
- Validation (open < close)

**UI:**
```
Monday    [09:00] to [18:00]  [ ] Closed
Tuesday   [09:00] to [18:00]  [ ] Closed
...
```

---

### **3. Location API Routes**
**File:** `admin-dashboard/app/api/locations/route.ts`

**Endpoints:**
- POST `/api/locations` - Create location
- GET `/api/locations?tenant_id=xxx` - List locations

**File:** `admin-dashboard/app/api/locations/[id]/route.ts`

**Endpoints:**
- PATCH `/api/locations/:id` - Update location
- DELETE `/api/locations/:id` - Delete location
- GET `/api/locations/:id` - Get single location

---

### **4. Update Tenant Detail Page**
**File:** `admin-dashboard/app/tenants/[id]/page.tsx` (MODIFY)

**Add:**
- "Add Location" button in locations section
- Edit button for each location
- Delete button for each location
- Client component for actions

---

## Part B: Menu Management (5-6 hours)

### **1. Category Modal**
**File:** `admin-dashboard/components/CategoryModal.tsx`

**Requirements:**
- Name field
- Description field
- Icon selector (optional)
- Display order
- Active/Inactive toggle

---

### **2. Menu Item Modal**
**File:** `admin-dashboard/components/MenuItemModal.tsx`

**Requirements:**
- Name, description, price
- Category dropdown
- Image upload (optional - can be URL for now)
- Tags (array input)
- Calories, allergens
- Available/Unavailable toggle
- Modifiers section (sizes, add-ons)

**Form Fields:**
```typescript
interface MenuItemForm {
  name: string
  description: string
  price: number
  category_id: string
  image_url: string
  tags: string[]
  calories: number
  allergens: string[]
  is_available: boolean
  modifiers: {
    sizes: Array<{ name: string, price_modifier: number }>
    addons: Array<{ name: string, price: number }>
  }
}
```

---

### **3. Menu API Routes**
**File:** `admin-dashboard/app/api/categories/route.ts`
- POST, GET

**File:** `admin-dashboard/app/api/categories/[id]/route.ts`
- PATCH, DELETE, GET

**File:** `admin-dashboard/app/api/menu-items/route.ts`
- POST, GET

**File:** `admin-dashboard/app/api/menu-items/[id]/route.ts`
- PATCH, DELETE, GET

---

### **4. Update Tenant Detail Page**
**File:** `admin-dashboard/app/tenants/[id]/page.tsx` (MODIFY)

**Add:**
- "Add Category" button
- "Add Menu Item" button
- Edit/Delete for each category
- Edit/Delete for each menu item
- Drag-and-drop reordering (optional)

---

## 🔧 Technical Implementation

### **Location Management:**

```typescript
// LocationModal.tsx
'use client'

export default function LocationModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  location, 
  tenantId 
}: Props) {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    // ... etc
  })
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const response = await fetch('/api/locations', {
      method: location ? 'PATCH' : 'POST',
      body: JSON.stringify({ ...formData, tenant_id: tenantId })
    })
    
    if (response.ok) {
      onSuccess()
      onClose()
    }
  }
  
  return (
    // Modal UI
  )
}
```

---

### **Menu Management:**

```typescript
// MenuItemModal.tsx
'use client'

export default function MenuItemModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  menuItem, 
  tenantId,
  categories 
}: Props) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    category_id: '',
    // ... etc
  })
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const response = await fetch('/api/menu-items', {
      method: menuItem ? 'PATCH' : 'POST',
      body: JSON.stringify({ ...formData, tenant_id: tenantId })
    })
    
    if (response.ok) {
      onSuccess()
      onClose()
    }
  }
  
  return (
    // Modal UI
  )
}
```

---

## 🧪 Testing Checklist

### **Locations:**
- [ ] Can add new location
- [ ] Can edit existing location
- [ ] Can delete location
- [ ] Hours editor works
- [ ] Validation works
- [ ] Changes reflect immediately

### **Menu:**
- [ ] Can add category
- [ ] Can add menu item
- [ ] Can edit menu item
- [ ] Can delete menu item
- [ ] Category dropdown works
- [ ] Price validation works
- [ ] Items grouped by category

---

## 🚀 Quick Start for Cursor

**Copy this:**

```
I'm working on the Caffi.pro admin dashboard (Next.js 14, TypeScript, Supabase).

Current: Tenant detail page exists at app/tenants/[id]/page.tsx

TASK: Add location and menu management to tenant detail page

Part 1 - Locations:
1. Create components/LocationModal.tsx
   - Form with: name, address, city, postal_code, phone, email
   - Operating hours editor (Monday-Sunday with open/close times)
   - Active toggle, accepts orders toggles
2. Create components/HoursEditor.tsx for operating hours
3. Create API routes: app/api/locations/route.ts and app/api/locations/[id]/route.ts
4. Add "Add Location" button to tenant detail page
5. Add Edit/Delete buttons for each location
6. Use service role key for all operations

Part 2 - Menu:
1. Create components/CategoryModal.tsx (name, description, display_order)
2. Create components/MenuItemModal.tsx (name, description, price, category, image_url, tags, allergens)
3. Create API routes for categories and menu-items
4. Add "Add Category" and "Add Menu Item" buttons to tenant detail page
5. Add Edit/Delete for categories and menu items
6. Group menu items by category

Tech:
- Use TypeScript with proper types
- Use Tailwind CSS for styling
- Fetch from Supabase using service role key
- Follow existing modal patterns (AddTenantModal, EditTenantModal)

Please implement both parts completely.
```

---

**Status:** 📋 Ready to assign  
**Priority:** 🟠 MEDIUM  
**Dependencies:** None  
**Estimated Completion:** 8-10 hours

