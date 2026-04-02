# IFMIO – C4 Architecture

> Vygenerováno: 2026-03-31
> Na základě: AUDIT_REPORT.md v1.0

---

## Diagram 1: System Context (C4 Level 1)

```mermaid
C4Context
    title IFMIO – System Context

    Person(owner, "Vlastník/Člen SVJ", "Konto, dokumenty, hlasování, portál")
    Person(tenant_user, "Nájemník", "Portál: požadavky, měřidla, platby")
    Person(manager, "Správce FM", "Správa nemovitostí, finance, provoz")
    Person(technician, "Technik", "Work orders, revize, měřidla")
    Person(accountant, "Účetní", "Faktury, předpisy, vyúčtování, konto")

    System(ifmio, "IFMIO Platform", "B2B SaaS pro správu nemovitostí a bytových domů")

    System_Ext(supabase, "Supabase PostgreSQL", "Primární databáze s RLS")
    System_Ext(ares, "ARES / RES", "Registr ekonomických subjektů MF ČR")
    System_Ext(ruian, "RÚIAN", "Registr územní identifikace a adres")
    System_Ext(cuzk, "ČÚZK Domsys", "Katastr nemovitostí — import SVJ")
    System_Ext(fio, "Fio Bank API", "Automatický import bankovních výpisů")
    System_Ext(smtp, "SMTP Server", "Odesílání emailů (Nodemailer)")
    System_Ext(mailgun, "Mailgun", "Příjem emailů (webhook inbound)")
    System_Ext(gosms, "GoSMS.cz", "SMS notifikace")
    System_Ext(whatsapp, "Meta WhatsApp Cloud", "WhatsApp automatizace")
    System_Ext(isds, "ISDS", "Datové schránky (stub)")
    System_Ext(dopisonline, "DopisOnline", "Poštovní zásilky (stub)")
    System_Ext(anthropic, "Anthropic Claude API", "AI extrakce faktur, Mio asistent")
    System_Ext(sentry, "Sentry", "Error tracking a APM")
    System_Ext(cloudflare, "Cloudflare", "DNS, DDoS protection, tunnel")
    System_Ext(pvk, "PVK (třetí strana)", "Sync faktur z externího systému")
    System_Ext(google_oauth, "Google OAuth", "SSO přihlášení")
    System_Ext(facebook_oauth, "Facebook OAuth", "SSO přihlášení")
    System_Ext(microsoft_oauth, "Microsoft OAuth", "SSO přihlášení + M365")
    System_Ext(m365, "Microsoft 365 Graph", "Teams, Planner, Calendar, SharePoint")

    Rel(owner, ifmio, "Web portál (HTTPS)")
    Rel(tenant_user, ifmio, "Web portál (HTTPS)")
    Rel(manager, ifmio, "Web aplikace (HTTPS)")
    Rel(technician, ifmio, "Web aplikace (HTTPS)")
    Rel(accountant, ifmio, "Web aplikace (HTTPS)")

    Rel(ifmio, supabase, "SQL (PgBouncer port 6543)")
    Rel(ifmio, ares, "HTTPS REST")
    Rel(ifmio, ruian, "HTTPS REST")
    Rel(ifmio, cuzk, "HTTPS JSON import")
    Rel(ifmio, fio, "HTTPS REST (15min cron)")
    Rel(ifmio, smtp, "SMTP/TLS (port 587)")
    Rel(mailgun, ifmio, "Webhook POST (HMAC)")
    Rel(ifmio, gosms, "HTTPS REST")
    Rel(ifmio, whatsapp, "HTTPS REST (Meta Cloud API)")
    Rel(ifmio, anthropic, "HTTPS REST (Claude API)")
    Rel(ifmio, sentry, "HTTPS (event ingest)")
    Rel(ifmio, pvk, "HTTPS REST (monthly sync)")
    Rel(ifmio, google_oauth, "OAuth 2.0")
    Rel(ifmio, facebook_oauth, "OAuth 2.0")
    Rel(ifmio, microsoft_oauth, "OAuth 2.0")
    Rel(ifmio, m365, "Graph API (delegated)")
```

---

## Diagram 2: Container (C4 Level 2)

