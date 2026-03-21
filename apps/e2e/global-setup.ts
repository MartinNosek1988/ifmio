import { request } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config();

async function globalSetup() {
  const baseUrl = process.env.API_URL || process.env.BASE_URL || 'https://ifmio.com';
  const seedEnabled = process.env.E2E_SEED_ENABLED === 'true';

  if (!seedEnabled) {
    console.log('[E2E Setup] Seed disabled — tests will use existing data');
    return;
  }

  console.log('[E2E Setup] Creating seed data...');
  const ctx = await request.newContext({ baseURL: baseUrl });

  try {
    const response = await ctx.post('/api/v1/e2e-seed/setup');
    if (!response.ok()) {
      console.error(`[E2E Setup] Seed failed: ${response.status()}`);
      return;
    }

    const data = await response.json();
    process.env.E2E_TENANT_ID = data.tenantId;
    process.env.E2E_PROPERTY_ID = data.propertyId;
    process.env.E2E_UNIT_IDS = JSON.stringify(data.unitIds);
    process.env.E2E_PARTY_IDS = JSON.stringify(data.partyIds);
    process.env.E2E_USER_EMAIL = data.userEmail;

    console.log(`[E2E Setup] Seed OK — tenant: ${data.tenantId}`);
  } catch (err) {
    console.error(`[E2E Setup] Seed error: ${err}`);
  } finally {
    await ctx.dispose();
  }
}

export default globalSetup;
