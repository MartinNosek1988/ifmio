# IFMIO – Test Plan

> Vygenerováno: 2026-03-31
> Na základě: AUDIT_REPORT.md v1.0

---

## 1. Přehled testovacích oblastí

| # | Modul | Popis | Priorita |
|---|---|---|---|
| 1 | **Auth** | Login, register, 2FA, OAuth, refresh, sessions, risk scoring | CRITICAL |
| 2 | **Finance** | Faktury, bankovní účty, transakce, předpisy, párování, konto | CRITICAL |
| 3 | **Properties** | CRUD nemovitostí, ČÚZK import | HIGH |
| 4 | **Units** | CRUD jednotek, místnosti, vybavení, poplatky, veličiny | HIGH |
| 5 | **Residents** | CRUD obyvatel, obsazení, bulk operace | HIGH |
| 6 | **Helpdesk** | Tickety, SLA, eskalace, protokoly | HIGH |
| 7 | **Work Orders** | Pracovní příkazy, dispatch, completion | HIGH |
| 8 | **Assets** | Evidence majetku, service records, QR kódy | MEDIUM |
| 9 | **Assemblies** | Shromáždění SVJ, hlasování, per rollam | MEDIUM |
| 10 | **Admin** | Správa uživatelů, pozvánky, nastavení, GDPR | HIGH |
| 11 | **Meters** | Měřidla, odečty, kalibrace | MEDIUM |
| 12 | **Contracts** | Nájemní smlouvy | MEDIUM |
| 13 | **Reminders** | Upomínky, šablony, dlužníci | MEDIUM |
| 14 | **Documents** | DMS, upload, download, vazby | LOW |
| 15 | **Audit** | Audit log čtení | LOW |
| 16 | **Portal** | Klientský portál | MEDIUM |
| 17 | **Notifications** | In-app notifikace | LOW |
| 18 | **Revisions** | Revizní plány, události | MEDIUM |
| 19 | **Protocols** | Protokoly předání/oprav | MEDIUM |
| 20 | **Security** | XSS, IDOR, JWT, rate limiting, tenant izolace | CRITICAL |
| 21 | **Financial Calc** | Předpisy, vyúčtování, zaokrouhlování | CRITICAL |
| 22 | **Imports/Exports** | ISDOC, ABO, CSV, PDF | HIGH |

---

## 2. Matice pokrytí

