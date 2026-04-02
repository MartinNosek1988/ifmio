# IFMIO – Feature Catalog

> Vygenerováno: 2026-03-31
> Na základě: AUDIT_REPORT.md v1.0

---

## Core / Auth / Tenant (F-001 – F-0XX)

### F-001: Registrace nového tenantu

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-001 |
| **Modul** | Auth |
| **Popis** | Registrace nové organizace (tenant) včetně prvního uživatele (tenant_owner). Vytvoří tenant, user, TenantSettings. |
| **Role** | PUBLIC (neautentizovaný) |
| **Status** | ✅ Implementováno |
| **API endpointy** | `POST /api/v1/auth/register` |
| **Frontend routes** | `/register` (4-step wizard) |
| **Prisma modely** | Tenant, TenantSettings, User |
| **Klíčová pole** | name, email, password, tenantName, phone, ico, dic |
| **Validace** | Email unikátní, heslo min 8 znaků (1 upper, 1 lower, 1 digit), tenantName 2–200 znaků |
| **Závislosti** | EmailService (welcome email) |
| **Externí integrace** | Žádné |
| **Soubory** | `auth/auth.controller.ts`, `auth/auth.service.ts`, `RegisterPage.tsx` |
| **Známé problémy** | — |

### F-002: Přihlášení (email + heslo)

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-002 |
| **Modul** | Auth |
| **Popis** | Standardní login s email/password, adaptivní risk scoring, podpora 2FA challenge. |
| **Role** | PUBLIC |
| **Status** | ✅ Implementováno |
| **API endpointy** | `POST /api/v1/auth/login` |
| **Frontend routes** | `/login` |
| **Prisma modely** | User, RefreshToken, LoginRiskLog |
| **Klíčová pole** | email, password |
| **Validace** | Email valid, password min 8. Rate limit 5/min. |
| **Závislosti** | RiskScoringService, TokenBlacklistService |
| **Externí integrace** | GeoIP (geoip-lite) |
| **Soubory** | `auth/auth.controller.ts`, `auth/auth.service.ts`, `auth/risk-scoring.service.ts`, `LoginPage.tsx` |
| **Známé problémy** | — |

### F-003: Dvoufaktorová autentizace (TOTP)

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-003 |
| **Modul** | Auth |
| **Popis** | Setup/verify/disable TOTP, validate při loginu, backup codes (8 ks, bcrypt). |
| **Role** | Autentizovaný uživatel |
| **Status** | ✅ Implementováno |
| **API endpointy** | `POST /auth/2fa/setup`, `POST /auth/2fa/verify`, `POST /auth/2fa/disable`, `POST /auth/2fa/validate` |
| **Frontend routes** | `/login` (2FA krok), `/profile` (Security tab) |
| **Prisma modely** | User (totpSecret, totpEnabled, totpBackupCodes) |
| **Klíčová pole** | totpSecret (AES-256-GCM encrypted), totpBackupCodes (bcrypt hashed) |
| **Validace** | 6-digit TOTP kód nebo 8-char backup code |
| **Závislosti** | CryptoService |
| **Externí integrace** | otplib |
| **Soubory** | `auth/auth.service.ts` (lines 276–450) |
| **Známé problémy** | — |

### F-004: OAuth SSO (Google, Facebook, Microsoft)

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-004 |
| **Modul** | Auth |
| **Popis** | OAuth 2.0 login přes Google, Facebook, Microsoft. Link existujícího účtu nebo login. |
| **Role** | PUBLIC |
| **Status** | ✅ Implementováno |
| **API endpointy** | `POST /auth/oauth/token`, `POST /auth/oauth/accept-invitation` |
| **Frontend routes** | `/auth/callback` |
| **Prisma modely** | User (oauthProvider, oauthId) |
| **Klíčová pole** | provider, accessToken |
| **Validace** | Token verified against provider API |
| **Závislosti** | Passport.js strategies |
| **Externí integrace** | Google, Facebook, Microsoft OAuth |
| **Soubory** | `auth/strategies/google.strategy.ts`, `facebook.strategy.ts`, `microsoft.strategy.ts` |
| **Známé problémy** | — |

### F-005: Token refresh a session management

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-005 |
| **Modul** | Auth |
| **Popis** | JWT refresh s device binding (IP + UA), suspicious refresh detection, multi-session management. |
| **Role** | Autentizovaný |
| **Status** | ✅ Implementováno |
| **API endpointy** | `POST /auth/refresh`, `GET /auth/sessions`, `DELETE /auth/sessions/:id`, `DELETE /auth/sessions` |
| **Frontend routes** | `/profile` (Security tab) |
| **Prisma modely** | RefreshToken, RevokedToken |
| **Klíčová pole** | refreshToken, ipAddress, userAgent, deviceName |
| **Validace** | Token rotation, IP/UA match check |
| **Závislosti** | TokenBlacklistService, SecurityAlertingService |
| **Externí integrace** | — |
| **Soubory** | `auth/auth.service.ts`, `auth/token-blacklist.service.ts` |
| **Známé problémy** | Token blacklist je in-memory (potřebuje Redis pro multi-node) |

### F-006: API klíče

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-006 |
| **Modul** | Auth |
| **Popis** | Správa API klíčů pro strojový přístup. SHA256 hash, scoped, expirable. Max 10 per tenant. |
| **Role** | MANAGE (tenant_owner, tenant_admin) |
| **Status** | ✅ Implementováno |
| **API endpointy** | `GET /api-keys`, `POST /api-keys`, `POST /api-keys/:id/revoke`, `DELETE /api-keys/:id`, `GET /api-keys/scopes` |
| **Frontend routes** | `/settings` |
| **Prisma modely** | ApiKey |
| **Klíčová pole** | name, keyHash, keyPrefix, scopes[], expiresAt |
| **Validace** | Max 10 klíčů per tenant, scopes z definovaného seznamu |
| **Závislosti** | ApiKeyGuard |
| **Externí integrace** | — |
| **Soubory** | `auth/api-key.service.ts`, `auth/api-key/api-key.controller.ts` |
| **Známé problémy** | — |

