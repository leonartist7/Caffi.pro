# Caffi.pro Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE BACKEND                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  PostgreSQL  │  │     Auth     │  │   Storage    │     │
│  │  (Multi-     │  │  (JWT + RLS) │  │  (Images)     │     │
│  │   Tenant)    │  │              │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐                       │
│  │   Realtime   │  │    Edge      │                       │
│  │  (WebSockets)│  │  Functions   │                       │
│  └──────────────┘  └──────────────┘                       │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         │                    │                    │
    ┌────▼────┐          ┌────▼────┐          ┌────▼────┐
    │  Admin  │          │ Client  │          │ Mobile  │
    │Dashboard│          │Dashboard│          │   App   │
    │(Next.js)│          │(Next.js)│          │(Flutter)│
    │         │          │         │          │         │
    │admin.   │          │dashboard│          │iOS/     │
    │caffi.pro│          │.caffi.  │          │Android  │
    │         │          │pro      │          │         │
    └─────────┘          └─────────┘          └─────────┘
```

## Multi-Tenant Architecture

### Single Database Pattern

- **One PostgreSQL database** stores all tenant data
- **Row-Level Security (RLS)** enforces data isolation
- **tenant_id** column in every table
- **JWT claims** include tenant_id for filtering

### Data Isolation

```sql
-- Every query is automatically filtered by tenant_id
SELECT * FROM menu_items 
WHERE tenant_id = auth.jwt()->>'tenant_id';

-- Super admin bypasses filters
SELECT * FROM menu_items 
WHERE (auth.jwt()->>'role' = 'super_admin' OR tenant_id = ...);
```

### Tenant Context

- **Mobile App:** tenant_id embedded in app config
- **Client Dashboard:** tenant_id from authenticated user
- **Admin Dashboard:** Can access all tenants

## Authentication Flow

### 1. Super Admin Login
```
User → Admin Dashboard → Supabase Auth → JWT with role='super_admin'
```

### 2. Client Dashboard Login
```
Café Owner → Client Dashboard → Supabase Auth → JWT with tenant_id
```

### 3. Mobile App Login
```
Customer → Mobile App → Phone OTP → Supabase Auth → JWT with tenant_id
```

### JWT Custom Claims

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "tenant_id": "00000000-0000-0000-0000-000000000001",
  "role": "customer" | "owner" | "super_admin"
}
```

## Data Flow Examples

### Order Placement Flow

```
1. Customer adds items to cart (Mobile App)
   ↓
2. Customer taps "Checkout"
   ↓
3. App calls Edge Function: create-order
   ↓
4. Function validates items, calculates total
   ↓
5. Function creates order record
   ↓
6. Function awards loyalty points
   ↓
7. Realtime subscription notifies Dashboard
   ↓
8. Order appears in Dashboard Kanban board
```

### Order Status Update Flow

```
1. Café owner updates order status (Dashboard)
   ↓
2. Dashboard calls Edge Function: update-order-status
   ↓
3. Function updates order.status
   ↓
4. Realtime subscription notifies Mobile App
   ↓
5. Customer sees status update in app
   ↓
6. Function sends push notification (if status = 'ready')
```

### Loyalty Redemption Flow

```
1. Customer browses rewards (Mobile App)
   ↓
2. Customer taps "Redeem" on reward
   ↓
3. App calls Edge Function: redeem-reward
   ↓
4. Function checks user has enough points
   ↓
5. Function deducts points
   ↓
6. Function generates coupon code
   ↓
7. Function creates coupon record
   ↓
8. App shows coupon code to customer
```

## White-Label System

### Design Token Flow

```
1. Tenant created in database
   ↓
2. Design tokens stored in tenant_manifests
   ↓
3. Mobile app loads tokens on launch
   ↓
4. App applies theme dynamically
   ↓
5. App displays tenant branding
```

### FlutterFlow Theme System

```dart
// App loads tenant manifest
final manifest = await supabase
  .from('tenant_manifests')
  .select()
  .eq('tenant_id', tenantId)
  .single();

// Apply theme
ThemeData(
  primaryColor: Color(manifest.designTokens.colors.primary),
  // ...
)
```

