# Security Architecture — ifmio

## Database Security

Tenant isolation is enforced at **two levels**:

1. **Application layer** (primary): `PropertyScopeService` adds `tenantId` WHERE clause to all Prisma queries. Every service method receives `AuthUser` with `tenantId` from JWT.

2. **Database layer** (secondary): RLS is enabled on all tables (migration `20260525700000`) but **no policies are defined**. The API uses Supabase `service_role` key which has `BYPASSRLS` privilege.

> **Warning:** Any direct database connection (analytics, read replicas, data exports) **MUST** use the `anon` or `authenticated` role with proper RLS policies, **NOT** `service_role`.

## Authentication

- **JWT** with unique JTI, 60min access / 30day refresh
- **Refresh token rotation** — old tokens deleted on refresh
- **Token blacklist** — in-memory + DB fallback
- **Adaptive risk scoring** — brute force, impossible travel, new device detection
- **2FA TOTP** with backup codes
- **bcrypt** 12 rounds for password hashing
- **Password history** — prevents reuse of last 5 passwords

## Portal Access

- 256-bit random tokens (not JWT)
- **90-day expiration** by default
- Admin can refresh or revoke tokens
- Token validated on every request

## Known Limitations

- RLS policies not yet defined (application-layer isolation only)
- `styleSrc` uses `'unsafe-inline'` (required for CSS-in-JS)
- No malware scanning on file uploads (MIME whitelist + size limit only)