```mermaid
C4Container
    title IFMIO – Containers

    Person(user, "Uživatel", "Správce / Technik / Vlastník / Nájemník")

    System_Boundary(ifmio, "IFMIO Platform") {
        Container(caddy, "Caddy", "Go, v2-alpine", "Reverse proxy, TLS termination, security headers, rate limit na upload")
        Container(web, "Web App", "React 19, Vite 7, Tailwind 4, Zustand, React Query", "SPA pro všechny role, 80+ routes")
        Container(api, "API Server", "NestJS 11, Fastify, TypeScript strict", "REST API (/api/v1/*), 290+ endpointů, business logika")
        Container(cron, "Background Jobs", "NestJS @Cron (v rámci API procesu)", "15+ scheduled jobs: SLA eskalace, banking sync, AI detekce, retention")
        Container(ws, "WebSocket Server", "Socket.io (v rámci API procesu)", "Real-time notifikace, live voting")
        ContainerDb(db, "PostgreSQL 16", "Supabase (PgBouncer)", "100+ tabulek, RLS policies, multi-tenant izolace")
        ContainerDb(redis, "Redis 7", "Alpine (dev only)", "Rate limiting, cache (plánováno pro prod token blacklist)")
    }

    System_Ext(ext_apis, "Externí služby", "Fio, ARES, Mailgun, Anthropic, Sentry, GoSMS, M365")

    Rel(user, caddy, "HTTPS (443)")
    Rel(caddy, web, "HTTP proxy (port 80)")
    Rel(caddy, api, "HTTP proxy (/api/*) (port 3000)")
    Rel(web, api, "Axios REST (/api/v1/*)")
    Rel(api, db, "Prisma Client (SQL)")
    Rel(cron, db, "Prisma Client (SQL)")
    Rel(api, ext_apis, "HTTPS REST")
    Rel(cron, ext_apis, "HTTPS REST (scheduled)")
    Rel(api, ws, "Socket.io events")
    Rel(web, ws, "Socket.io client")
```

---

## Diagram 3: Component (C4 Level 3) — Auth modul

```mermaid
C4Component
    title IFMIO – Auth Module Components

    Container_Boundary(auth, "Auth Module") {
        Component(auth_ctrl, "AuthController", "NestJS Controller", "22 endpointů: login, register, 2FA, OAuth, refresh, sessions")
        Component(auth_svc, "AuthService", "NestJS Injectable (966 řádků)", "Login flow, token issuance, 2FA TOTP, OAuth, password reset")
        Component(risk_svc, "RiskScoringService", "NestJS Injectable", "6-faktorový risk scoring: brute force, GeoIP, impossible travel")
        Component(blacklist_svc, "TokenBlacklistService", "NestJS Injectable", "Dual-layer: in-memory Map + DB (jti-based)")
        Component(apikey_svc, "ApiKeyService", "NestJS Injectable", "API key CRUD, SHA256 hash, scope validation")
        Component(jwt_guard, "JwtAuthGuard", "NestJS Guard", "JWT verify + blacklist check + @Public() skip")
        Component(roles_guard, "RolesGuard", "NestJS Guard", "Role hierarchy enforcement, legacy migration")
        Component(jwt_strategy, "JwtStrategy", "Passport Strategy", "HS256, extract from Bearer header")
        Component(oauth_strategies, "OAuth Strategies", "Passport (Google, FB, MS)", "OAuth 2.0 token exchange")
    }

    ContainerDb(db, "PostgreSQL", "User, RefreshToken, RevokedToken, ApiKey, LoginRiskLog")
    Container(email_svc, "EmailService", "Nodemailer", "Welcome, reset, security alerts")

    Rel(auth_ctrl, auth_svc, "Calls")
    Rel(auth_ctrl, apikey_svc, "Calls")
    Rel(auth_svc, risk_svc, "evaluateRisk()")
    Rel(auth_svc, blacklist_svc, "blacklist(jti)")
    Rel(auth_svc, email_svc, "sendResetEmail(), sendVerifyEmail()")
    Rel(jwt_guard, blacklist_svc, "isBlacklisted(jti)")
    Rel(jwt_guard, jwt_strategy, "validate()")
    Rel(auth_svc, db, "Prisma: User, RefreshToken, LoginRiskLog")
    Rel(blacklist_svc, db, "Prisma: RevokedToken")
    Rel(apikey_svc, db, "Prisma: ApiKey")
```

---

## Diagram 3b: Component — Finance modul