### F-007: Password reset flow

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-007 |
| **Modul** | Auth |
| **Popis** | Zapomenuté heslo → email s reset linkem → nastavení nového hesla. Password history (5 hashů). |
| **Role** | PUBLIC |
| **Status** | ✅ Implementováno |
| **API endpointy** | `POST /auth/forgot-password`, `POST /auth/reset-password` |
| **Frontend routes** | `/forgot-password`, `/reset-password` |
| **Prisma modely** | User (passwordResetToken, passwordResetExpiry, passwordHistory) |
| **Klíčová pole** | token (32-byte hex), password (min 8, strength rules) |
| **Validace** | Token 1h expiry, password not in history (last 5), not in common list |
| **Závislosti** | EmailService |
| **Externí integrace** | — |
| **Soubory** | `auth/auth.service.ts`, `auth/password-policy.ts` |
| **Známé problémy** | — |

### F-008: Pozvánky a onboarding

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-008 |
| **Modul** | Admin |
| **Popis** | Pozvání uživatelů do organizace, přijetí pozvánky, onboarding wizard. |
| **Role** | MANAGE (invite), PUBLIC (accept) |
| **Status** | ✅ Implementováno |
| **API endpointy** | `POST /admin/invite`, `GET /admin/invitations`, `DELETE /admin/invitations/:id`, `POST /auth/accept-invitation`, `GET /admin/onboarding` |
| **Frontend routes** | `/accept-invitation`, `/onboarding`, `/team` |
| **Prisma modely** | TenantInvitation |
| **Klíčová pole** | email, role, token, expiresAt, propertyId, unitId |
| **Validace** | Token unique, expiry check |
| **Závislosti** | EmailService |
| **Externí integrace** | — |
| **Soubory** | `admin/admin.controller.ts`, `auth/auth.service.ts`, `AcceptInvitationPage.tsx` |
| **Známé problémy** | — |

---

## Property Management (F-100 – F-1XX)

### F-100: Správa nemovitostí (CRUD)

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-100 |
| **Modul** | Properties |
| **Popis** | Vytváření, editace, archivace nemovitostí. 6 typů, 3 formy vlastnictví, ČÚZK import. |
| **Role** | MANAGE (create/delete), WRITE (update), ALL (read) |
| **Status** | ✅ Implementováno |
| **API endpointy** | `POST /properties`, `GET /properties`, `GET /properties/:id`, `PATCH /properties/:id`, `DELETE /properties/:id`, `GET /properties/:id/nav` |
| **Frontend routes** | `/properties`, `/properties/:id` |
| **Prisma modely** | Property |
| **Klíčová pole** | name, address, city, postalCode, type, ownership, ico, dic, legalMode, accountingSystem |
| **Validace** | name required, type enum, ownership enum, PSČ formát |
| **Závislosti** | — |
| **Externí integrace** | ČÚZK Domsys (import) |
| **Soubory** | `properties/properties.controller.ts`, `properties/properties.service.ts`, `PropertiesPage.tsx`, `PropertyForm.tsx` |
| **Známé problémy** | — |

### F-101: Správa jednotek (CRUD + detail)

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-101 |
| **Modul** | Units |
| **Popis** | CRUD jednotek v rámci nemovitosti. Rooms, equipment, quantities, management fees, occupancies, transfer. |
| **Role** | WRITE (create/update), MANAGE (delete), ALL (read) |
| **Status** | ✅ Implementováno |
| **API endpointy** | 25+ endpointů pod `/properties/:propertyId/units/*` |
| **Frontend routes** | `/properties/:id/units/:unitId` |
| **Prisma modely** | Unit, UnitRoom, UnitEquipment, UnitQuantity, UnitManagementFee, Occupancy |
| **Klíčová pole** | name, floor, area, spaceType, commonAreaShare, heatingCoefficient, personCount |
| **Validace** | spaceType enum, area ≥ 0 |
| **Závislosti** | Properties |
| **Externí integrace** | — |
| **Soubory** | `units/units.controller.ts`, `units/unit-detail.controller.ts`, `UnitDetailPage.tsx` |
| **Známé problémy** | — |

### F-102: Správa obyvatel

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-102 |
| **Modul** | Residents |
| **Popis** | CRUD obyvatel, bulk operace (deactivate, activate, assign, mark debtors), legal entity podpora. |
| **Role** | WRITE (create/update), MANAGE (delete/bulk), ALL (read) |
| **Status** | ✅ Implementováno |
| **API endpointy** | `POST /residents`, `GET /residents`, `GET /residents/:id`, `PUT /residents/:id`, `DELETE /residents/:id`, 4x bulk |
| **Frontend routes** | `/residents` |
| **Prisma modely** | Resident, Occupancy |
| **Klíčová pole** | firstName, lastName, email, phone, role, isLegalEntity, companyName, ico |
| **Validace** | firstName 1-100, lastName 1-100, role enum, email format |
| **Závislosti** | Properties, Units |
| **Externí integrace** | — |
| **Soubory** | `residents/residents.controller.ts`, `ResidentsPage.tsx`, `ResidentForm.tsx` |
| **Známé problémy** | — |

### F-103: ČÚZK import nemovitostí

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-103 |
| **Modul** | Properties |
| **Popis** | Import SVJ struktury z ČÚZK Domsys JSON — parse + confirm 2-step. |
| **Role** | MANAGE |
| **Status** | ✅ Implementováno |
| **API endpointy** | `POST /properties/import/cuzk`, `POST /properties/import/cuzk/confirm` |
| **Frontend routes** | `/properties` (import tab v PropertyForm) |
| **Prisma modely** | Property, Unit |
| **Klíčová pole** | cadastralData, cadastralArea, landRegistrySheet, knDesignation |
| **Validace** | JSON parse, required fields |
| **Závislosti** | Properties, Units |
| **Externí integrace** | ČÚZK Domsys |
| **Soubory** | `properties/properties.controller.ts` |
| **Známé problémy** | — |

