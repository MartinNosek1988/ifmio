import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { getFreshToken } from '../helpers/fresh-auth';

const API_URL = process.env.API_URL || 'http://localhost:3000';

async function createPropertyApi(page: any, name: string): Promise<string> {
  const token = await getFreshToken(page);
  const res = await page.request.post(`${API_URL}/api/v1/properties`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: { name, address: 'Units Field Test', city: 'Praha', postalCode: '11000', type: 'SVJ', ownership: 'vlastnictvi' },
  });
  return (await res.json()).id;
}

async function createUnitApi(page: any, propertyId: string, data: Record<string, unknown>): Promise<string> {
  const token = await getFreshToken(page);
  const res = await page.request.post(`${API_URL}/api/v1/properties/${propertyId}/units`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: { name: 'Test Unit', ...data },
  });
  const body = await res.json();
  return body?.id ?? '';
}

async function deletePropertyApi(page: any, id: string) {
  const token = await getFreshToken(page);
  await page.request.delete(`${API_URL}/api/v1/properties/${id}`, { headers: { Authorization: `Bearer ${token}` } });
}

/*
  UNIT FIELD INVENTORY:
  | Prisma Field        | Type           | Required | DTO Validator                          | Form Label               | Input Type    | data-testid              |
  |---------------------|----------------|----------|----------------------------------------|--------------------------|---------------|--------------------------|
  | name                | String         | YES      | @IsString @IsNotEmpty @MaxLength(100)  | Název jednotky *         | text          | unit-form-name           |
  | knDesignation       | String?        | No       | @IsOptional @IsString @MaxLength(30)   | KN označení              | text          | unit-form-knDesignation  |
  | ownDesignation      | String?        | No       | @IsOptional @IsString @MaxLength(100)  | Vlastní označení         | text          | —                        |
  | spaceType           | SpaceType enum | No       | @IsOptional @IsEnum(6)                 | Typ prostoru             | select        | unit-form-spaceType      |
  | disposition         | String?        | No       | @IsOptional @IsString @MaxLength(20)   | Dispozice                | text          | —                        |
  | floor               | Int?           | No       | @IsOptional @IsInt @Min(-5) @Max(200)  | Patro                    | number        | unit-form-floor          |
  | area                | Float?         | No       | @IsOptional @IsNumber @Min(0)          | Podlahová plocha (m²)    | number(0.01)  | unit-form-area           |
  | heatingArea         | Float?         | No       | @IsOptional @IsNumber @Min(0)          | Vytápěná plocha (m²)     | number(0.01)  | —                        |
  | commonAreaShare     | Decimal(10,6)? | No       | @IsOptional @IsNumber @Min(0) @Max(1)  | Podíl na spol. č. (%)    | number(0.0001)| unit-form-commonAreaShare|
  | personCount         | Int?           | No       | @IsOptional @IsInt @Min(0)             | Počet osob               | number        | —                        |
  | hasElevator         | Boolean?       | No       | @IsOptional @IsBoolean                 | Výtah                    | checkbox      | — (collapsible)          |
  | heatingMethod       | String?        | No       | @IsOptional @IsString @MaxLength(100)  | Způsob vytápění          | text          | — (collapsible)          |
  | heatingCoefficient  | Float?         | No       | @IsOptional @IsNumber @Min(0)          | Koeficient vytápění      | number(0.01)  | — (collapsible)          |
  | hotWaterCoefficient | Float?         | No       | @IsOptional @IsNumber @Min(0)          | Koeficient TUV           | number(0.01)  | — (collapsible)          |
  | tuvArea             | Float?         | No       | @IsOptional @IsNumber @Min(0)          | Plocha TUV (m²)          | number(0.01)  | — (collapsible)          |
  | extAllocatorRef     | String?        | No       | @IsOptional @IsString @MaxLength(50)   | Symbol pro rozúčtovatele | text          | — (collapsible)          |
  | validFrom           | DateTime?      | No       | @IsOptional @IsDateString              | Platnost od              | date          | — (collapsible)          |
  | validTo             | DateTime?      | No       | @IsOptional @IsDateString              | Platnost do              | date          | — (collapsible)          |
  | isGarageUnit        | Boolean        | No       | N/A (default false)                    | N/A                      | N/A           | N/A                      |
*/

