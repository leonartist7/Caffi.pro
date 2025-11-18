-- Migration: Add missing display_order column to menu_items
-- This fixes the 400 error when fetching menu items

-- Add display_order column to menu_items
ALTER TABLE menu_items
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Set initial display_order based on created_at
WITH numbered_items AS (
  SELECT
    item_id,
    ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at) as row_num
  FROM menu_items
)
UPDATE menu_items
SET display_order = numbered_items.row_num
FROM numbered_items
WHERE menu_items.item_id = numbered_items.item_id;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_menu_items_display_order ON menu_items(display_order);

-- Verify column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'menu_items'
    AND column_name = 'display_order'
  ) THEN
    RAISE NOTICE '✅ display_order column added to menu_items';
  ELSE
    RAISE EXCEPTION 'Failed to add display_order column';
  END IF;
END $$;