---

## Finance (F-200 – F-2XX)

### F-200: Správa bankovních účtů

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-200 |
| **Modul** | Finance |
| **Popis** | CRUD bankovních účtů, Fio API sync, statement export. |
| **Role** | FINANCE (create/update/delete), ALL (read) |
| **Status** | ✅ Implementováno |
| **API endpointy** | 6 endpointů `/finance/bank-accounts/*` |
| **Frontend routes** | `/finance?tab=accounts` |
| **Prisma modely** | BankAccount |
| **Klíčová pole** | name, accountNumber, iban, bankCode, isDefault, bankProvider, apiToken, syncEnabled |
| **Validace** | name required |
| **Závislosti** | Properties |
| **Externí integrace** | Fio Bank API (optional) |
| **Soubory** | `finance/finance.controller.ts`, `finance/finance.service.ts` |
| **Známé problémy** | — |

### F-201: Správa faktur (CRUD + approval workflow)

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-201 |
| **Modul** | Finance |
| **Popis** | Kompletní životní cyklus faktur: CRUD, approval workflow (draft→submitted→approved), kopie, tagy, komentáře, ISDOC import/export, AI extrakce z PDF. |
| **Role** | FINANCE_DRAFT (create/edit draft), FINANCE (approve/submit), MANAGE (delete) |
| **Status** | ✅ Implementováno |
| **API endpointy** | 40+ endpointů `/finance/invoices/*` |
| **Frontend routes** | `/finance?tab=doklady`, `/finance/invoices/:id/review` |
| **Prisma modely** | Invoice, InvoiceCostAllocation, InvoiceComment, AiExtractionLog |
| **Klíčová pole** | number, type, supplierName/Ico/Dic, amountBase/vatAmount/amountTotal, approvalStatus |
| **Validace** | number required, type enum, dates valid |
| **Závislosti** | Properties, Anthropic (AI extraction) |
| **Externí integrace** | Anthropic Claude API (PDF extraction) |
| **Soubory** | `finance/finance.controller.ts`, `finance/finance.service.ts`, `finance/ai-batch.service.ts` |
| **Známé problémy** | — |

### F-202: Předpisy plateb

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-202 |
| **Modul** | Finance |
| **Popis** | Definice komponent předpisů, generování měsíčních předpisů, bulk send. Metody: FIXED, PER_AREA, PER_SHARE, PER_PERSON, PER_HEATING_AREA, MANUAL. |
| **Role** | FINANCE (generate/send), FINANCE_DRAFT (create) |
| **Status** | ✅ Implementováno |
| **API endpointy** | `POST /finance/prescriptions`, `GET /finance/prescriptions`, `POST /finance/prescriptions/generate`, `POST /finance/prescriptions/send` |
| **Frontend routes** | `/finance?tab=prescriptions`, `/finance?tab=components` |
| **Prisma modely** | Prescription, PrescriptionItem, PrescriptionComponent, ComponentAssignment |
| **Klíčová pole** | amount, vatRate, variableSymbol, calculationMethod, allocationMethod |
| **Validace** | propertyId required, period dates |
| **Závislosti** | Properties, Units, PrescriptionCalcService |
| **Externí integrace** | — |
| **Soubory** | `finance/finance.controller.ts`, `finance/calc/prescription-calc.service.ts` |
| **Známé problémy** | — |

### F-203: Párování bankovních transakcí

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-203 |
| **Modul** | Finance |
| **Popis** | Auto-match a manual match transakcí s předpisy/fakturami. Split transaction, unmatch. |
| **Role** | FINANCE |
| **Status** | ✅ Implementováno |
| **API endpointy** | `POST /finance/match`, `POST /finance/match-single`, `PATCH /finance/transactions/:id/unmatch`, `POST /finance/transactions/:id/split` |
| **Frontend routes** | `/finance?tab=parovani` |
| **Prisma modely** | BankTransaction |
| **Klíčová pole** | matchTarget, matchedEntityId, matchedEntityType, matchedBy |
| **Validace** | Transaction must be unmatched for auto-match |
| **Závislosti** | KontoService (post to ledger) |
| **Externí integrace** | — |
| **Soubory** | `finance/matching.service.ts` |
| **Známé problémy** | — |

### F-204: Konto vlastníka (double-entry ledger)

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-204 |
| **Modul** | Finance / Konto |
| **Popis** | Double-entry účetní kniha pro každého vlastníka. Debit (předpisy), Credit (platby), balance tracking. |
| **Role** | ALL (read), FINANCE (adjustments) |
| **Status** | ✅ Implementováno |
| **API endpointy** | endpointy v rámci `/finance/*` |
| **Frontend routes** | `/finance?tab=konto` |
| **Prisma modely** | OwnerAccount, LedgerEntry, InitialBalance |
| **Klíčová pole** | currentBalance, type (DEBIT/CREDIT), sourceType, amount, postingDate |
| **Validace** | Balance integrity, posting date |
| **Závislosti** | Prescriptions, BankTransactions |
| **Externí integrace** | — |
| **Soubory** | `konto/konto.service.ts` |
| **Známé problémy** | — |

### F-205: Roční vyúčtování

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-205 |
| **Modul** | Finance / Settlement |
| **Popis** | Kalkulace ročního vyúčtování: heating, hot water, other costs. Distribution keys, přeplatky/nedoplatky. |
| **Role** | FINANCE |
| **Status** | ✅ Implementováno |
| **API endpointy** | settlement endpointy v rámci finance |
| **Frontend routes** | `/finance?tab=settlement`, `/settlements` |
| **Prisma modely** | Settlement, SettlementItem, SettlementCost |
| **Klíčová pole** | totalHeatingCost, heatingBasicPercent, distributionKey, balance |
| **Validace** | billingPeriod required, costType enum |
| **Závislosti** | Properties, Units, Meters, Invoices |
| **Externí integrace** | — |
| **Soubory** | `SettlementPage.tsx` |
| **Známé problémy** | — |

