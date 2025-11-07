# Caffi.pro - Deployment Guide

## Overview

This guide covers deploying all components of the Caffi.pro platform:

1. **Supabase Backend** (Database, Auth, Storage, Edge Functions)
2. **Admin Dashboard** (Next.js on Vercel)
3. **Client Dashboard** (Next.js on Vercel)
4. **Mobile Apps** (FlutterFlow Cloud Build)

---

## Prerequisites

- ✅ Supabase project created and configured
- ✅ Database migrations applied
- ✅ Seed data loaded
- ✅ Authentication configured
- ✅ Storage buckets created
- ✅ Vercel account
- ✅ FlutterFlow account
- ✅ Custom domains (optional but recommended)

---

## Part 1: Supabase Backend

### 1.1 Database Deployment

The database is already deployed when you applied migrations. Verify:

```bash
# Check all tables exist
supabase db diff

# Verify seed data
psql -h db.xxxxx.supabase.co -U postgres -c "SELECT COUNT(*) FROM tenants;"
```

### 1.2 Edge Functions Deployment

Edge Functions will be created in MODULE 5. For now, ensure your project is ready:

```bash
# Initialize edge functions
cd supabase
mkdir -p functions

# Deploy when ready
supabase functions deploy <function-name>
```

### 1.3 Storage Configuration

Storage buckets should already be created. Verify in Dashboard > Storage:
- ✅ `logos` bucket (public, 5MB limit)
- ✅ `menu-items` bucket (public, 2MB limit)
- ✅ `campaigns` bucket (public, 2MB limit)

**Storage Policies:**

```sql
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id IN ('logos', 'menu-items', 'campaigns'));

-- Allow public read access
CREATE POLICY "Public can view"
ON storage.objects FOR SELECT
TO public
USING (bucket_id IN ('logos', 'menu-items', 'campaigns'));

-- Tenant owners can delete their own files
CREATE POLICY "Owners can delete their files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id IN ('logos', 'menu-items', 'campaigns'));
```

### 1.4 Environment Variables

Note these for dashboard deployments:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG... # Secret - never expose
SUPABASE_JWT_SECRET=your-jwt-secret
```

---

## Part 2: Admin Dashboard Deployment

### 2.1 Setup Vercel Project

```bash
cd admin-dashboard

# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### 2.2 Configure Environment Variables

In Vercel Dashboard:
1. Go to **Settings > Environment Variables**
2. Add:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbG... (encrypted)
   ```
3. Save and redeploy

### 2.3 Custom Domain

1. In Vercel: **Settings > Domains**
2. Add domain: `admin.caffi.pro`
3. Update DNS:
   ```
   Type: CNAME
   Name: admin
   Value: cname.vercel-dns.com
   ```
4. Wait for SSL certificate (5-10 minutes)

### 2.4 Security Headers

Add to `next.config.js`:

```javascript
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}
```

---

## Part 3: Client Dashboard Deployment

### 3.1 Setup Vercel Project

```bash
cd client-dashboard

# Deploy
vercel --prod
```

### 3.2 Configure Environment Variables

Same as Admin Dashboard (without SERVICE_ROLE_KEY):
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
```

### 3.3 Custom Domain

1. Add domain: `dashboard.caffi.pro`
2. Update DNS:
   ```
   Type: CNAME
   Name: dashboard
   Value: cname.vercel-dns.com
   ```

### 3.4 Multi-Tenant Routing

If using tenant subdomains (e.g., `bluebottle.caffi.pro`):

**Wildcard Domain:**
```
Type: CNAME
Name: *
Value: cname.vercel-dns.com
```

**In Next.js:**
```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host')
  
  // Extract subdomain
  const subdomain = hostname?.split('.')[0]
  
  // Skip for main domain
  if (subdomain === 'dashboard' || subdomain === 'www') {
    return NextResponse.next()
  }
  
  // Store tenant slug in header
  const response = NextResponse.next()
  response.headers.set('x-tenant-slug', subdomain)
  
  return response
}
```

---

## Part 4: Mobile App Deployment

### 4.1 FlutterFlow Configuration

1. **Open FlutterFlow project**
2. **Go to Settings > Supabase**
   - URL: `https://xxxxx.supabase.co`
   - Anon Key: `eyJhbG...`
3. **Go to Settings > App Details**
   - App Name: (per tenant)
   - Bundle ID: `com.{tenant_slug}.app`
   - Version: `1.0.0`

