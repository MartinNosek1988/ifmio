import { test as setup } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const AUTH_FILE = path.join(__dirname, '.auth', 'tokens.json');

setup('authenticate', async ({ page }) => {
  const apiUrl = process.env.API_URL || process.env.BASE_URL || 'https://ifmio.com';
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;
  if (!email || !password) {
    throw new Error('TEST_EMAIL and TEST_PASSWORD must be set in .env');
  }

  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  // Login via API — retry up to 3 times for rate limiting
  let response: any;
  for (let attempt = 1; attempt <= 3; attempt++) {
    response = await page.evaluate(
      async ({ url, email, password }) => {
        const res = await fetch(`${url}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        return res.json();
      },
      { url: apiUrl, email, password },
    );

    if (response.accessToken) break;
    if (attempt < 3) {
      console.log(`[Auth Setup] Attempt ${attempt} failed, retrying in 3s...`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  if (!response?.accessToken) {
    throw new Error(`Auth setup failed: ${response?.message || JSON.stringify(response)}`);
  }

  // Save tokens to file for other tests to use
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  fs.writeFileSync(AUTH_FILE, JSON.stringify({
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    user: response.user,
  }));

  console.log('[Auth Setup] Tokens saved');
});
