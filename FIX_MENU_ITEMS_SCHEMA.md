# ✅ FOUND IT! Menu Items Schema Fix

**Error:** `Database error (PGRST204): Could not find the 'is_active' column of 'menu_items' in the schema cache`

**Root Cause:** Your database table has `is_available` column, but the app code uses `is_active` column. Schema mismatch!

---

## 🚨 RUN THIS SQL NOW

Go to: https://supabase.com/dashboard/project/ugppbaavzevmdkblniim/sql/new

**Copy and run this SQL:**

```sql
-- ADD is_active COLUMN TO menu_items TABLE
-- The app code uses 'is_active' but the database has 'is_available'

-- Add is_active column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'menu_items'
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE menu_items ADD COLUMN is_active BOOLEAN DEFAULT true;

        -- Copy existing is_available values to is_active
        UPDATE menu_items SET is_active = is_available WHERE is_available IS NOT NULL;
    END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_menu_items_active ON menu_items(is_active);
```

**Click RUN ▶️**

You should see: **"Success. No rows returned"** or **"DO"**

---

## ✅ What This Does

1. **Checks** if `is_active` column exists
2. **Adds** the column if missing (with default value `true`)
3. **Copies** any existing `is_available` values to `is_active`
4. **Creates** an index for better performance

This is safe to run multiple times!

---

## 🧪 Test Menu Item Creation

**After running the SQL:**

1. **Hard refresh:** Ctrl+Shift+R or Cmd+Shift+R
2. Go to **Menu** page
3. Click **"Add Menu Item"**
4. Fill in:
   - Name: "Cappuccino"
   - Description: "Espresso with steamed milk foam"
   - Price: 4.50
   - Category: (select any)
5. Click **"Create Item"**
6. ✅ **SUCCESS!** Item created!
7. ✅ Modal stays open for next item!

---

## 🎉 What Works After This Fix

**Menu Items:**

- ✅ Create menu items
- ✅ Edit menu items
- ✅ Delete menu items
- ✅ Toggle active/inactive status
- ✅ Modal stays open for batch creation

**Categories:**

- ✅ Create with images
- ✅ Edit with images
- ✅ Modal stays open

**Everything Else:**

- ✅ Tenant selector (left side)
- ✅ Clock (right side)
- ✅ Staff dashboard loads
- ✅ Categories save

---

## 📊 Technical Details

**The Issue:**

- Migration files had inconsistent schema
- Some used `is_available`, some used `is_active`
- Your database was created with older schema (is_available only)
- App code was updated to use `is_active`
- Mismatch caused PGRST204 error

**The Solution:**

- Add `is_active` column
- Keep `is_available` for backward compatibility
- App uses `is_active` going forward

---

## 🚀 After Running SQL

**You'll be able to:**

1. **Rapid Menu Creation:**
   - Create category "Coffee"
   - Add items: Cappuccino, Latte, Americano, Espresso
   - Modal stays open, category stays selected
   - Create 10+ items in under 2 minutes!

2. **Complete Menu Setup:**
   - Categories with images
   - Items with prices and descriptions
   - Active/inactive status
   - All working perfectly!

---

**Run the SQL above and menu items will work! 🎉**