```mermaid
C4Component
    title IFMIO – Finance Module Components

    Container_Boundary(finance, "Finance Module") {
        Component(fin_ctrl, "FinanceController", "NestJS Controller", "70+ endpointů: invoices, bank, prescriptions, matching")
        Component(fin_svc, "FinanceService", "NestJS Injectable (54 KB)", "Bank accounts, transactions, invoices CRUD")
        Component(match_svc, "MatchingService", "NestJS Injectable", "Auto/manual párování transakcí s předpisy/fakturami")
        Component(calc_svc, "PrescriptionCalcService", "NestJS Injectable", "Výpočet předpisů: per_area, per_share, per_person")
        Component(konto_svc, "KontoService", "NestJS Injectable", "Double-entry ledger: OwnerAccount + LedgerEntry")
        Component(ai_batch_svc, "AiBatchService", "NestJS Injectable (19 KB)", "Anthropic Claude batch extraction")
        Component(comp_svc, "ComponentsService", "NestJS Injectable", "PrescriptionComponent CRUD")
        Component(settle_svc, "SettlementService", "NestJS Injectable", "Roční vyúčtování: heating, hot water, other costs")
    }

    ContainerDb(db, "PostgreSQL", "Invoice, BankAccount, BankTransaction, Prescription, OwnerAccount, LedgerEntry, Settlement")
    Container_Ext(anthropic, "Anthropic API", "Claude — PDF faktura extraction")
    Container_Ext(fio, "Fio Bank API", "Bankovní výpisy")

    Rel(fin_ctrl, fin_svc, "CRUD operations")
    Rel(fin_ctrl, match_svc, "match(), matchSingle()")
    Rel(fin_ctrl, ai_batch_svc, "extractPdf(), batchExtract()")
    Rel(fin_svc, db, "Prisma")
    Rel(match_svc, konto_svc, "postToKonto()")
    Rel(calc_svc, comp_svc, "getComponents()")
    Rel(calc_svc, db, "Prisma: PrescriptionComponent, ComponentAssignment")
    Rel(konto_svc, db, "Prisma: OwnerAccount, LedgerEntry")
    Rel(ai_batch_svc, anthropic, "Claude API (batch)")
    Rel(fin_svc, fio, "Fio REST API (cron sync)")
```

---

## Diagram 3c: Component — Helpdesk modul

```mermaid
C4Component
    title IFMIO – Helpdesk Module Components

    Container_Boundary(helpdesk, "Helpdesk Module") {
        Component(hd_ctrl, "HelpdeskController", "NestJS Controller", "17+ endpointů: tickets, SLA, protocol, items")
        Component(hd_svc, "HelpdeskService", "NestJS Injectable", "Ticket CRUD, lifecycle, assign, claim, resolve")
        Component(sla_svc, "SlaEscalationService", "NestJS Injectable + @Cron('0 * * * *')", "Hourly SLA check, eskalace, due-soon notify")
        Component(sla_policy_svc, "SlaPolicyService", "NestJS Injectable", "SLA policy CRUD, deadline calculation")
        Component(protocol_svc, "ProtocolService", "NestJS Injectable", "Protocol generation, handover, PDF")
    }

    ContainerDb(db, "PostgreSQL", "HelpdeskTicket, HelpdeskItem, HelpdeskProtocol, SlaPolicy")
    Container(notif_svc, "NotificationsService", "In-app + email", "Notify assignee, requester, SLA breach")
    Container(pdf_svc, "PdfService", "PDFKit", "Protocol PDF generation")

    Rel(hd_ctrl, hd_svc, "CRUD, lifecycle")
    Rel(hd_ctrl, sla_policy_svc, "SLA config")
    Rel(hd_ctrl, protocol_svc, "Protocol CRUD")
    Rel(hd_svc, db, "Prisma")
    Rel(sla_svc, db, "Prisma: query overdue tickets")
    Rel(sla_svc, notif_svc, "SLA breach notification")
    Rel(protocol_svc, pdf_svc, "Generate PDF")
    Rel(protocol_svc, db, "Prisma: Protocol, ProtocolLine")
```

---

## Diagram 3d: Component — Property modul

