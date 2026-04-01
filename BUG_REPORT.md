# IFMIO – Bug Report z automatizovaných testů

> Datum: 2026-03-31 (aktualizováno 2026-04-01 po bugfixech)
> Spuštěno: 234 API testů + 0 E2E testů (E2E vyžadují běžící server)
> Prostředí: Node v24.14.0, npm 11.9.0, Jest 30.2.0, PostgreSQL (Supabase)
>
> **Po bugfixech: 232/234 PASS (99.1%)**

## Executive Summary

| Metrika | Hodnota |
|---------|---------|
| Celkem testů | 234 |
| ✅ PASS | 195 (83.3%) |
| ❌ FAIL | 39 (16.7%) |
| --- | --- |
| 🐛 REAL BUG | 7 |
| 🧪 TEST ISSUE (status code mismatch) | 21 |
| 🧪 TEST ISSUE (missing pipe in test env) | 8 |
| 🧪 TEST ISSUE (DTO field mismatch) | 3 |

## Zdraví systému podle modulů

| Modul | Testů | Pass | Fail | Pass % | Nejzávažnější nález |
|-------|-------|------|------|--------|---------------------|
| Auth | 25 | 21 | 4 | 84% | 🧪 Status code mismatches (204 vs 200, 401 vs 400) |
| Security IDOR | 15 | 15 | 0 | **100%** | ✅ Tenant isolation OK |
| Security XSS | 10 | 2 | 8 | 20% | 🧪 SanitizePipe missing in test env |
| Financial Calc | 8 | 7 | 1 | 88% | 🧪 Allocation DTO field mismatch |
| Finance | 31 | 24 | 7 | 77% | 🧪 Status codes + DTO fields |
| Properties | 19 | 18 | 1 | 95% | 🧪 DELETE vrací 204 ne 200 |
| Units | 26 | 21 | 5 | 81% | 🧪 DELETE 204, equipment DTO |
| Residents | 20 | 19 | 1 | 95% | 🧪 DELETE 204 |
| Helpdesk | 27 | 25 | 2 | 93% | 🧪 POST actions vrací 201 ne 200 |
| Work Orders | 18 | 15 | 3 | 83% | 🐛 Validace vrací 500 místo 400 |
| Assets | 24 | 21 | 3 | 88% | 🐛 Validace vrací 500 místo 400 |
| Meters | 17 | 15 | 2 | 88% | 🐛 Validace vrací 500 místo 400 |
| Contracts | 10 | 10 | 0 | **100%** | ✅ All pass |
| Admin | 20 | 19 | 1 | 95% | 🧪 DELETE 204 |
| Audit | 7 | 7 | 0 | **100%** | ✅ All pass |
| Notifications | 3 | 3 | 0 | **100%** | ✅ All pass |

---

## ✅ FIXED — Opravené bugy (commit a6d87a2)

### BUG-001: Work Order validace — title ✅ FIXED
- **Problém:** POST /work-orders bez title → 500 místo 400
- **Fix:** Nový `CreateWorkOrderDto` s `@IsNotEmpty()` na title

### BUG-002: Work Order validace — workType ✅ FIXED
- **Problém:** Neplatný workType → 500
- **Fix:** `@IsEnum(['corrective','preventive','inspection','emergency'])` v CreateWorkOrderDto

### BUG-003: Work Order validace — priority ✅ FIXED
- **Problém:** Neplatná priority → 500
- **Fix:** `@IsEnum(['nizka','normalni','vysoka','kriticka'])` v CreateWorkOrderDto

### BUG-004: Asset validace — name + category ✅ FIXED
- **Problém:** POST /assets bez name nebo s neplatnou category → 500
- **Fix:** Nový `CreateAssetDto` s `@IsNotEmpty()` + `@IsEnum(AssetCategory)`

### BUG-006: Meter validace — name + meterType ✅ FIXED
- **Problém:** POST /meters bez name nebo s neplatným meterType → 500
- **Fix:** Nový `CreateMeterDto` s `@IsNotEmpty()` + `@IsEnum(MeterType)`

### BUG-007: Bank Account validace — name ✅ FIXED
- **Problém:** POST /finance/bank-accounts bez name → 500
- **Fix:** Nový `CreateBankAccountDto` s `@IsNotEmpty()` na name

---

## 🐛 OPEN BUGS — Zbývající

### Priorita: MEDIUM (backlog)

#### BUG-005: Asset CSV export vrací 500

| Atribut | Hodnota |
|---------|---------|
| **Test** | `assets-extended.spec.ts` → "GET /assets/export → CSV export" |
| **Severity** | MEDIUM |
| **Status** | OPEN / BACKLOG |
| **Popis** | GET /assets/export vrací 500 Internal Server Error |
| **Root Cause** | Pravděpodobně chybí implementace nebo závislost v export service |
| **Fix** | Prověřit `assets.service.ts` export metodu |

#### BUG-008: Financial-calc allocation test — component route

| Atribut | Hodnota |
|---------|---------|
| **Test** | `financial-calc.spec.ts` → "dvě alokace pokryjí celkovou částku" |
| **Severity** | LOW |
| **Status** | OPEN / BACKLOG |
| **Popis** | Allocation test selže kvůli neznámé route pro vytvoření PrescriptionComponent v test kontextu |
| **Root Cause** | Route `/finance/components` nemusí existovat nebo vyžaduje propertyId v jiném formátu |
| **Fix** | Prověřit component CRUD route a opravit test setup |