### F-206: Upomínky (3 stupně)

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-206 |
| **Modul** | Reminders |
| **Popis** | 1., 2., 3. stupeň upomínek pro dlužníky. Templates, bulk create, send, preview. |
| **Role** | FINANCE |
| **Status** | ✅ Implementováno |
| **API endpointy** | 10 endpointů `/reminders/*` |
| **Frontend routes** | `/finance?tab=reminders` |
| **Prisma modely** | Reminder, ReminderTemplate, KontoReminder |
| **Klíčová pole** | level (first/second/third), amount, dueDate, status |
| **Validace** | level enum, residentId required |
| **Závislosti** | Residents, KontoService |
| **Externí integrace** | EmailService, GoSMS (SMS) |
| **Soubory** | `reminders/reminders.controller.ts`, `reminders/reminders.service.ts` |
| **Známé problémy** | — |

### F-207: Platební příkazy

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-207 |
| **Modul** | Finance |
| **Popis** | Generování platebních příkazů (PDF/ABO export). |
| **Role** | FINANCE |
| **Status** | ✅ Implementováno |
| **API endpointy** | `/finance/payment-orders/*` |
| **Frontend routes** | `/finance?tab=payment-orders` |
| **Prisma modely** | PaymentOrder, PaymentOrderItem |
| **Klíčová pole** | status (draft/exported/cancelled), exportFormat (pdf/abo) |
| **Validace** | bankAccountId required |
| **Závislosti** | BankAccounts, Invoices |
| **Externí integrace** | — |
| **Soubory** | `finance/payment-orders/payment-orders.service.ts` |
| **Známé problémy** | — |

---

## Operations (F-300 – F-3XX)

### F-300: HelpDesk — správa požadavků

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-300 |
| **Modul** | Helpdesk |
| **Popis** | CRUD ticketů, lifecycle (open→in_progress→resolved→closed), assign, claim, resolve. SLA tracking. |
| **Role** | OPS (create/update), ALL (read) |
| **Status** | ✅ Implementováno |
| **API endpointy** | 17+ endpointů `/helpdesk/*` |
| **Frontend routes** | `/helpdesk`, `/helpdesk/dashboard` |
| **Prisma modely** | HelpdeskTicket, HelpdeskItem, HelpdeskProtocol |
| **Klíčová pole** | number, title, category, priority, status, assigneeId, responseDueAt, resolutionDueAt |
| **Validace** | title required, category enum, priority enum |
| **Závislosti** | Properties, SlaPolicy |
| **Externí integrace** | — |
| **Soubory** | `helpdesk/helpdesk.controller.ts`, `helpdesk/helpdesk.service.ts`, `HelpdeskPage.tsx` |
| **Známé problémy** | — |

### F-301: SLA politiky a eskalace

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-301 |
| **Modul** | Helpdesk |
| **Popis** | Definice SLA časů (response/resolution) per priority. Automatická hourly eskalace (cron). |
| **Role** | OPS (configure), ALL (view) |
| **Status** | ✅ Implementováno |
| **API endpointy** | `GET/POST/DELETE /helpdesk/sla-policies`, `GET /helpdesk/sla-stats` |
| **Frontend routes** | `/helpdesk/sla-config` |
| **Prisma modely** | SlaPolicy |
| **Klíčová pole** | lowResponseH, mediumResponseH, highResponseH, urgentResponseH (+ resolution) |
| **Validace** | Positive hours |
| **Závislosti** | HelpdeskTicket |
| **Externí integrace** | — |
| **Soubory** | `helpdesk/helpdesk-escalation.service.ts`, `helpdesk/sla-policy.service.ts` |
| **Známé problémy** | — |

### F-302: Pracovní příkazy (Work Orders)

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-302 |
| **Modul** | Work Orders |
| **Popis** | CRUD, status transitions (nova→v_reseni→vyresena→uzavrena→zrusena), dispatch to supplier, CSAT. |
| **Role** | OPS |
| **Status** | ✅ Implementováno |
| **API endpointy** | 10 endpointů `/work-orders/*` |
| **Frontend routes** | `/workorders`, `/workorders/:id/execute`, `/my-agenda` |
| **Prisma modely** | WorkOrder, WorkOrderComment |
| **Klíčová pole** | title, workType, priority, status, assigneeUserId, deadline |
| **Validace** | title required, workType enum, priority enum |
| **Závislosti** | Properties, Helpdesk (optional link) |
| **Externí integrace** | — |
| **Soubory** | `work-orders/work-orders.controller.ts`, `WorkOrdersPage.tsx` |
| **Známé problémy** | — |

### F-303: Evidence majetku (Assets)

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-303 |
| **Modul** | Assets |
| **Popis** | CRUD majetku, service records, QR kódy, asset passport, revision history. |
| **Role** | ALL (read), OPS (create/update) |
| **Status** | ✅ Implementováno |
| **API endpointy** | 14 endpointů `/assets/*` |
| **Frontend routes** | `/assets`, `/assets/:id`, `/asset-types` |
| **Prisma modely** | Asset, AssetType, AssetServiceRecord, AssetQrCode |
| **Klíčová pole** | name, category, serialNumber, status, purchaseValue, warrantyUntil |
| **Validace** | name required, category enum |
| **Závislosti** | Properties |
| **Externí integrace** | — |
| **Soubory** | `assets/assets.controller.ts`, `AssetListPage.tsx`, `AssetPassportPage.tsx` |
| **Známé problémy** | — |

