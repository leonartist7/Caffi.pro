# 🌐 Custom Domain Setup Guide

Allow your coffee shop tenants to use their own custom domains (e.g., `www.bestcoffee.com`) instead of slug-based URLs (`app.caffi.pro/shop/best-coffee`).

---

## How It Works

### Default Slug-Based Routing

```
app.caffi.pro/shop/best-coffee/menu
app.caffi.pro/shop/best-coffee/checkout
app.caffi.pro/shop/best-coffee/orders
```

### Custom Domain Routing

```
www.bestcoffee.com/menu
www.bestcoffee.com/checkout
www.bestcoffee.com/orders
```

The middleware automatically rewrites custom domain requests to use the slug-based routes internally.

---

## Step 1: Apply Database Migration

First, add the `custom_domain` column to your `tenants` table:

1. Open Supabase SQL Editor
2. Copy the migration from: `/supabase/migrations/20250110000002_add_custom_domain.sql`
3. Run it

This adds:

- `custom_domain` VARCHAR(255) UNIQUE column
- Index for faster domain lookups

---

## Step 2: Configure Custom Domain for a Tenant

### Via SQL (Supabase SQL Editor):

```sql
UPDATE tenants
SET custom_domain = 'www.bestcoffee.com'
WHERE slug = 'best-coffee';
```

### Via Admin UI (Future Enhancement):

You can add a "Custom Domain" field to the Clients page in the admin dashboard.

---

## Step 3: DNS Configuration (Client Side)

Your tenant needs to configure their DNS:

### Option A: Point to Your Domain (CNAME)

If your app is hosted at `app.caffi.pro`:

```
Type: CNAME
Name: www
Value: app.caffi.pro
TTL: 3600
```

### Option B: Point to Vercel (if deployed there)

If using Vercel deployment:

```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600
```

Then add the custom domain in Vercel dashboard:

1. Go to Project Settings → Domains
2. Add `www.bestcoffee.com`
3. Verify DNS and get SSL certificate

---

## Step 4: SSL Certificate

### On Vercel:

- Automatically handled when you add the domain
- SSL certificate issued via Let's Encrypt
- Takes 5-10 minutes

### On Other Platforms:

- Cloudflare: Enable proxy (orange cloud) for free SSL
- Let's Encrypt: Use certbot for free SSL
- AWS: Use ACM (AWS Certificate Manager)

---

## Testing Custom Domains Locally

You can't test real DNS locally, but you can simulate it:

### Option 1: Edit hosts file

**Windows:**

1. Open `C:\Windows\System32\drivers\etc\hosts` as Administrator
2. Add: `127.0.0.1 www.testcoffee.local`
3. Save

**Mac/Linux:**

1. Edit `/etc/hosts` with sudo
2. Add: `127.0.0.1 www.testcoffee.local`
3. Save

Then:

1. Update tenant: `UPDATE tenants SET custom_domain = 'www.testcoffee.local' WHERE slug = 'test-coffee'`
2. Visit: `http://www.testcoffee.local:3000/menu`

### Option 2: Use ngrok

```bash
ngrok http 3000 --hostname=testcoffee.ngrok.io
```

Update tenant with the ngrok domain.

---

## How the Middleware Works

See: `/middleware.ts`

```typescript
// 1. Check if hostname is NOT the main app domain
if (!isMainDomain && !pathname.startsWith('/shop/')) {
  // 2. Look up tenant by custom_domain
  const { data: tenant } = await supabase
    .from('tenants')
    .select('slug')
    .eq('custom_domain', hostname)
    .single()

  // 3. Rewrite URL to use slug-based route
  if (tenant?.slug) {
    url.pathname = `/shop/${tenant.slug}${pathname}`
    return NextResponse.rewrite(url)
  }
}
```

**Example:**

- Request: `www.bestcoffee.com/menu`
- Middleware looks up tenant with `custom_domain = 'www.bestcoffee.com'`
- Finds tenant with `slug = 'best-coffee'`
- Internally rewrites to: `/shop/best-coffee/menu`
- User still sees: `www.bestcoffee.com/menu` in browser

---

## Troubleshooting

### ❌ Custom domain shows 404

**Check 1: Database**

```sql
SELECT slug, custom_domain FROM tenants WHERE custom_domain = 'www.yourshop.com';
```

Make sure the domain is exactly as typed (no trailing slashes, include www if needed).

**Check 2: DNS**

```bash
nslookup www.yourshop.com
```

Should point to your app's IP or domain.

**Check 3: Vercel Domains**

If using Vercel, make sure domain is added in Project Settings → Domains.

### ❌ SSL/HTTPS errors

- Wait 10 minutes for certificate provisioning
- Check DNS propagation: https://dnschecker.org
- Ensure DNS is pointing correctly

### ❌ Works on main domain but not custom domain

Check middleware logs in Vercel/deployment logs. The middleware might be failing to look up the tenant.

---

## Multi-Domain Support

Each tenant can have **one** custom domain. The `custom_domain` field is UNIQUE.

If you need multiple domains per tenant:

1. Create a new `tenant_domains` table:

```sql
CREATE TABLE tenant_domains (
  domain_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  domain VARCHAR(255) UNIQUE NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

2. Update middleware to query this table instead.

---

## Security Notes

- Always use HTTPS in production (free via Vercel/Cloudflare)
- Validate domain ownership before allowing custom domain setup
- Consider rate limiting on domain lookups
- Log custom domain access for monitoring

---

## Next Steps

**For Production:**

1. Add custom domain field to admin UI (Clients page)
2. Add domain verification (TXT record check)
3. Add domain status monitoring
4. Email tenant when domain is ready
5. Auto-SSL via Vercel/Cloudflare

**For Testing:**

1. Apply the migration
2. Update a test tenant with a custom domain
3. Configure DNS
4. Test accessing via custom domain

---

## Example: Complete Setup

### Scenario:

Tenant "Best Coffee" wants to use `www.bestcoffee.com`

### Steps:

**1. Update Database:**

```sql
UPDATE tenants
SET custom_domain = 'www.bestcoffee.com'
WHERE slug = 'best-coffee';
```

**2. Tenant Configures DNS:**

```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

**3. Add to Vercel:**

- Vercel Dashboard → Domains
- Add: `www.bestcoffee.com`
- Wait for SSL

**4. Test:**

```
https://www.bestcoffee.com/menu
https://www.bestcoffee.com/checkout
https://www.bestcoffee.com/orders
```

**5. Both URLs work:**

- `www.bestcoffee.com` (custom domain)
- `app.caffi.pro/shop/best-coffee` (slug-based)

✅ Done!