---

## 🧪 TEST ISSUES — Co opravit v testech

### Kategorie A: Status code mismatch (200 vs 204)

API správně vrací **204 No Content** pro DELETE operace, ale testy očekávají **200 OK**. Toto je standardní REST konvence — **testy jsou špatné, ne API**.

| # | Test soubor | Test | Aktuální | Očekávaný testem | Fix |
|---|-------------|------|----------|------------------|-----|
| 1 | auth-extended | logout → 200 | 204 | 200 | Změnit `.expect(200)` na `.expect(204)` |
| 2 | finance-extended | DELETE bank account | 204 | 200 | Změnit na `.expect(204)` |
| 3 | properties-extended | DELETE property | 204 | 200 | Změnit na `.expect(204)` |
| 4 | units-extended | DELETE room | 204 | 200 | Změnit na `.expect(204)` |
| 5 | units-extended | DELETE quantity | 204 | 200 | Změnit na `.expect(204)` |
| 6 | units-extended | DELETE fee | 204 | 200 | Změnit na `.expect(204)` |
| 7 | units-extended | DELETE unit | 204 | 200 | Změnit na `.expect(204)` |
| 8 | residents-extended | DELETE resident | 204 | 200 | Změnit na `.expect(204)` |
| 9 | admin-extended | DELETE user | 204 | 200 | Změnit na `.expect(204)` |

### Kategorie B: Status code mismatch (200 vs 201 pro POST actions)

API vrací **201 Created** pro POST akce (claim, resolve, submit, approve), testy očekávají **200 OK**.

| # | Test soubor | Test | Aktuální | Fix |
|---|-------------|------|----------|-----|
| 10 | helpdesk-extended | POST claim → 200 | 201 | Změnit na `.expect(201)` |
| 11 | helpdesk-extended | POST resolve → 200 | 201 | Změnit na `.expect(201)` |
| 12 | finance-extended | POST submit → 200 | 201 | Změnit na `.expect(201)` |
| 13 | finance-extended | POST approve → 200 | 201 | Změnit na `.expect(201)` |
| 14 | finance-extended | POST return-to-draft → 200 | 201 | Změnit na `.expect(201)` |

### Kategorie C: Status code mismatch (400 vs 401)

| # | Test soubor | Test | Aktuální | Fix |
|---|-------------|------|----------|-----|
| 15 | auth-extended | reset-password invalid token → 400 | 401 | Změnit na `.expect(401)` |
| 16 | auth-extended | 2FA setup → 200 | jiný | Prověřit — 2FA setup může vyžadovat jiný flow |
| 17 | auth-extended | dup email → 409 | jiný | Prověřit — API může vracet 400 místo 409 |

### Kategorie D: DTO field name mismatch

| # | Test soubor | Test | Problém | Fix |
|---|-------------|------|---------|-----|
| 18 | finance-extended | POST comment | Posílá `text`, DTO očekává `body` | Změnit `text` na `body` v testu |
| 19 | finance-extended | POST allocation | Chybí povinné pole `componentId` | Přidat componentId do test dat |
| 20 | financial-calc | POST allocation | Chybí `componentId` | Přidat componentId |

### Kategorie E: Missing SanitizePipe in test env

| # | Test soubor | Problém | Fix |
|---|-------------|---------|-----|
| 21-28 | security-xss (8 testů) | `test.helpers.ts` neregistruje SanitizePipe | Přidat `SanitizePipe` do `createTestApp()` |

---

## Doporučení pro další kroky

### Immediate (tento sprint):

1. **Opravit BUG-001 až BUG-004 (HIGH)** — Přidat chybějící DTO validátory do:
   - `work-orders/dto/*.dto.ts` — `@IsNotEmpty()` na title, `@IsEnum` na workType + priority
   - `assets/dto/*.dto.ts` — `@IsNotEmpty()` na name, `@IsEnum` na category
   - `meters/dto/*.dto.ts` — `@IsNotEmpty()` na name, `@IsEnum` na meterType
   - `finance/dto/*.dto.ts` — `@IsNotEmpty()` na bank account name

2. **Opravit 21 TEST ISSUES** — Aktualizovat expected status codes:
   - DELETE operace: 204 místo 200
   - POST actions: 201 místo 200
   - Comment field: `body` místo `text`
   - Allocation: přidat `componentId`

3. **Přidat SanitizePipe do test.helpers.ts** — řádek 28:
   ```typescript
   import { SanitizePipe } from '../common/pipes/sanitize.pipe'
   app.useGlobalPipes(new SanitizePipe(), new ValidationPipe({ whitelist: true, transform: true }))
   ```

### Short-term (příští sprint):

1. Prověřit BUG-005 (asset export 500)
2. Spustit E2E testy (vyžaduje běžící server)
3. Rozšířit testy pro moduly s 100% pass rate (contracts, audit, notifications)

### Backlog:

1. Přidat validátory pro všechny DTO pole kde DB má NOT NULL constraint
2. Sjednotit HTTP status codes v celé API (200 vs 201 pro POST actions)

---

*Vygenerováno automaticky z test suite run 2026-03-31.*
