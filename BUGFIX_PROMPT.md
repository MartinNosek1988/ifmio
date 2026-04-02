# IFMIO – Bugfix Prompt

> Na základě BUG_REPORT.md. Oprav VŠECHNY bugy s prioritou HIGH a všechny TEST ISSUES.

## Instrukce

Přečti BUG_REPORT.md. Proveď opravy ve dvou fázích:

### Fáze 1: Oprav REAL BUGS (HIGH priority — chybějící DTO validace)

**BUG-001/002/003: Work Orders DTO**
- Otevři `apps/api/src/work-orders/dto/` — najdi CreateWorkOrderDto
- Přidej: `@IsNotEmpty()` na `title`, `@IsEnum(WorkType)` na `workType`, `@IsEnum(WOPriority)` na `priority`
- Ověř: `npx jest --forceExit src/test/work-orders-extended.spec.ts -t "Validace"`

**BUG-004: Assets DTO**
- Otevři `apps/api/src/assets/dto/` — najdi CreateAssetDto
- Přidej: `@IsNotEmpty()` na `name`, `@IsEnum(AssetCategory)` na `category`
- Ověř: `npx jest --forceExit src/test/assets-extended.spec.ts -t "Validace"`

**BUG-006: Meters DTO**
- Otevři `apps/api/src/meters/dto/` — najdi CreateMeterDto
- Přidej: `@IsNotEmpty()` na `name`, `@IsEnum(MeterType)` na `meterType`
- Ověř: `npx jest --forceExit src/test/meters-extended.spec.ts -t "Validace"`

**BUG-007: Finance DTO**
- Otevři `apps/api/src/finance/dto/` — najdi CreateBankAccountDto
- Přidej: `@IsNotEmpty()` na `name`
- Ověř: `npx jest --forceExit src/test/finance-extended.spec.ts -t "bez name"`

### Fáze 2: Oprav TEST ISSUES

**Status code fixes** — V těchto test souborech změň expected status codes:

1. `apps/api/src/test/auth-extended.spec.ts`:
   - Logout: `.expect(200)` → `.expect(204)`
   - Reset password: `.expect(400)` → `.expect(401)`

2. `apps/api/src/test/finance-extended.spec.ts`:
   - DELETE bank account: `.expect(200)` → `.expect(204)`
   - Submit/approve/return-to-draft: `.expect(200)` → `.expect(201)`
   - Comment: změň `{ text: '...' }` na `{ body: '...' }`
   - Allocation: přidej `componentId` do test dat (vytvoř component v beforeAll)

3. `apps/api/src/test/properties-extended.spec.ts`:
   - DELETE: `.expect(200)` → `.expect(204)`

4. `apps/api/src/test/units-extended.spec.ts`:
   - Všechny DELETE: `.expect(200)` → `.expect(204)`
   - Equipment POST: prověřit required pole v DTO

5. `apps/api/src/test/residents-extended.spec.ts`:
   - DELETE: `.expect(200)` → `.expect(204)`

6. `apps/api/src/test/helpdesk-extended.spec.ts`:
   - Claim/Resolve: `.expect(200)` → `.expect(201)`

7. `apps/api/src/test/admin-extended.spec.ts`:
   - DELETE user: `.expect(200)` → `.expect(204)`

8. `apps/api/src/test/security-xss.spec.ts`:
   - Přidej SanitizePipe do `test.helpers.ts` createTestApp():
   ```typescript
   import { SanitizePipe } from '../common/pipes/sanitize.pipe'
   // V createTestApp():
   app.useGlobalPipes(new SanitizePipe(), new ValidationPipe({ whitelist: true, transform: true }))
   ```

### Po opravě

1. Spusť celou test suite: `npx jest --forceExit --verbose`
2. Aktualizuj BUG_REPORT.md — přesuň opravené bugy do sekce "✅ FIXED"
3. Vytvoř git commit: `fix: oprava 7 DTO validačních bugů + 21 test issues z automatizované test suite`

**Neopravuj BUG-005** (asset export 500) — vyžaduje hlubší investigaci.
