# Copilot Instructions for ifmio

This document provides essential context for AI assistants working in the ifmio codebase.

## Quick Start Commands

### Development
```bash
# Run all apps (API, web) in watch mode
npm run dev

# Build all apps and packages
npm run build

# Run all linters
npm run lint

# Run type checking
npm run type-check
```

### Testing
```bash
# Backend: run all tests
cd apps/api && npm run test

# Backend: run critical security tests
cd apps/api && npm run test:critical

# Backend: run specific test file
cd apps/api && npm run test -- auth.spec.ts

# Backend: e2e tests
cd apps/api && npm run test:e2e

# Frontend: unit tests
cd apps/web && npm run test

# Frontend: e2e tests (headless)
cd apps/e2e && npm run test

# Frontend: e2e tests (interactive UI)
cd apps/e2e && npm run e2e:ui

# Frontend: e2e tests (browser visible)
cd apps/e2e && npm run e2e:headed

# E2E smoke tests only
cd apps/e2e && npm run test:smoke
```

## Architecture Overview

### Monorepo Structure
- **apps/api** — NestJS backend using Fastify adapter, Prisma ORM, PostgreSQL
- **apps/web** — React 19 frontend with Vite, Tailwind CSS, React Query
- **apps/e2e** — Playwright end-to-end tests
- **packages/shared-types** — TypeScript types shared across apps
- **packages/validation** — Shared validation schemas
- **tools/sunvote-bridge** — Hardware integration for SVJ voting devices

### Backend Architecture (NestJS)

#### Feature Modules
The API has 40+ feature modules organized by domain:
- **Auth** — JWT, OAuth2 (Google/Microsoft/Facebook), password reset, 2FA
- **Properties** — Property management, units, common areas
- **Residents** — Tenant management, tenancy contracts, occupancy
- **Finance** — Accounting, invoicing, payment tracking, financial forecasting
- **Work Orders & Helpdesk** — Maintenance requests, asset tracking with QR codes
- **Assemblies** — SVJ voting (SunVote hardware integration), protocols
- **Notifications** — Email (SMTP), WhatsApp
- **Banking** — Bank account integration, transaction imports
- **Debtors** — Arrears tracking, debt collection management
- **Reports** — Analytics and dashboards
- **Admin** — Tenant configuration, user management

#### Core Patterns
- **Tenant Isolation** — All entities have `tenantId`, filtered automatically via `TenantContextInterceptor`. All queries must filter by tenant.
- **Role-Based Access Control (RBAC)** — Roles: `owner`, `admin`, `manager`, `technician`, `viewer`. Use `@Roles()` decorator on endpoints.
- **Property Access Guard** — Optional property-level ACL via `@PropertyScoped()` decorator. Work in progress: see `docs/access-matrix.md` for P5.1 roadmap.
- **Audit Trail** — `@Audit()` decorator logs all writes. `@AuditRead()` logs sensitive reads (financial data).
- **Field-Level Encryption** — Use `FieldEncryptionService` for sensitive data (SSNs, bank accounts). See `common/crypto/`.
- **Input Sanitization** — All inputs sanitized by `SanitizePipe` (HTML stripping, XSS prevention).
- **Domain Scope Validation** — Critical tests verify property/unit scoping: `scope-gaps-pr3.spec`, `scope-gaps-pr4.spec`.

#### Common Utilities (src/common/)
- **Guards**: `JwtAuthGuard` (JWT validation), `RolesGuard` (role checking), `PropertyAccessGuard` (property scoping)
- **Interceptors**: `TenantContextInterceptor` (extracts tenant from JWT), `AuditInterceptor` (logs writes), `SensitiveReadInterceptor` (logs sensitive reads)
- **Decorators**: `@Roles()`, `@Audit()`, `@AuditRead()`, `@PropertyScoped()`, `@CurrentUser()`
- **Pipes**: `SanitizePipe` (HTML/XSS sanitization), `ValidationPipe` (DTO validation via class-validator)
- **Services**: `PrismaModule` (DB connection), `CryptoService`, `FieldEncryptionService`