### 4.2 Firebase Setup (for Push Notifications)

1. **Create Firebase Project**
   - Go to https://console.firebase.google.com
   - Click "Add Project"
   - Name: `caffi-{tenant_slug}`
   
2. **Add Android App**
   - Package name: `com.{tenant_slug}.app`
   - Download `google-services.json`
   - Upload to FlutterFlow: **Settings > Firebase > Android**

3. **Add iOS App**
   - Bundle ID: `com.{tenant_slug}.app`
   - Download `GoogleService-Info.plist`
   - Upload to FlutterFlow: **Settings > Firebase > iOS**

4. **Enable Cloud Messaging**
   - Go to **Project Settings > Cloud Messaging**
   - Note **Server Key** (for Edge Functions)

### 4.3 Build iOS App

1. **In FlutterFlow: Deploy > iOS**
2. **Select build type:**
   - Development (for TestFlight)
   - Release (for App Store)
3. **Upload certificates:**
   - Apple Developer account required
   - Certificate: Distribution certificate
   - Provisioning Profile: App Store profile
4. **Start build** (takes 10-20 minutes)
5. **Download IPA file**

### 4.4 Submit to App Store

1. **App Store Connect**
   - Go to https://appstoreconnect.apple.com
   - Click "My Apps" > "+"
   - Create new app:
     - Name: (tenant app name)
     - Bundle ID: `com.{tenant_slug}.app`
     - SKU: `caffi-{tenant_slug}`

2. **Upload IPA**
   - Use Transporter app or Xcode
   - Upload the IPA from FlutterFlow

3. **Fill App Information**
   - Description
   - Screenshots (6.5", 5.5")
   - App icon (1024x1024)
   - Privacy policy URL
   - Support URL

4. **Submit for Review**
   - Answer questionnaires
   - Submit
   - Wait 1-3 days for approval

### 4.5 Build Android App

1. **In FlutterFlow: Deploy > Android**
2. **Select build type:**
   - Internal (for testing)
   - Release (for Play Store)
3. **Upload keystore:**
   - Generate: `keytool -genkey -v -keystore caffi-{tenant}.keystore -alias caffi -keyalg RSA -keysize 2048 -validity 10000`
   - Upload to FlutterFlow: **Settings > Android Signing**
4. **Start build** (takes 10-20 minutes)
5. **Download AAB file**

### 4.6 Submit to Google Play

1. **Google Play Console**
   - Go to https://play.google.com/console
   - Click "Create App"
   - App name: (tenant app name)
   - Package: `com.{tenant_slug}.app`

2. **Upload AAB**
   - Go to **Production > Create new release**
   - Upload AAB from FlutterFlow

3. **Fill Store Listing**
   - Short description (80 chars)
   - Full description (4000 chars)
   - Screenshots (phone, tablet)
   - Feature graphic (1024x500)
   - App icon (512x512)

4. **Content Rating**
   - Fill questionnaire
   - Submit for rating

5. **Pricing & Distribution**
   - Free app
   - Select countries
   - Accept policies

6. **Submit for Review**
   - Review summary
   - Submit
   - Wait 1-7 days for approval

### 4.7 App Store URLs

Once approved, update tenant record:

```sql
UPDATE tenants
SET 
    app_store_url = 'https://apps.apple.com/app/id1234567890',
    play_store_url = 'https://play.google.com/store/apps/details?id=com.tenant.app'
WHERE tenant_id = '<tenant_id>';
```

---

## Part 5: CI/CD Pipeline (Optional)

### 5.1 GitHub Actions for Dashboards

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy-admin:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID_ADMIN }}
          working-directory: ./admin-dashboard

  deploy-client:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID_CLIENT }}
          working-directory: ./client-dashboard
```

### 5.2 Automated Database Migrations

```yaml
name: Run Migrations

on:
  push:
    branches: [main]
    paths:
      - 'supabase/migrations/**'

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install Supabase CLI
        run: |
          curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz -o /tmp/supabase.tar.gz
          cd /tmp && tar -xzf supabase.tar.gz
          sudo mv supabase /usr/local/bin/supabase
          supabase --version
      
      - name: Run migrations
        run: |
          supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
