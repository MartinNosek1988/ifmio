import { request } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config();

async function globalTeardown() {
  const baseUrl = process.env.BASE_URL || 'https://ifmio.com';
  const tenantId = process.env.E2E_TENANT_ID;

  if (!tenantId) return;

  console.log(`[E2E Teardown] Cleaning up tenant: ${tenantId}`);
  const ctx = await request.newContext({ baseURL: baseUrl });

  try {
    await ctx.delete(`/api/v1/e2e-seed/cleanup/${tenantId}`);
    console.log('[E2E Teardown] Cleanup OK');
  } catch (err) {
    console.error(`[E2E Teardown] Cleanup error: ${err}`);
  } finally {
    await ctx.dispose();
  }
}

export default globalTeardown;