```mermaid
C4Component
    title IFMIO – Property Module Components

    Container_Boundary(property, "Property Module") {
        Component(prop_ctrl, "PropertiesController", "NestJS Controller", "8 endpointů: CRUD, nav, ČÚZK import")
        Component(prop_svc, "PropertiesService", "NestJS Injectable", "Property CRUD, archive, geocoding")
        Component(unit_ctrl, "UnitsController", "NestJS Controller", "25+ endpointů: units, rooms, equipment, fees, occupancies")
        Component(unit_svc, "UnitsService", "NestJS Injectable", "Unit CRUD, transfer, occupancy management")
        Component(unit_detail_ctrl, "UnitDetailController", "NestJS Controller", "Rooms, quantities, equipment, management fees, meters")
        Component(cuzk_svc, "CuzkImportService", "NestJS Injectable", "ČÚZK Domsys JSON parse + confirm")
    }

    ContainerDb(db, "PostgreSQL", "Property, Unit, UnitRoom, UnitEquipment, UnitQuantity, UnitManagementFee, Occupancy")
    Container_Ext(cuzk, "ČÚZK Domsys", "Katastr nemovitostí JSON")

    Rel(prop_ctrl, prop_svc, "CRUD")
    Rel(prop_ctrl, cuzk_svc, "importCuzk()")
    Rel(unit_ctrl, unit_svc, "CRUD, occupancy")
    Rel(unit_detail_ctrl, unit_svc, "rooms, equipment, fees")
    Rel(prop_svc, db, "Prisma: Property")
    Rel(unit_svc, db, "Prisma: Unit, Occupancy, UnitRoom, ...")
    Rel(cuzk_svc, cuzk, "JSON import")
```

---

## Diagram 3e: Component — Documents modul

```mermaid
C4Component
    title IFMIO – Documents Module Components

    Container_Boundary(docs, "Documents Module") {
        Component(doc_ctrl, "DocumentsController", "NestJS Controller", "5 endpointů: list, upload, download, delete, links")
        Component(doc_svc, "DocumentsService", "NestJS Injectable", "File storage, metadata, entity linking")
        Component(scanner_svc, "ScannerService", "NestJS Injectable", "AV scanning (stub — ClamAV TODO)")
    }

    ContainerDb(db, "PostgreSQL", "Document, DocumentTag, DocumentLink")
    ContainerDb(storage, "Local FS / S3", "File storage (storageType: local|s3)")

    Rel(doc_ctrl, doc_svc, "CRUD")
    Rel(doc_svc, scanner_svc, "scanFile() — stub")
    Rel(doc_svc, db, "Prisma: Document, DocumentLink")
    Rel(doc_svc, storage, "Read/Write files")
```

---

## Diagram 4: Deployment (Production)

```mermaid
C4Deployment
    title IFMIO – Production Deployment

    Deployment_Node(cloudflare, "Cloudflare", "DNS + DDoS + Tunnel") {
        Deployment_Node(cf_tunnel, "cloudflared", "Tunnel to origin")
    }

    Deployment_Node(vps, "VPS (Hetzner/similar)", "/opt/ifmio") {
        Deployment_Node(docker, "Docker Compose (prod)") {
            Container(caddy_d, "Caddy v2", "Reverse proxy, TLS, security headers, file upload limits")
            Container(api_d, "ifmio-api", "NestJS + Fastify, Node 20 Alpine, non-root (ifmio:1001), read-only FS")
            Container(web_d, "ifmio-web", "Nginx Alpine, Vite build, SPA routing")
        }
    }

    Deployment_Node(supabase_cloud, "Supabase Cloud", "EU Central") {
        ContainerDb(pg_d, "PostgreSQL 16", "PgBouncer (6543) + Direct (5432)")
    }

    Deployment_Node(ext_services, "External SaaS") {
        Container(sentry_d, "Sentry", "Error tracking + APM")
        Container(anthropic_d, "Anthropic API", "Claude AI")
        Container(fio_d, "Fio Bank API", "Banking sync")
        Container(smtp_d, "SMTP", "Email delivery")
    }

    Rel(cloudflare, caddy_d, "HTTPS")
    Rel(caddy_d, api_d, "HTTP :3000 (/api/*)")
    Rel(caddy_d, web_d, "HTTP :80 (SPA)")
    Rel(api_d, pg_d, "PostgreSQL (PgBouncer)")
    Rel(api_d, sentry_d, "HTTPS events")
    Rel(api_d, anthropic_d, "HTTPS REST")
    Rel(api_d, fio_d, "HTTPS REST (cron)")
    Rel(api_d, smtp_d, "SMTP/TLS")
```

---

## Diagram 5: Data Flows — klíčové business flows

### 5.1 Příchozí faktura (email → AI extrakce → schválení)