### Deployment Process

```
1. Create tenant record
   ↓
2. Upload logo/assets to Supabase Storage
   ↓
3. Create tenant_manifest with design tokens
   ↓
4. Duplicate FlutterFlow project
   ↓
5. Update tenant_id in config
   ↓
6. Apply tenant theme
   ↓
7. Set unique bundle ID
   ↓
8. Build iOS + Android
   ↓
9. Submit to App Stores
```

## Real-Time Updates

### Supabase Realtime Subscriptions

**Dashboard (Orders Board):**
```typescript
supabase
  .channel('orders')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'orders',
    filter: `tenant_id=eq.${tenantId}`
  }, (payload) => {
    // Update Kanban board
  })
  .subscribe();
```

**Mobile App (Order Tracking):**
```dart
supabase
  .from('orders')
  .stream(primaryKey: ['order_id'])
  .eq('order_id', orderId)
  .listen((data) {
    // Update order status UI
  });
```

## Push Notifications

### Firebase Cloud Messaging (FCM)

```
1. Mobile app requests permission
   ↓
2. App receives FCM token
   ↓
3. App saves token to users.fcm_token
   ↓
4. Dashboard creates campaign
   ↓
5. Edge Function queries target users
   ↓
6. Function sends notifications via FCM Admin SDK
   ↓
7. Users receive notifications
   ↓
8. App tracks opens/clicks
```

## Security Model

### Row-Level Security (RLS)

**Policy Pattern:**
```sql
CREATE POLICY "policy_name"
  ON table_name FOR SELECT
  USING (
    is_super_admin() OR
    tenant_id = get_tenant_id()
  );
```

**Key Principles:**
- All tables have RLS enabled
- Policies filter by tenant_id
- Super admin bypasses all filters
- Users can only access their tenant's data

### API Security

**Edge Functions:**
- Verify JWT token
- Extract tenant_id from claims
- Validate user permissions
- Return tenant-filtered data

## Performance Considerations

### Database Indexes

- Foreign keys indexed
- Frequently queried columns indexed
- Composite indexes for common queries
- Partial indexes for filtered queries

### Caching Strategy

- Menu items cached in mobile app
- Dashboard queries cached with React Query
- CDN for images (Supabase Storage)

### Query Optimization

- Use select() to limit columns
- Filter early with WHERE clauses
- Use pagination for large datasets
- Batch operations when possible

## Scalability

### Current Capacity

- **Tenants:** 100+ supported
- **Users per tenant:** 10,000+
- **Orders per month:** 1M+
- **Concurrent users:** 10,000+

### Scaling Strategies

- **Database:** Read replicas, connection pooling
- **API:** Edge Functions auto-scale
- **Storage:** CDN for images
- **Real-time:** Supabase handles scaling

## Monitoring & Analytics

### Key Metrics

- API response times
- Database query performance
- Real-time connection count
- Error rates
- User activity

### Tools

- Supabase Dashboard (built-in)
- Vercel Analytics (dashboards)
- Firebase Analytics (mobile app)
- Custom analytics functions

## Deployment

### Environments

- **Development:** Local Supabase + localhost
- **Staging:** Supabase Cloud + Vercel preview
- **Production:** Supabase Cloud + Vercel production

### CI/CD

- Git push triggers builds
- Automated tests run
- Migrations applied automatically
- Deployments to staging/production

## Technology Stack Summary

| Component | Technology |
|-----------|-----------|
| Database | PostgreSQL (Supabase) |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Real-time | Supabase Realtime |
| API | Supabase Edge Functions (Deno) |
| Admin Dashboard | Next.js 14 + TypeScript + Tailwind |
| Client Dashboard | Next.js 14 + TypeScript + Tailwind |
| Mobile App | FlutterFlow (Flutter) |
| Push Notifications | Firebase Cloud Messaging |
| Hosting | Vercel (dashboards) |
| Design | Figma |