### F-304: Revize a compliance

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-304 |
| **Modul** | Revisions |
| **Popis** | Plánování revizí, evidence provedení, eskalace non-compliance (6h cron). |
| **Role** | OPS |
| **Status** | ✅ Implementováno |
| **API endpointy** | Revisions endpoints |
| **Frontend routes** | `/revisions`, `/revisions/dashboard`, `/revisions/settings` |
| **Prisma modely** | RevisionSubject, RevisionType, RevisionPlan, RevisionEvent |
| **Klíčová pole** | nextDueAt, status, resultStatus, intervalDays |
| **Validace** | Revision plan dates |
| **Závislosti** | Assets, Properties |
| **Externí integrace** | — |
| **Soubory** | `revisions/revisions.service.ts`, `revisions/revision-escalation.service.ts` |
| **Známé problémy** | — |

### F-305: Protokoly předání a oprav

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-305 |
| **Modul** | Protocols |
| **Popis** | Protokoly (work report, handover, revision report). Řádky (labor, material, transport). Podpisy. |
| **Role** | OPS (create/complete), ALL (read) |
| **Status** | ✅ Implementováno |
| **API endpointy** | Protocol endpoints in helpdesk |
| **Frontend routes** | `/protocols` |
| **Prisma modely** | Protocol, ProtocolLine |
| **Klíčová pole** | protocolType, status, supplierSignatureName, customerSignatureName |
| **Validace** | sourceType required |
| **Závislosti** | Helpdesk, WorkOrders, Revisions |
| **Externí integrace** | PdfService |
| **Soubory** | `protocols/protocols.service.ts` |
| **Známé problémy** | — |

---

## Communication (F-400 – F-4XX)

### F-400: In-app notifikace

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-400 |
| **Modul** | Notifications |
| **Popis** | Real-time in-app notifikace s auto-generací (expiring contracts, due dates, overdue protocols). |
| **Role** | ALL |
| **Status** | ✅ Implementováno |
| **API endpointy** | `GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all` |
| **Frontend routes** | `/notifications`, NotificationCenter (top bar) |
| **Prisma modely** | Notification |
| **Klíčová pole** | type, title, body, isRead, entityType, entityId |
| **Validace** | — |
| **Závislosti** | All modules (generators) |
| **Externí integrace** | Socket.io (real-time) |
| **Soubory** | `notifications/notifications.controller.ts`, `notifications/notifications.service.ts` |
| **Známé problémy** | — |

### F-401: Email odesílání

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-401 |
| **Modul** | Email |
| **Popis** | SMTP delivery pro všechny emailové funkce (welcome, reset, reminders, notifications, digests). |
| **Role** | System |
| **Status** | ✅ Implementováno |
| **API endpointy** | `POST /admin/email/test` |
| **Frontend routes** | `/settings` (test email) |
| **Prisma modely** | OutboxLog |
| **Klíčová pole** | channel: 'email', recipient, subject, status |
| **Validace** | SMTP config required |
| **Závislosti** | — |
| **Externí integrace** | SMTP server (Nodemailer) |
| **Soubory** | `email/email.service.ts` |
| **Známé problémy** | — |

### F-402: Email příjem (inbound)

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-402 |
| **Modul** | Email Inbound |
| **Popis** | Mailgun webhook pro příjem emailů. Tenant routing by slug. PDF extraction, invoice creation. |
| **Role** | System (webhook) |
| **Status** | ✅ Implementováno |
| **API endpointy** | `POST /api/v1/email-inbound/webhook` |
| **Frontend routes** | `/settings` (email config) |
| **Prisma modely** | EmailInboundConfig, EmailInboundLog |
| **Klíčová pole** | tenantSlug, emailFrom, subject, attachments |
| **Validace** | HMAC signature verification |
| **Závislosti** | Finance (invoice creation), AI (extraction) |
| **Externí integrace** | Mailgun |
| **Soubory** | `email-inbound/email-inbound.service.ts` |
| **Známé problémy** | TODO: ISDOC parser not implemented |

### F-403: SMS notifikace

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-403 |
| **Modul** | Communication |
| **Popis** | SMS odesílání přes GoSMS.cz API. Používáno pro upomínky. |
| **Role** | System |
| **Status** | ✅ Implementováno |
| **API endpointy** | — (internal service) |
| **Prisma modely** | OutboxLog |
| **Klíčová pole** | channel: 'sms' |
| **Závislosti** | — |
| **Externí integrace** | GoSMS.cz |
| **Soubory** | `communication/channels/gosms.provider.ts` |
| **Známé problémy** | — |

### F-404: Datové schránky (ISDS)

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-404 |
| **Modul** | Communication |
| **Popis** | Odesílání zpráv přes ISDS (datové schránky). |
| **Role** | System |
| **Status** | ⚠️ Stub (neimplementováno) |
| **API endpointy** | — |
| **Prisma modely** | OutboxLog |
| **Známé problémy** | TODO: Real ISDS SOAP API implementation |

### F-405: Poštovní zásilky (DopisOnline)

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-405 |
| **Modul** | Communication |
| **Popis** | Odesílání dopisů přes Českou poštu / DopisOnline. |
| **Role** | System |
| **Status** | ⚠️ Stub (neimplementováno) |
| **API endpointy** | — |
| **Prisma modely** | OutboxLog |
| **Známé problémy** | TODO: Real DopisOnline/PostServis API implementation |

---

## Documents (F-500 – F-5XX)

### F-500: Správa dokumentů (DMS)

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-500 |
| **Modul** | Documents |
| **Popis** | Upload, download, delete, entity linking. Kategorie (contract, invoice, protocol, photo, plan, regulation). |
| **Role** | WRITE (upload), ALL (read), MANAGE (delete) |
| **Status** | ✅ Implementováno |
| **API endpointy** | `POST /documents/upload`, `GET /documents`, `GET /documents/:id/download`, `DELETE /documents/:id`, `POST /documents/:id/links` |
| **Frontend routes** | `/documents` |
| **Prisma modely** | Document, DocumentTag, DocumentLink |
| **Klíčová pole** | name, mimeType, size, storageKey, category, scanStatus |
| **Validace** | Max 25MB (Caddy limit) |
| **Závislosti** | — |
| **Externí integrace** | — (ClamAV planned) |
| **Soubory** | `documents/documents.controller.ts`, `DocumentsPage.tsx` |
| **Známé problémy** | ClamAV scanning je stub |

