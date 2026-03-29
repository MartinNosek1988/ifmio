# Runbook: RLS Policy Verification

## Overview

RLS (Row-Level Security) policies enforce tenant isolation at the database layer.
The API connects via `service_role` (BYPASSRLS), so policies are defense-in-depth.
They protect against:
- Direct DB access via analytics tools, Supabase Dashboard, read replicas
- Future migration to non-bypass connection pools
- SQL injection that bypasses application-layer tenantId filtering

## Quick Status Check

```sql
-- Count tables with RLS enabled vs policies defined
SELECT
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true) AS rls_enabled,
  (SELECT COUNT(DISTINCT tablename) FROM pg_policies WHERE schemaname = 'public') AS tables_with_policies;
```

Expected: both numbers should be equal (no table with RLS but no policy).

## Verify Policies Exist

```sql
-- List all policies
SELECT tablename, policyname, cmd, permissive, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
```

## Test Cross-Tenant Isolation (Staging Only)

**Prerequisites:**
- Two tenants with data in staging DB
- Access to Supabase SQL editor (or psql)
- Use `anon` or `authenticated` role (NOT service_role)

### Step 1: Set tenant context and query

```sql
-- As non-service role (e.g., authenticated):
SET LOCAL app.current_tenant_id = '<tenant-A-id>';

-- Should return ONLY tenant A's properties
SELECT id, name, "tenantId" FROM properties LIMIT 5;

-- Should return ZERO rows from tenant B
SELECT COUNT(*) FROM properties WHERE "tenantId" = '<tenant-B-id>';
-- Expected: 0
```

### Step 2: Test inherited tables

```sql
SET LOCAL app.current_tenant_id = '<tenant-A-id>';

-- Units (inherits via Property)
SELECT u.id, u.name, p."tenantId"
FROM units u
JOIN properties p ON u."propertyId" = p.id
LIMIT 5;
-- All rows should have tenantId = tenant-A-id

-- Mio Messages (inherits via MioConversation)
SELECT m.id, c."tenantId"
FROM mio_messages m
JOIN mio_conversations c ON m."conversationId" = c.id
LIMIT 5;
```

### Step 3: Test with no context (deny-by-default)

```sql
-- Reset the setting
RESET app.current_tenant_id;

-- Should return ZERO rows (current_setting returns NULL → policy FALSE)
SELECT COUNT(*) FROM properties;
-- Expected: 0

SELECT COUNT(*) FROM invoices;
-- Expected: 0
```

### Step 4: Test INSERT blocking

```sql
SET LOCAL app.current_tenant_id = '<tenant-A-id>';

-- Try inserting a property for tenant B — should FAIL
INSERT INTO properties (id, "tenantId", name, address, city, "postalCode", type, ownership)
VALUES (gen_random_uuid()::text, '<tenant-B-id>', 'Evil', 'Fake', 'City', '00000', 'residential_house', 'SVJ');
-- Expected: ERROR (WITH CHECK violation)
```

## Automated Tests

```bash
# Schema verification (runs against real DB)
cd apps/api && npx jest --testPathPatterns rls-policies --no-coverage

# Tests verify:
# - All tier-1 and tier-2 tables have RLS enabled
# - Every RLS-enabled table has a policy
# - Policies reference app.current_tenant_id
# - No dangling RLS (enabled but no policy = blocks all)
```

## Rollback

To remove all policies without disabling RLS:

```sql
-- Generate DROP statements
SELECT 'DROP POLICY IF EXISTS "' || policyname || '" ON public.' || tablename || ';'
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname LIKE 'tenant_isolation_%'
ORDER BY tablename;
```

To also disable RLS (restores pre-migration state):

```sql
-- Only if you need to completely remove RLS
ALTER TABLE public.properties DISABLE ROW LEVEL SECURITY;
-- ... repeat for each table
```

## service_role Rules

| Role | RLS Effect | Use Case |
|------|-----------|----------|
| `service_role` | **BYPASSED** | API server (NestJS/Prisma) |
| `authenticated` | **ENFORCED** | Supabase client libraries, future direct access |
| `anon` | **ENFORCED** | Public access (should see nothing) |
| `postgres` | **BYPASSED** | Migrations, admin operations |

**Critical:** Never expose `service_role` key to clients. It is server-only.
The `SUPABASE_SERVICE_ROLE_KEY` env var must never be in frontend bundles.

## Monitoring

Watch for these in Supabase logs:
- `ERROR: new row violates row-level security policy` — INSERT/UPDATE with wrong tenantId
- `ERROR: permission denied for table` — if RLS blocks an expected operation
- If the API starts returning empty results: check that the connection uses service_role
