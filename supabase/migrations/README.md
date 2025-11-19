# Supabase Migrations

## Overview

This directory contains all database migrations for Caffi.pro. Migrations are applied in sequential order based on timestamp.

## Security Policy

**CRITICAL**: Never use development mode RLS bypass policies in any environment!

### Development Mode Policies (REMOVED)

The file `20250110000001_dev_mode_rls.sql.DANGEROUS_DO_NOT_USE` contains **dangerous permissive policies** that bypass authentication. This file has been:

- ✅ Renamed to prevent accidental usage
- ✅ Superseded by `20251119000002_remove_dev_mode_rls.sql` (which removes these policies)
- ❌ **MUST NEVER BE APPLIED** to any environment

**Why these policies are dangerous:**

- Allow unauthenticated access to ALL tables
- Bypass multi-tenant isolation
- Could expose sensitive customer data
- No audit trail for operations
- Could accidentally be deployed to production

### Proper Development Workflow

Instead of bypassing auth, use proper authentication even in development:

1. **Create test users** via Supabase Dashboard or Auth API
2. **Use Supabase Service Role Key** for admin operations (backend only)
3. **Test with real auth flows** to catch issues early
4. **Use seed data scripts** instead of permissive policies

## Migration Files

### Active Migrations

All `.sql` files (without extensions like `.DANGEROUS_DO_NOT_USE`) are active and will be applied.

### 20251119000002_remove_dev_mode_rls.sql

**Purpose**: Removes all development mode RLS bypass policies

**Status**: ✅ Ready to apply

**Impact**:

- Removes 18 permissive dev policies
- Enforces proper authentication
- Improves security posture

**Before applying:**

1. Ensure you have proper RLS policies for production
2. Update any dev scripts to use authenticated clients
3. Create test users for development

## Running Migrations

### Local Development

```bash
# Apply all pending migrations
supabase db push

# Or apply specific migration
supabase migration up
```

### Production

Migrations are applied automatically via Supabase CLI or Dashboard when pushed to production.

**Pre-deployment checklist:**

- [ ] Review migration SQL
- [ ] Test migration in staging
- [ ] Verify RLS policies
- [ ] Check for breaking changes
- [ ] Backup database

## Creating New Migrations

```bash
# Create new migration
supabase migration new migration_name

# This creates: supabase/migrations/YYYYMMDDHHMMSS_migration_name.sql
```

**Migration Best Practices:**

- Use descriptive names
- Include rollback scripts in comments
- Test locally first
- One logical change per migration
- Include comments explaining WHY

## RLS Policy Guidelines

**DO:**

- ✅ Use auth.uid() to check current user
- ✅ Join with tenant tables to verify access
- ✅ Test policies thoroughly
- ✅ Document policy intent
- ✅ Use descriptive policy names

**DON'T:**

- ❌ Use `USING (true)` - allows anyone
- ❌ Skip WITH CHECK clauses
- ❌ Create overly permissive policies "for development"
- ❌ Bypass authentication checks
- ❌ Leave dev policies in production

## Example: Proper RLS Policy

```sql
-- GOOD: Proper tenant isolation
CREATE POLICY "Users can only view their tenant's orders"
    ON orders FOR SELECT
    USING (tenant_id IN (
        SELECT tenant_id FROM staff_users
        WHERE staff_id = auth.uid()
    ));

-- BAD: Bypasses all security
CREATE POLICY "DEV: Allow anyone"
    ON orders FOR ALL
    USING (true);
```

## Troubleshooting

### "Permission denied for table"

**Cause**: RLS policy not allowing operation

**Solution**:

1. Check if user is authenticated: `SELECT auth.uid()`
2. Verify RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'your_table'`
3. Ensure user has proper role/tenant access
4. Review policy logic

### "No rows returned" (but data exists)

**Cause**: RLS policy filtering out rows

**Solution**:

1. Temporarily disable RLS to test: `SET ROLE postgres; SELECT * FROM table;`
2. Check policy logic
3. Verify user's tenant_id matches data

## Security Checklist

Before production deployment:

- [ ] All dev mode policies removed
- [ ] Production RLS policies tested
- [ ] Service role key rotated
- [ ] Anon key has minimal permissions
- [ ] Sensitive data encrypted
- [ ] Audit logging enabled
- [ ] No hardcoded credentials

---

**Last Updated**: 2025-11-19
**Maintained By**: Development Team
**Security Contact**: Leon (Project Owner)
