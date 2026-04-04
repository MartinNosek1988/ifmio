import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

const API_URL = process.env.API_URL || 'http://localhost:3000';

async function getToken(page: any): Promise<string> {
  return page.evaluate(() => sessionStorage.getItem('ifmio:access_token'));
}

async function createPropertyApi(page: any, name: string): Promise<string> {
  const token = await getToken(page);
  const res = await page.request.post(`${API_URL}/api/v1/properties`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: { name, address: 'Contract 1', city: 'Praha', postalCode: '11000', type: 'SVJ', ownership: 'vlastnictvi' },
  });
  return (await res.json()).id;
}

async function createContractApi(page: any, data: Record<string, unknown>): Promise<string> {
  const token = await getToken(page);
  const res = await page.request.post(`${API_URL}/api/v1/contracts`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: { contractNumber: `SM-E2E-${Date.now()}`, monthlyRent: 10000, startDate: new Date().toISOString().slice(0, 10), ...data },
  });
  return (await res.json()).id;
}

async function deleteContractApi(page: any, id: string) {
  const token = await getToken(page);
  await page.request.delete(`${API_URL}/api/v1/contracts/${id}`, { headers: { Authorization: `Bearer ${token}` } });
}

async function deletePropertyApi(page: any, id: string) {
  const token = await getToken(page);
  await page.request.delete(`${API_URL}/api/v1/properties/${id}`, { headers: { Authorization: `Bearer ${token}` } });
}

// ================================================================
// L1: CRUD
// ================================================================
test.describe('Contracts — CRUD', () => {
  let propertyId: string;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page);
    propertyId = await createPropertyApi(page, 'Contract CRUD E2E');
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

  test('stránka se načte', async ({ page }) => {
    await page.goto('/contracts');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="contract-list-page"]')).toBeVisible();
    await expect(page.locator('[data-testid="contract-add-btn"]')).toBeVisible();
  });

  test('vytvoření smlouvy via API', async ({ page }) => {
    const id = await createContractApi(page, { propertyId });
    expect(id).toBeTruthy();
    await deleteContractApi(page, id);
  });

  test('smazání smlouvy via API', async ({ page }) => {
    const id = await createContractApi(page, { propertyId });
    const token = await getToken(page);
    const res = await page.request.delete(`${API_URL}/api/v1/contracts/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    expect(res.status()).toBeLessThan(300);
  });
});

// ================================================================
// L2: VALIDATION + EDGE CASES
// ================================================================
test.describe('Contracts — Deep', () => {
  let propertyId: string;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page);
    propertyId = await createPropertyApi(page, 'Contract Deep E2E');
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

  test('smlouva bez endDate — neomezená', async ({ page }) => {
    const id = await createContractApi(page, { propertyId });
    const token = await getToken(page);
    const res = await page.request.get(`${API_URL}/api/v1/contracts/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    const body = await res.json();
    expect(body.endDate).toBeFalsy();
    await deleteContractApi(page, id);
  });

  test('měsíční nájem — nulová hodnota', async ({ page }) => {
    const token = await getToken(page);
    const res = await page.request.post(`${API_URL}/api/v1/contracts`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { contractNumber: `SM-ZERO-${Date.now()}`, propertyId, monthlyRent: 0, startDate: new Date().toISOString().slice(0, 10) },
    });
    expect(res.status()).toBeLessThan(500);
    if (res.ok()) {
      const body = await res.json();
      await deleteContractApi(page, body.id);
    }
  });

  test('dvě smlouvy na stejnou nemovitost', async ({ page }) => {
    const id1 = await createContractApi(page, { propertyId });
    const id2 = await createContractApi(page, { propertyId });
    expect(id1).not.toBe(id2);
    await deleteContractApi(page, id1);
    await deleteContractApi(page, id2);
  });

  test('speciální znaky v čísle smlouvy', async ({ page }) => {
    const id = await createContractApi(page, { propertyId, contractNumber: 'SM-č.42/A — 2026' });
    expect(id).toBeTruthy();
    await deleteContractApi(page, id);
  });
});

// ================================================================
// CLEANUP
// ================================================================
test.describe('Contracts — Cleanup', () => {
  test.beforeEach(async ({ page }) => { await login(page); });
  test('úklid', async ({ page }) => {
    const token = await getToken(page);
    const res = await page.request.get(`${API_URL}/api/v1/contracts?search=E2E&limit=50`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok()) {
      const data = await res.json();
      for (const c of data.data ?? data) {
        if (c.contractNumber?.includes('E2E')) {
          await page.request.delete(`${API_URL}/api/v1/contracts/${c.id}`, { headers: { Authorization: `Bearer ${token}` } });
        }
      }
    }
  });
});