---

## Metering (F-600 – F-6XX)

### F-600: Správa měřidel a odečtů

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-600 |
| **Modul** | Meters |
| **Popis** | CRUD měřidel, readings, consumption calculation, initial readings, bulk. |
| **Role** | OPS (create/update/delete), ALL (read) |
| **Status** | ✅ Implementováno |
| **API endpointy** | 12 endpointů `/meters/*` |
| **Frontend routes** | `/meters` |
| **Prisma modely** | Meter, MeterReading |
| **Klíčová pole** | name, serialNumber, meterType, lastReading, calibrationDue |
| **Validace** | name required, meterType enum |
| **Závislosti** | Properties, Units |
| **Externí integrace** | — |
| **Soubory** | `meters/meters.controller.ts`, `MetersPage.tsx` |
| **Známé problémy** | — |

---

## Governance (F-700 – F-7XX)

### F-700: Shromáždění SVJ

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-700 |
| **Modul** | Assemblies |
| **Popis** | CRUD shromáždění, agenda items, attendance, quorum check, voting, PDF minutes/attendance/voting reports. |
| **Role** | MANAGE |
| **Status** | ✅ Implementováno |
| **API endpointy** | 22+ endpointů `/assemblies/*` |
| **Frontend routes** | `/properties/:id/assemblies`, `/properties/:id/assemblies/:id`, `.../live` |
| **Prisma modely** | Assembly, AssemblyAgendaItem, AssemblyAttendee, AssemblyVote |
| **Klíčová pole** | status (DRAFT→PUBLISHED→IN_PROGRESS→COMPLETED), totalShares, presentShares, isQuorate |
| **Validace** | title required, majorityType enum |
| **Závislosti** | Properties, Residents/Principals |
| **Externí integrace** | HardwareVotingSession (keypads) |
| **Soubory** | `assemblies/assemblies.controller.ts`, `AssemblyDetailPage.tsx`, `LiveDashboardPage.tsx` |
| **Známé problémy** | — |

### F-701: Per rollam hlasování

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-701 |
| **Modul** | Assemblies |
| **Popis** | Korespondenční hlasování: vytvoření, rozeslání balotů, online/paper submission, vyhodnocení. |
| **Role** | MANAGE (create/manage), PUBLIC (vote via accessToken) |
| **Status** | ✅ Implementováno |
| **API endpointy** | Per rollam endpoints, `GET /hlasovani/:accessToken` (public) |
| **Frontend routes** | `/properties/:id/per-rollam`, `/hlasovani/:accessToken` |
| **Prisma modely** | PerRollamVoting, PerRollamItem, PerRollamBallot, PerRollamResponse |
| **Klíčová pole** | status, deadline, accessToken, submissionMethod (ONLINE/PAPER_UPLOAD/MANUAL) |
| **Validace** | Deadline in future, access token valid |
| **Závislosti** | Properties, Principals |
| **Externí integrace** | EmailService (ballot distribution) |
| **Soubory** | `PublicBallotPage.tsx`, `PerRollamDetailPage.tsx` |
| **Známé problémy** | — |

---

## Integrations (F-800 – F-8XX)

### F-800: ARES lookup

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-800 |
| **Modul** | Integrations |
| **Popis** | Lookup firmy podle IČO z ARES registru — auto-fill name, address, DIC. |
| **Role** | ALL |
| **Status** | ✅ Implementováno |
| **Frontend routes** | PropertyForm (IČO field) |
| **Externí integrace** | ARES REST API |
| **Známé problémy** | — |

### F-801: Fio Bank sync

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-801 |
| **Modul** | Banking |
| **Popis** | Automatický import transakcí z Fio Bank API (15min cron, 31s rate limit). |
| **Role** | System (cron) |
| **Status** | ✅ Implementováno |
| **Prisma modely** | BankTransaction, BankAccount |
| **Externí integrace** | Fio Bank API |
| **Soubory** | `banking/banking.service.ts`, `cron/cron.service.ts` |
| **Známé problémy** | — |

### F-802: PVK sync

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-802 |
| **Modul** | PVK |
| **Popis** | Monthly sync faktur z PVK (třetí strana) přes REST API. |
| **Role** | System (cron) |
| **Status** | ✅ Implementováno |
| **Prisma modely** | PvkCredential, PvkSyncLog |
| **Externí integrace** | PVK REST API |
| **Známé problémy** | — |

### F-803: Microsoft 365 integrace

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-803 |
| **Modul** | M365 |
| **Popis** | Integrace s Teams (webhooks), Planner (task sync), Calendar (event sync), SharePoint (documents). |
| **Role** | MANAGE (configure) |
| **Status** | ✅ Implementováno |
| **Externí integrace** | Microsoft Graph API |
| **Soubory** | `microsoft365/graph-auth.service.ts`, `microsoft365/teams.service.ts`, `microsoft365/planner.service.ts` |
| **Známé problémy** | — |

---

## AI / Analytics (F-900 – F-9XX)

### F-900: AI extrakce faktur (PDF → data)

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-900 |
| **Modul** | Finance / AI |
| **Popis** | Claude API pro extrakci dat z PDF faktur. Single + batch processing. Training data export. |
| **Role** | FINANCE |
| **Status** | ✅ Implementováno |
| **API endpointy** | `POST /finance/invoices/extract-pdf`, `POST /finance/invoices/batch-extract`, `GET /finance/training-data/*` |
| **Prisma modely** | AiExtractionLog, AiExtractionBatch, InvoiceTrainingSample |
| **Externí integrace** | Anthropic Claude API |
| **Soubory** | `finance/ai-batch.service.ts` |
| **Známé problémy** | — |