#### API Versioning
- Global prefix: `/api/v1`
- Swagger docs available in development: `http://localhost:3000/api/docs`

### Frontend Architecture (React)

#### Module Structure (src/modules/)
- **Auth** — Login, 2FA, password reset, token refresh
- **Properties, Units, Residents** — CRUD + advanced forms
- **Finance** — Invoicing, payment tracking, reports
- **Work Orders** — Helpdesk tickets, assignment, tracking
- **Dashboard** — Analytics and KPIs
- **Admin** — Tenant settings, user management
- **Portal** — Resident-facing features (payments, tickets)

#### State Management
- **Zustand** — Global app state (auth, tenant, user)
- **React Query** — Server state (data fetching, caching, sync)
- **Local state** — React Hook Form for forms, useState for UI state

#### Form Handling
- **React Hook Form** + **Zod** for validation
- Pattern: Define Zod schema → Create React Hook Form resolver → Validate on submit
- Example: `const schema = z.object({ name: z.string().min(1) }); useForm({ resolver: zodResolver(schema) })`

#### Styling
- **Tailwind CSS 4** with `@tailwindcss/vite` plugin
- Custom components in `src/components/` (Lucide icons for UI)

#### Internationalization
- **i18next** with language detector
- Translation files in `src/locales/`
- Use `useTranslation()` hook in components

#### Real-Time Features
- **Socket.io client** for WebSocket connections (work order updates, notifications)
- Connection managed in global state

### Database (PostgreSQL via Prisma)

#### Key Concepts
- **Tenancy**: All tables have `tenantId` foreign key. Queries must filter by tenant.
- **Soft Deletes**: Some tables use `deletedAt` for logical deletion (auditing).
- **Audit Logging**: `audit_log` table tracks all writes with user, tenant, timestamp, changes.
- **Encryption**: Sensitive fields encrypted at rest (SSNs, bank accounts) via `FieldEncryptionService`.

#### Migrations
- Use Prisma migrations: `cd apps/api && npx prisma migrate dev --name <name>`
- Migrations stored in `prisma/migrations/`
- Always test migrations locally before deploying

#### Seeding
- Development seed: `apps/api/src/e2e-seed/`
- E2E test seed: `apps/e2e/tests/fixtures/` (created by Playwright fixtures)

## Development Conventions

### Code Organization
- **One service per domain concern** (e.g., `PropertyService`, `FinanceService`)
- **DTO pattern**: Separate request (CreateXxxDto) and response (XxxDto) DTOs
- **Module structure**: Each feature has `/controllers`, `/services`, `/dtos`, `/entities` directories
- **Prisma client singleton**: Use `PrismaService` (injected) — never import `@prisma/client` directly

### Error Handling
- **API**: Throw `HttpException` with appropriate status code (400, 401, 403, 404, 500)
- **Frontend**: Handle errors via React Query's `onError` callback or error boundaries
- **Sentry**: Configured for both API and web; critical errors auto-logged

### Database Queries
- **Always filter by tenant**: `await this.prisma.property.findMany({ where: { tenantId } })`
- **Use Prisma's include/select**: Avoid N+1 queries via eager loading
- **Pagination**: Use `skip` and `take` for large result sets

### Testing Conventions (Backend)
- **Unit tests**: `*.spec.ts` files co-located with source
- **Test database**: Each test uses isolated transaction (Prisma test utils)
- **Critical test suite**: `npm run test:critical` — runs security, auth, and scoping tests before deploy
- **Fixtures**: Seed test data in `beforeEach()` or use `e2e-seed` module

### Testing Conventions (Frontend)
- **Vitest** for unit tests (`.test.ts` or `.test.tsx` files)
- **Playwright** for e2e tests (in `apps/e2e/tests/`)
- **Fixtures**: Test data defined in Playwright fixtures (`apps/e2e/tests/fixtures/`)