```mermaid
sequenceDiagram
    actor Mailgun as Mailgun Webhook
    participant API as API Server
    participant Sanitize as SanitizePipe
    participant EIS as EmailInboundService
    participant AI as Anthropic Claude
    participant DB as PostgreSQL
    participant User as Správce (Web)

    Mailgun->>API: POST /api/v1/email-inbound/webhook (HMAC signed)
    API->>Sanitize: Validate HMAC signature
    Sanitize->>EIS: processInboundEmail(sender, subject, attachments)
    EIS->>EIS: Resolve tenant by slug
    EIS->>DB: Uložit EmailInboundLog
    EIS->>EIS: Extrahovat PDF přílohy

    alt PDF příloha nalezena
        EIS->>AI: POST /messages (Claude: extract invoice data from PDF)
        AI-->>EIS: {supplierName, ico, amount, dueDate, lines[], confidence}
        EIS->>DB: Vytvoř Invoice (status: draft, source: email)
        EIS->>DB: Ulož AiExtractionLog
    end

    User->>API: GET /finance/invoices (status: draft)
    API-->>User: Seznam draft faktur
    User->>API: PUT /finance/invoices/:id (review + edit)
    User->>API: POST /finance/invoices/:id/submit
    API->>DB: approvalStatus = submitted

    User->>API: POST /finance/invoices/:id/approve
    API->>DB: approvalStatus = approved
    API->>DB: AuditLog (action: approve)
```

### 5.2 Předpis plateb (nastavení → generování → konto)

```mermaid
sequenceDiagram
    actor M as Správce
    participant API as API Server
    participant CalcSvc as PrescriptionCalcService
    participant KontoSvc as KontoService
    participant DB as PostgreSQL

    M->>API: POST /finance/components (name, calculationMethod: PER_AREA, defaultAmount: 100)
    API->>DB: Vytvoř PrescriptionComponent

    M->>API: POST /finance/components/:id/assignments (unitId, overrideAmount?)
    API->>DB: Vytvoř ComponentAssignment

    M->>API: POST /finance/prescriptions/generate (propertyId, period)
    API->>CalcSvc: generatePrescriptions()
    CalcSvc->>DB: Načti units + components + assignments
    CalcSvc->>CalcSvc: Pro každý unit: amount = area * rate (nebo share * amount...)
    CalcSvc->>DB: Vytvoř Prescription + PrescriptionItems

    Note over CalcSvc,KontoSvc: Automatické zaúčtování do konta

    CalcSvc->>KontoSvc: postDebit(ownerId, amount)
    KontoSvc->>DB: Vytvoř LedgerEntry (type: DEBIT, source: PRESCRIPTION)
    KontoSvc->>DB: Update OwnerAccount.currentBalance -= amount
```

### 5.3 HelpDesk tiket lifecycle

```mermaid
sequenceDiagram
    actor R as Obyvatel (Portál)
    actor T as Technik
    participant API as API Server
    participant SLA as SlaEscalationService
    participant Notif as NotificationsService
    participant DB as PostgreSQL

    R->>API: POST /portal/tickets {title, description}
    API->>DB: Vytvoř HelpdeskTicket (status: open)
    API->>DB: Načti SlaPolicy → set responseDueAt, resolutionDueAt
    API->>Notif: Notifikace správci

    Note over SLA: Cron (každou hodinu)
    SLA->>DB: SELECT tickets WHERE NOW() > responseDueAt AND status = open
    SLA->>DB: escalationLevel++, priority = high→urgent
    SLA->>Notif: "SLA breached" alert

    T->>API: POST /helpdesk/:id/claim
    API->>DB: assigneeId = technik, status = in_progress, firstResponseAt = NOW()

    T->>API: POST /helpdesk/:id/resolve
    API->>DB: status = resolved, resolvedAt = NOW()
    API->>Notif: Notifikace obyvateli "Váš požadavek byl vyřešen"

    R->>API: POST /helpdesk/:id/csat {score: 5, comment: "Rychlé řešení"}
    API->>DB: csatScore = 5
```

### 5.4 Bankovní výpis (Fio import → párování → konto)