### F-901: Mio AI asistent

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-901 |
| **Modul** | Mio |
| **Popis** | AI konverzační rozhraní pro property management dotazy. Findings, recommendations, digests. |
| **Role** | ALL (chat), MANAGE (admin config, webhooks) |
| **Status** | ✅ Implementováno |
| **API endpointy** | Mio endpoints |
| **Frontend routes** | `/mio`, `/mio/:conversationId`, `/mio/insights`, `/mio/admin`, `/mio/webhooks` |
| **Prisma modely** | MioConversation, MioMessage, MioFinding, MioDigestLog, MioWebhookSubscription |
| **Externí integrace** | Anthropic Claude API |
| **Soubory** | `mio/mio-findings.service.ts`, `mio/mio-digest.service.ts`, `MioChatPage.tsx`, `MioInsightsPage.tsx` |
| **Známé problémy** | — |

---

## System / Admin (F-1000+)

### F-1000: Správa uživatelů a rolí

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-1000 |
| **Modul** | Admin |
| **Popis** | CRUD uživatelů, role assignment, property assignments, force password change, deactivate. |
| **Role** | MANAGE |
| **Status** | ✅ Implementováno |
| **API endpointy** | 10+ endpointů `/admin/users/*`, `/admin/property-assignments` |
| **Frontend routes** | `/team` |
| **Prisma modely** | User, UserPropertyAssignment |
| **Soubory** | `admin/admin.controller.ts`, `admin/admin.service.ts`, `TeamPage.tsx` |
| **Známé problémy** | — |

### F-1001: Audit log

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-1001 |
| **Modul** | Audit |
| **Popis** | Immutable audit trail pro všechny mutace. Entity whitelist, sensitive data exclusion, GDPR retention. |
| **Role** | MANAGE (read) |
| **Status** | ✅ Implementováno |
| **API endpointy** | `GET /audit`, `GET /audit/entities` |
| **Frontend routes** | `/audit` |
| **Prisma modely** | AuditLog |
| **Klíčová pole** | action, entity, entityId, oldData, newData, userId, ipAddress |
| **Závislosti** | AuditInterceptor (global) |
| **Soubory** | `audit/audit.controller.ts`, `common/interceptors/audit.interceptor.ts` |
| **Známé problémy** | — |

### F-1002: GDPR compliance

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-1002 |
| **Modul** | Admin / GDPR |
| **Popis** | Right to erasure (Article 17), data portability (Article 20), erasure audit log. |
| **Role** | MANAGE |
| **Status** | ✅ Implementováno |
| **API endpointy** | `POST /admin/gdpr/erase`, `GET /admin/gdpr/export/:type/:subjectId`, `GET /admin/gdpr/erasure-log` |
| **Prisma modely** | Party, User, Resident (gdprErased, gdprErasedAt fields) |
| **Soubory** | `admin/gdpr/gdpr.controller.ts`, `admin/gdpr/gdpr.service.ts` |
| **Známé problémy** | — |

### F-1003: Klientský portál

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-1003 |
| **Modul** | Portal |
| **Popis** | Self-service portál pro vlastníky a nájemníky: jednotky, předpisy, požadavky, měřidla, dokumenty, konto. |
| **Role** | unit_owner, unit_tenant |
| **Status** | ✅ Implementováno |
| **API endpointy** | 16 endpointů `/portal/*` |
| **Frontend routes** | `/portal`, `/portal/units`, `/portal/prescriptions`, `/portal/tickets`, etc. |
| **Prisma modely** | PortalAccess, PortalMessage |
| **Soubory** | `portal/portal.controller.ts`, `PortalPage.tsx` |
| **Známé problémy** | — |

### F-1004: Nájemní smlouvy

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-1004 |
| **Modul** | Contracts |
| **Popis** | CRUD nájemních smluv, terminate, stats. |
| **Role** | WRITE |
| **Status** | ✅ Implementováno |
| **API endpointy** | 7 endpointů `/contracts/*` |
| **Frontend routes** | `/contracts` |
| **Prisma modely** | LeaseAgreement |
| **Klíčová pole** | contractType, monthlyRent, deposit, startDate, endDate, status |
| **Soubory** | `contracts/contracts.controller.ts`, `ContractsPage.tsx` |
| **Známé problémy** | — |

### F-1005: Kanban / Pipeline

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-1005 |
| **Modul** | Kanban |
| **Popis** | Kanban board pro vizuální správu úkolů. |
| **Role** | ALL |
| **Status** | ✅ Implementováno |
| **Frontend routes** | `/kanban` |
| **Prisma modely** | KanbanTask |
| **Známé problémy** | — |

### F-1006: Kalendář

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-1006 |
| **Modul** | Calendar |
| **Popis** | Event calendar s multiple views (list, month, week). Sync from work orders, contracts, meter calibrations. |
| **Role** | ALL |
| **Status** | ✅ Implementováno |
| **Frontend routes** | `/calendar` |
| **Prisma modely** | CalendarEvent |
| **Známé problémy** | — |

### F-1007: Global search

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-1007 |
| **Modul** | Search |
| **Popis** | Full-text search across all entities (properties, units, residents, invoices, tickets). |
| **Role** | ALL |
| **Status** | ✅ Implementováno |
| **API endpointy** | `GET /search?q=...` |
| **Frontend routes** | GlobalSearch (top bar) |
| **Známé problémy** | — |

### F-1008: Dashboard (role-aware)

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-1008 |
| **Modul** | Dashboard |
| **Popis** | KPI dashboard s role-specifickým obsahem (FM: full KPIs, Tech: agenda, Resident: portal). |
| **Role** | ALL |
| **Status** | ✅ Implementováno |
| **API endpointy** | `GET /dashboard`, `GET /dashboard/operational`, `GET /dashboard/badges` |
| **Frontend routes** | `/dashboard` |
| **Známé problémy** | — |

### F-1009: SIPO integrace