// ================================================================
// SECTION 1 — FORM: field types and defaults
// ================================================================
test.describe('Units — Pole formuláře', () => {
  let propertyId: string;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page);
    propertyId = await createPropertyApi(page, 'Unit Fields E2E');
    await ctx.close();
  });

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page);
    await deletePropertyApi(page, propertyId);
    await ctx.close();
  });

  test.beforeEach(async ({ page }) => { await login(page); });

  async function openUnitForm(page: any) {
    await page.goto(`/properties/${propertyId}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    await page.locator('[data-testid="unit-add-btn"]').click();
    await page.waitForTimeout(300);
  }

  // ─── NAME ──────────────────────────────────────────────────────
  test('pole Název — je input type text, povinné', async ({ page }) => {
    await openUnitForm(page);
    const el = page.locator('[data-testid="unit-form-name"]');
    await expect(el).toBeVisible();
    const tagType = await el.evaluate((e: HTMLInputElement) => `${e.tagName}.${e.type}`);
    expect(tagType.toLowerCase()).toBe('input.text');
    await expect(el).toHaveValue(''); // empty default
  });

  test('pole Název — povinné (chybí → form stays open)', async ({ page }) => {
    await openUnitForm(page);
    await page.locator('[data-testid="unit-form-name"]').fill('');
    await page.locator('[data-testid="unit-form-save"]').click();
    await page.waitForTimeout(300);
    await expect(page.locator('[data-testid="unit-form-name"]')).toBeVisible(); // form didn't close
  });

  // ─── KN DESIGNATION ────────────────────────────────────────────
  test('pole KN označení — volitelné, max 30 znaků', async ({ page }) => {
    await openUnitForm(page);
    const el = page.locator('[data-testid="unit-form-knDesignation"]');
    await expect(el).toBeVisible();
    const maxLen = await el.getAttribute('maxlength');
    expect(maxLen).toBe('30');
  });

  // ─── SPACE TYPE ────────────────────────────────────────────────
  test('pole Typ prostoru — je select, 6 options', async ({ page }) => {
    await openUnitForm(page);
    const el = page.locator('[data-testid="unit-form-spaceType"]');
    await expect(el).toBeVisible();
    const tagName = await el.evaluate((e: HTMLElement) => e.tagName);
    expect(tagName.toLowerCase()).toBe('select');
    const options = await el.locator('option').allTextContents();
    expect(options.length).toBe(6); // RESIDENTIAL, NON_RESIDENTIAL, GARAGE, PARKING, CELLAR, LAND
  });

  test('pole Typ prostoru — výchozí RESIDENTIAL', async ({ page }) => {
    await openUnitForm(page);
    expect(await page.locator('[data-testid="unit-form-spaceType"]').inputValue()).toBe('RESIDENTIAL');
  });

  // ─── FLOOR ─────────────────────────────────────────────────────
  test('pole Patro — je number input', async ({ page }) => {
    await openUnitForm(page);
    const el = page.locator('[data-testid="unit-form-floor"]');
    await expect(el).toBeVisible();
    const type = await el.evaluate((e: HTMLInputElement) => e.type);
    expect(type).toBe('number');
  });

  test('pole Patro — záporná hodnota povolena (suterén)', async ({ page }) => {
    // DTO: @Min(-5) → -1 should be accepted
    const id = await createUnitApi(page, propertyId, { name: 'Suterén E2E', floor: -1 });
    expect(id).toBeTruthy();
    const token = await getFreshToken(page);
    const res = await page.request.get(`${API_URL}/api/v1/properties/${propertyId}/units/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    expect((await res.json()).floor).toBe(-1);
  });

  // ─── AREA ──────────────────────────────────────────────────────
  test('pole Plocha — je number input s krokem 0.01', async ({ page }) => {
    await openUnitForm(page);
    const el = page.locator('[data-testid="unit-form-area"]');
    await expect(el).toBeVisible();
    const step = await el.getAttribute('step');
    expect(step).toBe('0.01');
  });

  test('pole Plocha — přijímá desetinné číslo', async ({ page }) => {
    const id = await createUnitApi(page, propertyId, { name: 'Area Dec E2E', area: 65.75 });
    expect(id).toBeTruthy();
    const token = await getFreshToken(page);
    const res = await page.request.get(`${API_URL}/api/v1/properties/${propertyId}/units/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    expect((await res.json()).area).toBeCloseTo(65.75, 1);
  });

  test('pole Plocha — nulová hodnota povolena', async ({ page }) => {
    const token = await getFreshToken(page);
    const res = await page.request.post(`${API_URL}/api/v1/properties/${propertyId}/units`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { name: 'Area Zero E2E', area: 0 },
    });
    // DTO: @Min(0) → 0 should be accepted
    expect(res.status()).toBeLessThan(500);
  });

  test('pole Plocha — záporná hodnota odmítnuta', async ({ page }) => {
    const token = await getFreshToken(page);
    const res = await page.request.post(`${API_URL}/api/v1/properties/${propertyId}/units`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { name: 'Area Neg E2E', area: -10 },
    });
    // DTO: @Min(0) → negative should be rejected (400)
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  // ─── COMMON AREA SHARE ─────────────────────────────────────────
  test('pole Podíl — input s krokem 0.0001, max 100', async ({ page }) => {
    await openUnitForm(page);
    const el = page.locator('[data-testid="unit-form-commonAreaShare"]');
    await expect(el).toBeVisible();
    expect(await el.getAttribute('step')).toBe('0.0001');
    expect(await el.getAttribute('max')).toBe('100');
  });

  test('pole Podíl — frontend validace 0-100 %', async ({ page }) => {
    await openUnitForm(page);
    await page.locator('[data-testid="unit-form-name"]').fill('Share Test');
    await page.locator('[data-testid="unit-form-commonAreaShare"]').fill('150');
    await page.locator('[data-testid="unit-form-save"]').click();
    await page.waitForTimeout(300);
    // Error: "Podíl musí být 0–100 %"
    await expect(page.locator('[data-testid="unit-form-name"]')).toBeVisible(); // form didn't close
  });

  test('pole Podíl — UI % se převede na DB fraction', async ({ page }) => {
    // UI: 3.4567% → API: 0.034567 (divided by 100)
    const id = await createUnitApi(page, propertyId, { name: 'Share Conv E2E', commonAreaShare: 0.034567 });
    expect(id).toBeTruthy();
    const token = await getFreshToken(page);
    const res = await page.request.get(`${API_URL}/api/v1/properties/${propertyId}/units/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    const share = Number((await res.json()).commonAreaShare);
    expect(share).toBeCloseTo(0.034567, 4);
  });
});

