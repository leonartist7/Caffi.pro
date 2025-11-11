-- Add custom domain support to tenants
-- This allows each tenant to have their own custom domain (e.g., www.mycoffeeshop.com)
-- In addition to the default slug-based URL (e.g., app.caffi.pro/shop/mycoffeeshop)

-- Add custom_domain column to tenants table
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255) UNIQUE;

-- Add index for faster domain lookups
CREATE INDEX IF NOT EXISTS idx_tenants_custom_domain
ON tenants(custom_domain)
WHERE custom_domain IS NOT NULL;

-- Add comment explaining the field
COMMENT ON COLUMN tenants.custom_domain IS 'Custom domain for this tenant (e.g., www.mycoffeeshop.com). Must be unique.';

-- Example usage:
-- UPDATE tenants SET custom_domain = 'www.bestcoffee.com' WHERE slug = 'best-coffee';
-- Now customers can access at both:
-- - app.caffi.pro/shop/best-coffee (slug-based)
-- - www.bestcoffee.com (custom domain)