```

---

## Part 6: Monitoring & Analytics

### 6.1 Supabase Monitoring

- **Dashboard > Database > Query Performance**
- **Dashboard > Logs** (Auth, Database, Storage, Functions)
- Set up alerts for:
  - High database CPU
  - Low disk space
  - High error rate

### 6.2 Vercel Analytics

Enable in Vercel Dashboard:
- **Analytics** (page views, performance)
- **Speed Insights** (Core Web Vitals)

### 6.3 Error Tracking

Install Sentry:

```bash
npm install @sentry/nextjs

# Initialize
npx @sentry/wizard@latest -i nextjs
```

Configure in `.env`:
```env
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ORG=caffi-pro
SENTRY_PROJECT=admin-dashboard
```

### 6.4 Uptime Monitoring

Use services like:
- **UptimeRobot** (free, 5-minute checks)
- **Pingdom** (paid, 1-minute checks)
- **Better Uptime** (modern, Slack integration)

Monitor:
- `https://admin.caffi.pro/api/health`
- `https://dashboard.caffi.pro/api/health`
- `https://xxxxx.supabase.co/rest/v1/`

---

## Part 7: Backup & Disaster Recovery

### 7.1 Database Backups

Supabase automatically backs up daily. For extra safety:

```bash
# Weekly manual backup
supabase db dump -f backups/backup-$(date +%Y%m%d).sql

# Store in S3 or similar
aws s3 cp backups/ s3://caffi-backups/ --recursive
```

### 7.2 Recovery Plan

**In case of disaster:**

1. **Restore database**
   ```bash
   psql -h db.new-project.supabase.co -U postgres < backup.sql
   ```

2. **Update environment variables**
   - Update all dashboards with new Supabase URL

3. **Redeploy Edge Functions**
   ```bash
   supabase functions deploy --all
   ```

4. **Test critical flows**
   - Auth (all 3 types)
   - Order creation
   - Push notifications

### 7.3 Backup Checklist

- [ ] Database backup (automated)
- [ ] Storage files backup (manual via rclone)
- [ ] Environment variables documented
- [ ] FlutterFlow projects backed up
- [ ] Git repository up to date

---

## Part 8: Security Checklist

### Pre-Production

- [ ] All passwords changed from defaults
- [ ] Service role key never exposed
- [ ] RLS enabled on all tables
- [ ] RLS policies tested
- [ ] CORS configured properly
- [ ] Rate limiting enabled
- [ ] Input validation on all forms
- [ ] SQL injection prevention (use parameterized queries)
- [ ] XSS prevention (sanitize user input)

### Post-Production

- [ ] Monitor auth logs for suspicious activity
- [ ] Regular security audits
- [ ] Keep dependencies updated
- [ ] SSL certificates auto-renew (Vercel handles this)
- [ ] 2FA enabled for all admin accounts

---

## Part 9: Costs & Scaling

### Current Setup Costs (Monthly)

| Service | Plan | Cost |
|---------|------|------|
| Supabase | Free | €0 |
| Vercel | Hobby | €0 |
| FlutterFlow | Team | $70 |
| Firebase | Spark | €0 |
| Twilio (SMS) | Pay-as-you-go | ~€10/100 customers |
| **TOTAL** | | **~€80/month** |

### Scaling Thresholds

**Upgrade Supabase to Pro (€25/month) when:**
- > 500MB database
- > 2GB bandwidth/month
- > 50k API requests/day

**Upgrade Vercel to Pro (€20/month) when:**
- > 100GB bandwidth/month
- Need team collaboration
- Need advanced analytics

**Upgrade Firebase to Blaze when:**
- > 10k push notifications/month

---

## Part 10: Troubleshooting

### Issue: Dashboard can't connect to Supabase

**Solution:**
1. Check environment variables
2. Verify CORS settings in Supabase
3. Check network tab in browser for errors

### Issue: Push notifications not working

**Solution:**
1. Verify FCM server key in Edge Function
2. Check user has FCM token in database
3. Test with Firebase Console

### Issue: App Store rejection

**Common reasons:**
- Missing privacy policy
- App crashes on launch
- Incorrect screenshots
- Missing functionality

**Solution:** Address issue and resubmit

---

## Next Steps

1. ✅ Backend deployed and tested
2. → Deploy Admin Dashboard
3. → Deploy Client Dashboard
4. → Build and submit first mobile app
5. → Monitor and optimize

---

**Questions? Check [Setup Guide](./SETUP.md) or [Main Specification](./SPECIFICATION.md)**