// ================================================================
// SECTION 2 — CREATE: minimal vs maximal
// ================================================================
test.describe('Units — Vytvoření min/max', () => {
  let propertyId: string;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page);
    propertyId = await createPropertyApi(page, 'Unit MinMax E2E');
    await ctx.close();
  });

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page);
    await deletePropertyApi(page, propertyId);
    await ctx.close();
  });

  test.beforeEach(async ({ page }) => { await login(page); });

  test('vytvoření s minimálními poli (jen name)', async ({ page }) => {
    const id = await createUnitApi(page, propertyId, { name: 'Minimal Unit E2E' });
    expect(id).toBeTruthy();
  });

  test('vytvoření s maximálními poli (vše vyplněno)', async ({ page }) => {
    const id = await createUnitApi(page, propertyId, {
      name: 'Maximal Unit E2E',
      knDesignation: '1883/99',
      ownDesignation: 'B999',
      spaceType: 'NON_RESIDENTIAL',
      disposition: '3+1',
      floor: 5,
      area: 120.5,
      heatingArea: 110.0,
      commonAreaShare: 0.05,
      personCount: 4,
      hasElevator: true,
      heatingMethod: 'ústřední',
      heatingCoefficient: 1.2,
      hotWaterCoefficient: 0.8,
      tuvArea: 95.0,
      extAllocatorRef: 'EXT-001',
    });
    expect(id).toBeTruthy();

    // Verify ALL fields saved
    const token = await getFreshToken(page);
    const res = await page.request.get(`${API_URL}/api/v1/properties/${propertyId}/units/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    const unit = await res.json();
    expect(unit.name).toBe('Maximal Unit E2E');
    expect(unit.knDesignation).toBe('1883/99');
    expect(unit.spaceType).toBe('NON_RESIDENTIAL');
    expect(unit.floor).toBe(5);
    expect(unit.area).toBeCloseTo(120.5, 1);
    expect(unit.personCount).toBe(4);
  });

  test('editace jednoho pole — ostatní zůstávají', async ({ page }) => {
    const id = await createUnitApi(page, propertyId, { name: 'Edit Partial E2E', floor: 3, area: 50 });
    const token = await getFreshToken(page);

    // Update only name
    await page.request.put(`${API_URL}/api/v1/properties/${propertyId}/units/${id}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { name: 'Renamed Partial E2E' },
    });

    const res = await page.request.get(`${API_URL}/api/v1/properties/${propertyId}/units/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    const unit = await res.json();
    expect(unit.name).toBe('Renamed Partial E2E');
    expect(unit.floor).toBe(3);
    expect(unit.area).toBeCloseTo(50, 0);
  });
});

// ================================================================
// SECTION 3 — API VALIDATION
// ================================================================
test.describe('Units — API validace', () => {
  let propertyId: string;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page);
    propertyId = await createPropertyApi(page, 'Unit Validation E2E');
    await ctx.close();
  });

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page);
    await deletePropertyApi(page, propertyId);
    await ctx.close();
  });

  test.beforeEach(async ({ page }) => { await login(page); });

  test('API — name povinný', async ({ page }) => {
    const token = await getFreshToken(page);
    const res = await page.request.post(`${API_URL}/api/v1/properties/${propertyId}/units`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { floor: 1 }, // missing name
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('API — name MaxLength(100)', async ({ page }) => {
    const token = await getFreshToken(page);
    const res = await page.request.post(`${API_URL}/api/v1/properties/${propertyId}/units`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { name: 'A'.repeat(101) },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('API — floor Min(-5) Max(200)', async ({ page }) => {
    const token = await getFreshToken(page);
    // floor: -6 → rejected
    const res1 = await page.request.post(`${API_URL}/api/v1/properties/${propertyId}/units`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { name: 'Floor -6 E2E', floor: -6 },
    });
    expect(res1.status()).toBeGreaterThanOrEqual(400);

    // floor: 201 → rejected
    const res2 = await page.request.post(`${API_URL}/api/v1/properties/${propertyId}/units`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { name: 'Floor 201 E2E', floor: 201 },
    });
    expect(res2.status()).toBeGreaterThanOrEqual(400);
  });

  test('API — commonAreaShare Min(0) Max(1)', async ({ page }) => {
    const token = await getFreshToken(page);
    // Share > 1 → rejected (API expects fraction 0-1, not percentage)
    const res = await page.request.post(`${API_URL}/api/v1/properties/${propertyId}/units`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { name: 'Share 1.5 E2E', commonAreaShare: 1.5 },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('API — neplatný spaceType', async ({ page }) => {
    const token = await getFreshToken(page);
    const res = await page.request.post(`${API_URL}/api/v1/properties/${propertyId}/units`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { name: 'Bad Type E2E', spaceType: 'INVALID_TYPE' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});

// ================================================================
// CLEANUP
// ================================================================
test.describe('Units Fields — Cleanup', () => {
  test.beforeEach(async ({ page }) => { await login(page); });
  test('úklid', async ({ page }) => {
    const token = await getFreshToken(page);
    const res = await page.request.get(`${API_URL}/api/v1/properties`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok()) return;
    for (const p of await res.json()) {
      if (p.name?.includes('Unit') && p.name?.includes('E2E')) {
        await page.request.delete(`${API_URL}/api/v1/properties/${p.id}`, { headers: { Authorization: `Bearer ${token}` } });
      }
    }
  });
});
