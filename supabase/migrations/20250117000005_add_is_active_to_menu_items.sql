-- ADD is_active COLUMN TO menu_items TABLE
-- The app code uses 'is_active' but the database has 'is_available'
-- This migration adds the is_active column

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
