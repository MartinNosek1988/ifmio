import * as fs from 'fs';
import * as path from 'path';

const API_URL = process.env.API_URL || process.env.BASE_URL || 'https://ifmio.com';
const TEST_EMAIL = process.env.TEST_EMAIL || 'playwright@ifmio.dev';
const TEST_PASSWORD = process.env.TEST_PASSWORD || '';

let cachedToken: string | null = null;
let tokenTimestamp = 0;
const TOKEN_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Get a valid access token — tries sessionStorage, cache, file, then API login.
 * Safe to call from any context (page may be on /login or unauthenticated).
 */
export async function getFreshToken(page: any): Promise<string> {
  // 1. Try sessionStorage
  try {
    const ssToken = await page.evaluate(() => sessionStorage.getItem('ifmio:access_token'));
    if (ssToken) return ssToken;
  } catch {}

  // 2. Try cached token (if recent enough)
  if (cachedToken && Date.now() - tokenTimestamp < TOKEN_MAX_AGE_MS) {
    return cachedToken;
  }

  // 3. Try .auth/tokens.json file
  try {
    const tokensPath = path.join(__dirname, '..', '.auth', 'tokens.json');
    const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf-8'));
    if (tokens.accessToken) {
      cachedToken = tokens.accessToken;
      tokenTimestamp = Date.now();
      return tokens.accessToken;
    }
  } catch {}

  // 4. Last resort: login via API for fresh tokens
  if (TEST_EMAIL && TEST_PASSWORD) {
    try {
      const res = await page.request.post(`${API_URL}/api/v1/auth/login`, {
        data: { email: TEST_EMAIL, password: TEST_PASSWORD },
      });
      if (res.ok()) {
        const body = await res.json();
        cachedToken = body.accessToken;
        tokenTimestamp = Date.now();
        return body.accessToken;
      }
    } catch {}
  }

  return '';
}

/**
 * Ensure the page is authenticated. If token expired and page redirected
 * to /login, re-login via API and inject fresh tokens.
 */
export async function ensureAuthenticated(page: any): Promise<void> {
  if (!page.url().includes('/login')) return;

  if (!TEST_EMAIL || !TEST_PASSWORD) return;

  try {
    const res = await page.request.post(`${API_URL}/api/v1/auth/login`, {
      data: { email: TEST_EMAIL, password: TEST_PASSWORD },
    });
    if (!res.ok()) return;
    const body = await res.json();

    cachedToken = body.accessToken;
    tokenTimestamp = Date.now();

    await page.evaluate((t: any) => {
      sessionStorage.setItem('ifmio:access_token', t.accessToken);
      sessionStorage.setItem('ifmio:refresh_token', t.refreshToken);
      if (t.user) sessionStorage.setItem('ifmio:user', JSON.stringify(t.user));
    }, body);

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
  } catch {}
}
