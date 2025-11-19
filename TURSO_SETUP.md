# Turso Database Setup

## Quick Start

1. **Install Turso CLI**

```bash
# macOS/Linux
curl -sSfL https://get.tur.so/install.sh | bash

# Or use npm
npm install -g @libsql/client
```

2. **Create Database**

```bash
# Login
turso auth login

# Create database
turso db create caffi-pro

# Get URL
turso db show caffi-pro
```

3. **Create Auth Token**

```bash
turso db tokens create caffi-pro
```

4. **Configure Environment**

```bash
cp .env.turso.example .env.local
# Add your TURSO_DATABASE_URL and TURSO_AUTH_TOKEN
```

5. **Run Migrations**

```bash
npm run migrate
```

6. **Done!** Your database is ready.

## Local Development

Use a local SQLite file for development:

```bash
# .env.local
TURSO_DATABASE_URL=file:./local.db
TURSO_AUTH_TOKEN=
```

## Database Schema

18 tables supporting full multi-tenant coffee shop SaaS:

- **Tenants & Locations**: Multi-tenant isolation
- **Menu**: Categories, items, modifiers
- **Orders**: Full order lifecycle with items
- **Users**: Customer accounts
- **Loyalty**: Tiers, points, rewards, transactions
- **Coupons**: Discount codes and usage tracking
- **Staff**: Staff members and permissions
- **Inventory**: Stock tracking

## Commands

```bash
npm run migrate          # Run pending migrations
npm run dev              # Start dev server
```

## Next Steps

After setup:

1. Run migrations: `npm run migrate`
2. Start dev server: `npm run dev`
3. Create your first tenant via API or admin UI

## Production

Turso automatically replicates to edge locations worldwide for low-latency access.

**Features:**

- ✅ SQLite compatibility
- ✅ Edge replication (global)
- ✅ HTTP/WebSocket connection
- ✅ Branching (like Git for databases)
- ✅ Time travel queries
- ✅ Free tier: 9GB storage, 1B row reads/month

Learn more: https://docs.turso.tech