### Security Practices
- **Environment variables**: Sensitive data only in `.env` (never commit `.env`)
- **JWT secrets**: `JWT_SECRET` (access token) and `JWT_REFRESH_SECRET` (refresh token) must be 32+ chars
- **CORS**: Whitelist `CORS_ORIGIN` in production
- **Rate limiting**: Default 100 requests per 60 seconds (configurable in `app.module.ts`)
- **Helmet**: CSP headers, HSTS, X-Frame-Options configured
- **Validation**: All inputs validated via DTOs and `ValidationPipe`
- **Sanitization**: All inputs sanitized for XSS via `SanitizePipe`
- **Field encryption**: Use `FieldEncryptionService` for SSNs, bank account numbers, IDs

### Tenant Context
Every request must have a tenant context:
- **Header-based**: Extract `X-Tenant-Id` or parse JWT `tenantId`
- **Automatic via interceptor**: `TenantContextInterceptor` sets `req.user.tenantId`
- **Usage**: Inject `TenantContextService` to access current tenant in any service
- **Validation**: Use `@PropertyScoped()` to validate user owns the property (if implementing property ACL)

### Roles & Permissions
Available roles (level numbers used for hierarchy):
- `owner` (50) — Tenant account owner
- `admin` (40) — Tenant admin
- `manager` (30) — Property manager
- `technician` (20) — Technician/operator
- `viewer` (10) — Read-only

Usage:
```typescript
@Roles('admin', 'owner') // Only admin/owner can access
@Post('properties')
createProperty(@Body() dto: CreatePropertyDto) { }
```

## Deployment

### Prerequisites
- Ubuntu 22.04+ server
- Docker + Docker Compose v2
- Domain with DNS A record pointing to server
- Ports 80, 443 open

### Configuration
1. Clone repo and copy `.env.example` → `.env`
2. Set required variables:
   - `POSTGRES_PASSWORD` — Strong password
   - `JWT_SECRET` — 64-char random string: `openssl rand -base64 48`
   - `DOMAIN` — Your domain (e.g., ifmio.com)
   - `CADDY_EMAIL` — For SSL certificate renewal
3. Set optional variables (email, OAuth, integrations)

### Deployment Commands
```bash
# Build and start (production)
docker compose -f docker-compose.prod.yml up -d

# View logs
docker compose -f docker-compose.prod.yml logs -f api

# Health check
curl https://yourdomain.cz/api/v1/health

# Update (pull, rebuild, restart)
git pull && docker compose -f docker-compose.prod.yml build && docker compose -f docker-compose.prod.yml up -d

# Database backup
docker exec ifmio-postgres-1 pg_dump -U ifmio ifmio > backup_$(date +%Y%m%d).sql
```

### Troubleshooting
- **API won't start**: Check logs: `docker compose logs api`, verify `DATABASE_URL` and `JWT_SECRET`
- **SSL certificate error**: Check DNS and Caddy logs: `docker compose logs caddy`
- **Email not sending**: Verify SMTP settings, test via `/api/v1/admin/email/test`
- **Backup/restore**: See `docs/runbooks/backup-restore.md`
- **Rollback**: See `docs/runbooks/rollback.md`

## Key Files to Know

- **Root**: `package.json` (monorepo), `turbo.json` (build config), `.env.example` (config template)
- **Backend**: `apps/api/src/app.module.ts` (feature imports), `apps/api/src/main.ts` (bootstrap)
- **Database**: `apps/api/prisma/schema.prisma` (schema), `apps/api/prisma/migrations/` (migrations)
- **Frontend**: `apps/web/src/main.tsx` (entry), `apps/web/src/app/` (routing)
- **Docs**: `docs/access-matrix.md` (RBAC roadmap), `DEPLOY.md` (deployment guide), `docs/runbooks/` (operations)

## Important Notes

- **Tenant filter is critical**: Missing `tenantId` filter = security breach. Always verify queries filter by tenant.
- **Critical test suite**: Run `npm run test:critical` before merging auth/scope changes.
- **Access matrix**: RBAC design is in progress (P5.1). See `docs/access-matrix.md` for target state.
- **Field encryption**: Expanding to cover all sensitive data. Check `FieldEncryptionService` for current coverage.
- **E2E tests**: Run in CI/CD pipeline, not required before local commits but recommended before pushing.