| Modul | Modely | API Endpointy | Frontend Routes | Unit/Integration (API) | Component (Web) | E2E (Playwright) |
|---|---|---|---|---|---|---|
| Auth | User, RefreshToken, RevokedToken, ApiKey, LoginRiskLog | /auth/* (22) | /login, /register, /forgot-password, /reset-password | `auth-extended.spec.ts` | existující | `auth-flows.spec.ts` |
| Finance | Invoice, BankAccount, BankTransaction, Prescription, OwnerAccount, LedgerEntry, Settlement | /finance/* (70+) | /finance (14 tabů) | `finance-extended.spec.ts` | — | `finance-flows.spec.ts` |
| Properties | Property | /properties/* (8) | /properties, /properties/:id | `properties-extended.spec.ts` | — | `property-crud.spec.ts` |
| Units | Unit, UnitRoom, UnitEquipment, UnitQuantity, UnitManagementFee | /properties/:id/units/* (25+) | /properties/:id/units/:unitId | `units-extended.spec.ts` | — | `unit-crud.spec.ts` |
| Residents | Resident, Occupancy | /residents/* (11) | /residents | `residents-extended.spec.ts` | — | `resident-crud.spec.ts` |
| Helpdesk | HelpdeskTicket, HelpdeskItem, SlaPolicy | /helpdesk/* (17+) | /helpdesk, /helpdesk/dashboard | `helpdesk-extended.spec.ts` | — | `helpdesk-flows.spec.ts` |
| Work Orders | WorkOrder, WorkOrderComment | /work-orders/* (10) | /workorders | `work-orders-extended.spec.ts` | — | `workorder-flows.spec.ts` |
| Assets | Asset, AssetServiceRecord, AssetQrCode | /assets/* (14) | /assets, /assets/:id | `assets-extended.spec.ts` | — | existující |
| Assemblies | Assembly, AssemblyAgendaItem, AssemblyAttendee, AssemblyVote | /assemblies/* (22+) | /properties/:id/assemblies | `assemblies.spec.ts` | — | `assembly-flows.spec.ts` |
| Admin | User, TenantSettings, TenantInvitation | /admin/* (20+) | /team, /settings | `admin-extended.spec.ts` | — | `admin-flows.spec.ts` |
| Meters | Meter, MeterReading | /meters/* (12) | /meters | `meters-extended.spec.ts` | — | existující |
| Contracts | LeaseAgreement | /contracts/* (7) | /contracts | `contracts.spec.ts` | — | `contract-crud.spec.ts` |
| Reminders | Reminder, ReminderTemplate | /reminders/* (10) | /finance?tab=reminders | `reminders.spec.ts` | — | — |
| Documents | Document, DocumentLink | /documents/* (5) | /documents | `documents.spec.ts` | — | existující |
| Portal | PortalAccess | /portal/* (16) | /portal/* | `portal.spec.ts` | — | `portal-flows.spec.ts` |
| Revisions | RevisionPlan, RevisionEvent, RevisionSubject, RevisionType | (in assets/revisions) | /revisions | `revisions-extended.spec.ts` | — | existující |
| Protocols | Protocol, ProtocolLine | (in helpdesk/protocols) | /protocols | `protocols-extended.spec.ts` | — | existující |
| Security | — | across all | — | `security-xss.spec.ts`, `security-idor.spec.ts` | — | `security-e2e.spec.ts` |
| Financial Calc | — | /finance/* | — | `financial-calc.spec.ts` | — | — |
| Notifications | Notification | /notifications/* (5) | /notifications | `notifications.spec.ts` | — | — |
| Audit | AuditLog | /audit/* (2) | /audit | `audit-extended.spec.ts` | — | — |

---

## 3. Prioritizace

### CRITICAL (musí projít před každým release)
- Auth: login, register, 2FA, refresh, token blacklist, role enforcement
- Finance: fakturace, předpisy, párování plateb, konto operace
- Security: tenant izolace, IDOR, XSS, JWT validace
- Financial Calc: výpočty předpisů, vyúčtování, zaokrouhlování

### HIGH (musí projít v CI)
- Properties + Units: CRUD, relace, validace
- Residents: CRUD, obsazení, bulk operace
- Helpdesk: tickety, SLA, eskalace
- Work Orders: lifecycle, dispatch
- Admin: správa uživatelů, pozvánky
- Imports/Exports: ISDOC, CSV, ABO

### MEDIUM (spouštět v nightly/weekly)
- Assets, Assemblies, Meters, Contracts, Reminders
- Portal, Revisions, Protocols

### LOW (spouštět on-demand)
- Documents, Audit, Notifications

---

## 4. Testovací soubory (budou vytvořeny)

### API testy (`apps/api/src/`)
- `test/auth-extended.spec.ts`
- `test/finance-extended.spec.ts`
- `test/properties-extended.spec.ts`
- `test/units-extended.spec.ts`
- `test/residents-extended.spec.ts`
- `test/helpdesk-extended.spec.ts`
- `test/work-orders-extended.spec.ts`
- `test/assets-extended.spec.ts`
- `test/assemblies.spec.ts`
- `test/admin-extended.spec.ts`
- `test/meters-extended.spec.ts`
- `test/contracts.spec.ts`
- `test/reminders.spec.ts`
- `test/documents.spec.ts`
- `test/portal.spec.ts`
- `test/revisions-extended.spec.ts`
- `test/protocols-extended.spec.ts`
- `test/notifications.spec.ts`
- `test/audit-extended.spec.ts`
- `test/security-xss.spec.ts`
- `test/security-idor.spec.ts`
- `test/financial-calc.spec.ts`

### E2E testy (`apps/e2e/tests/deep/`)
- `auth-flows.spec.ts`
- `finance-flows.spec.ts`
- `property-crud.spec.ts`
- `unit-crud.spec.ts`
- `resident-crud.spec.ts`
- `helpdesk-flows.spec.ts`
- `workorder-flows.spec.ts`
- `assembly-flows.spec.ts`
- `admin-flows.spec.ts`
- `contract-crud.spec.ts`
- `portal-flows.spec.ts`
- `security-e2e.spec.ts`

---

## 5. Souhrnná statistika (Fáze T6)

### Vytvořené soubory

**API testy (16 nových souborů, ~234 test cases):**

| Soubor | Test cases | Priorita |
|---|---|---|
| `test/auth-extended.spec.ts` | 25 | CRITICAL |
| `test/finance-extended.spec.ts` | 27 | CRITICAL |
| `test/financial-calc.spec.ts` | 8 | CRITICAL |
| `test/security-idor.spec.ts` | 15 | CRITICAL |
| `test/security-xss.spec.ts` | 10 | CRITICAL |
| `test/admin-extended.spec.ts` | 20 | HIGH |
| `test/properties-extended.spec.ts` | 12 | HIGH |
| `test/units-extended.spec.ts` | 21 | HIGH |
| `test/residents-extended.spec.ts` | 17 | HIGH |
| `test/helpdesk-extended.spec.ts` | 18 | HIGH |
| `test/work-orders-extended.spec.ts` | 15 | HIGH |
| `test/assets-extended.spec.ts` | 16 | MEDIUM |
| `test/meters-extended.spec.ts` | 13 | MEDIUM |
| `test/contracts.spec.ts` | 7 | MEDIUM |
| `test/audit-extended.spec.ts` | 7 | LOW |
| `test/notifications.spec.ts` | 3 | LOW |

**E2E testy (5 nových souborů, ~30 test cases):**

| Soubor | Test cases | Priorita |
|---|---|---|
| `tests/deep/auth-flows.spec.ts` | 8 | CRITICAL |
| `tests/deep/security-e2e.spec.ts` | 9 | CRITICAL |
| `tests/deep/finance-flows.spec.ts` | 5 | HIGH |
| `tests/deep/property-crud.spec.ts` | 4 | HIGH |
| `tests/deep/helpdesk-flows.spec.ts` | 4 | HIGH |

### Celkový souhrn

| Typ | Existující | Nové | Celkem |
|---|---|---|---|
| API testy (Jest) | ~43 test cases | ~234 test cases | ~277 |
| Web testy (Vitest) | ~21 test cases | 0 | ~21 |
| E2E testy (Playwright) | ~46 suites | ~30 test cases | ~76+ |
| **Celkem** | **~110** | **~264** | **~374** |

### Pokrytí podle priorit

| Priorita | Moduly pokryté | Test cases |
|---|---|---|
| CRITICAL | Auth, Finance, Security (XSS, IDOR), Financial Calc | ~85 |
| HIGH | Properties, Units, Residents, Helpdesk, Work Orders, Admin, E2E flows | ~107 |
| MEDIUM | Assets, Meters, Contracts | ~36 |
| LOW | Audit, Notifications | ~10 |

---

## 6. Známé mezery

| Oblast | Důvod | Doporučení |
|---|---|---|
| Assemblies (hlasování) | Komplexní flow — vyžaduje multi-step setup | Přidat dedicated E2E test |
| Portal endpoints | Vyžaduje unit_owner user s přiřazenými jednotkami | Přidat s E2E seed |
| Reminders | Závisí na existujících dlužnících | Přidat s fixture daty |
| Documents upload | Vyžaduje multipart file upload | Přidat s binary test data |
| ISDOC import | Vyžaduje validní ISDOC XML fixture | Přidat s sample files |
| Fio API sync | Externí integrace — vyžaduje mock | Mock server potřebný |
| WhatsApp/SMS | Externí integrace — stub | Netestováno |
| MIO AI | Vyžaduje Anthropic API key | Mock/stub potřebný |

---

## 7. Doporučení pro CI/CD

| Kontext | Testy ke spuštění |
|---|---|
| **Pre-commit** | TypeCheck (tsc --noEmit) |
| **PR pipeline** | auth-extended, finance-extended, security-idor, security-xss, financial-calc + existující critical |
| **Post-merge (main)** | Všechny API testy + E2E smoke |
| **Nightly** | Kompletní API test suite + E2E deep suite |
| **Weekly** | Kompletní E2E + production smoke |

---

*Vygenerováno: 2026-03-31. Celkem vytvořeno 21 nových testovacích souborů s ~264 test cases.*