| Atribut | Hodnota |
|---------|---------|
| **ID** | F-1009 |
| **Modul** | Finance / SIPO |
| **Popis** | Centralizovaný inkasní systém (Česká pošta) — konfigurace, export, platby. |
| **Role** | FINANCE |
| **Status** | ✅ Implementováno |
| **Frontend routes** | `/finance?tab=sipo` |
| **Prisma modely** | SipoConfig, SipoExport, SipoPayment |
| **Známé problémy** | — |

---

## Feature Matrix — přehledová tabulka

| ID | Funkce | Modul | Status | Role | Endpointy | Modely |
|----|--------|-------|--------|------|-----------|--------|
| F-001 | Registrace | Auth | ✅ | PUBLIC | 1 | 3 |
| F-002 | Login | Auth | ✅ | PUBLIC | 1 | 3 |
| F-003 | 2FA TOTP | Auth | ✅ | AUTH | 4 | 1 |
| F-004 | OAuth SSO | Auth | ✅ | PUBLIC | 2 | 1 |
| F-005 | Sessions | Auth | ✅ | AUTH | 4 | 2 |
| F-006 | API Keys | Auth | ✅ | MANAGE | 5 | 1 |
| F-007 | Password Reset | Auth | ✅ | PUBLIC | 2 | 1 |
| F-008 | Pozvánky | Admin | ✅ | MANAGE | 5 | 1 |
| F-100 | Nemovitosti | Properties | ✅ | MANAGE/WRITE | 8 | 1 |
| F-101 | Jednotky | Units | ✅ | WRITE | 25+ | 6 |
| F-102 | Obyvatelé | Residents | ✅ | WRITE | 11 | 2 |
| F-103 | ČÚZK import | Properties | ✅ | MANAGE | 2 | 2 |
| F-200 | Bank. účty | Finance | ✅ | FINANCE | 6 | 1 |
| F-201 | Faktury | Finance | ✅ | FINANCE | 40+ | 4 |
| F-202 | Předpisy | Finance | ✅ | FINANCE | 6 | 4 |
| F-203 | Párování | Finance | ✅ | FINANCE | 4 | 1 |
| F-204 | Konto | Finance | ✅ | ALL | — | 3 |
| F-205 | Vyúčtování | Finance | ✅ | FINANCE | — | 3 |
| F-206 | Upomínky | Reminders | ✅ | FINANCE | 10 | 3 |
| F-207 | Plat. příkazy | Finance | ✅ | FINANCE | — | 2 |
| F-300 | HelpDesk | Helpdesk | ✅ | OPS | 17+ | 3 |
| F-301 | SLA | Helpdesk | ✅ | OPS | 4 | 1 |
| F-302 | Work Orders | WorkOrders | ✅ | OPS | 10 | 2 |
| F-303 | Assets | Assets | ✅ | OPS | 14 | 4 |
| F-304 | Revize | Revisions | ✅ | OPS | — | 4 |
| F-305 | Protokoly | Protocols | ✅ | OPS | — | 2 |
| F-400 | Notifikace | Notifications | ✅ | ALL | 5 | 1 |
| F-401 | Email out | Email | ✅ | System | 1 | 1 |
| F-402 | Email in | EmailInbound | ✅ | System | 1 | 2 |
| F-403 | SMS | Communication | ✅ | System | — | 1 |
| F-404 | ISDS | Communication | ⚠️ Stub | System | — | 1 |
| F-405 | DopisOnline | Communication | ⚠️ Stub | System | — | 1 |
| F-500 | Dokumenty | Documents | ✅ | WRITE | 5 | 3 |
| F-600 | Měřidla | Meters | ✅ | OPS | 12 | 2 |
| F-700 | Shromáždění | Assemblies | ✅ | MANAGE | 22+ | 4 |
| F-701 | Per rollam | Assemblies | ✅ | MANAGE | — | 4 |
| F-800 | ARES | Integrations | ✅ | ALL | — | — |
| F-801 | Fio sync | Banking | ✅ | System | — | 2 |
| F-802 | PVK sync | PVK | ✅ | System | — | 2 |
| F-803 | M365 | Integrations | ✅ | MANAGE | — | — |
| F-900 | AI extrakce | Finance/AI | ✅ | FINANCE | 3 | 3 |
| F-901 | Mio AI | Mio | ✅ | ALL | — | 5+ |
| F-1000 | Uživatelé | Admin | ✅ | MANAGE | 10+ | 2 |
| F-1001 | Audit log | Audit | ✅ | MANAGE | 2 | 1 |
| F-1002 | GDPR | Admin | ✅ | MANAGE | 3 | 3 |
| F-1003 | Portál | Portal | ✅ | unit_* | 16 | 2 |
| F-1004 | Smlouvy | Contracts | ✅ | WRITE | 7 | 1 |
| F-1005 | Kanban | Kanban | ✅ | ALL | — | 1 |
| F-1006 | Kalendář | Calendar | ✅ | ALL | — | 1 |
| F-1007 | Search | Search | ✅ | ALL | 1 | — |
| F-1008 | Dashboard | Dashboard | ✅ | ALL | 3 | — |
| F-1009 | SIPO | Finance | ✅ | FINANCE | — | 3 |

---

## Statistiky

| Metrika | Hodnota |
|---------|---------|
| **Celkový počet funkcí** | 49 |
| **✅ Implementováno** | 47 |
| **⚠️ Stub / Částečně** | 2 (F-404 ISDS, F-405 DopisOnline) |
| **❌ Plánováno** | 0 |
| **Funkce bez frontend UI** | F-401 (email out), F-402 (email in), F-403 (SMS), F-801 (Fio cron), F-802 (PVK cron) |
| **Funkce bez testů** | F-700 (Assemblies), F-701 (Per rollam), F-803 (M365), F-901 (Mio AI) — viz TEST_PLAN.md |

---

*Vygenerováno na základě AUDIT_REPORT.md. Cross-referencováno s TEST_PLAN.md pro pokrytí testy.*
