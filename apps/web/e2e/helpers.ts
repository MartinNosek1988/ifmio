import { type Page } from '@playwright/test';

const API_URL = process.env.E2E_API_URL || 'http://localhost:3000';

export async function loginViaApi(page: Page, email = 'admin@ifmio.cz', password = 'admin123') {
  const res = await page.request.post(`${API_URL}/auth/login`, {
    data: { email, password },
  });

  const body = await res.json();
  const token = body.access_token || body.token;

  if (!token) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(body)}`);
  }

  await page.addInitScript((t: string) => {
    localStorage.setItem('token', t);
  }, token);

  return token;
}

export async function navigateTo(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'networkidle' });
}