```mermaid
sequenceDiagram
    participant Cron as CronService (15min)
    participant Banking as BankingService
    participant Fio as Fio Bank API
    participant Match as MatchingService
    participant Konto as KontoService
    participant DB as PostgreSQL

    Cron->>Banking: syncAllAccounts()
    Banking->>DB: Načti BankAccounts (syncEnabled, fio provider)
    loop Pro každý účet
        Banking->>Fio: GET /last/ (since lastSyncCursor)
        Fio-->>Banking: Transaction list (JSON)
        Banking->>DB: Uložit BankTransactions (status: unmatched)
        Banking->>DB: Update lastSyncAt, lastSyncCursor
    end

    Note over Match: Auto-matching trigger
    Match->>DB: Načti unmatched transactions
    loop Pro každou transakci
        Match->>DB: Hledej Prescription s matching variableSymbol
        alt Match nalezen
            Match->>DB: BankTransaction.status = matched, matchedEntityId
            Match->>Konto: postCredit(ownerId, amount)
            Konto->>DB: LedgerEntry (type: CREDIT, source: BANK_TRANSACTION)
            Konto->>DB: OwnerAccount.currentBalance += amount
        else Bez match
            Note over Match: Zůstane unmatched → manuální párování
        end
    end
```

### 5.5 Per rollam hlasování

```mermaid
sequenceDiagram
    actor M as Správce
    participant API as API Server
    participant Email as EmailService
    participant DB as PostgreSQL
    actor O as Vlastník

    M->>API: POST /assemblies (type: per-rollam) → PerRollamVoting
    API->>DB: Vytvoř PerRollamVoting (status: DRAFT)

    M->>API: POST /assemblies/:id/agenda-items (title, majorityType)
    API->>DB: Vytvoř PerRollamItem(s)

    M->>API: POST /assemblies/:id/attendees/populate
    API->>DB: Vytvoř PerRollamBallot pro každého vlastníka (accessToken, status: PENDING)

    M->>API: POST /assemblies/:id/publish
    API->>DB: status = PUBLISHED
    API->>Email: Pro každý ballot: send email s hlasovacím odkazem

    Email-->>O: Email s odkazem /hlasovani/:accessToken

    O->>API: GET /hlasovani/:accessToken (public route)
    API->>DB: Načti ballot + voting items
    API-->>O: Hlasovací formulář

    O->>API: POST /hlasovani/:accessToken/vote [{itemId, choice: ANO}]
    API->>DB: Vytvoř PerRollamResponse(s), ballot.status = SUBMITTED

    Note over M: Po deadline
    M->>API: POST /assemblies/:id/complete
    API->>DB: Pro každý item: spočítej votes, respondedShares, isQuorate
    API->>DB: result = SCHVALENO | NESCHVALENO | NEUSNASENO
    API->>DB: status = COMPLETED
```

---

## Diagram 6: Security Architecture

```mermaid
flowchart TB
    subgraph Client["Web Client (React SPA)"]
        A[sessionStorage: JWT + refreshToken]
        B[Axios interceptor: auto-refresh]
    end

    subgraph Caddy["Caddy Reverse Proxy"]
        C1[TLS Termination]
        C2[Security Headers: CSP, HSTS, X-Frame-Options]
        C3[Upload limits: 25MB docs, 10MB residents]
        C4[Dotfile blocking: .env, .git → 404]
    end

    subgraph API["NestJS API Server"]
        D1[ThrottlerBehindProxyGuard: 100 req/60s]
        D2[JwtAuthGuard: verify + blacklist check]
        D3[ApiKeyGuard: X-API-Key fallback]
        D4[RolesGuard: 8-tier hierarchy]
        D5[PropertyAccessGuard: property-scoped]
        D6[SanitizePipe: strip HTML tags]
        D7[ValidationPipe: whitelist + forbidNonWhitelisted]
        D8[TenantContextInterceptor: AsyncLocalStorage]
        D9[AuditInterceptor: POST/PUT/PATCH/DELETE logging]
        D10[PromptInjectionGuard: AI endpoint protection]
        D11[PiiRedactor: mask PII before LLM calls]
    end

    subgraph DB["PostgreSQL"]
        E1[RLS Policies: tenant isolation]
        E2[Prisma extension: auto-inject tenantId]
    end

    Client -->|HTTPS| Caddy
    Caddy -->|HTTP| API
    D1 --> D2 --> D3 --> D4 --> D5
    D5 --> D6 --> D7 --> D8 --> D9
    API -->|SQL| DB
```

---

*Vygenerováno na základě AUDIT_REPORT.md. Všechny diagramy odpovídají aktuálnímu stavu kódu k 2026-03-31.*
