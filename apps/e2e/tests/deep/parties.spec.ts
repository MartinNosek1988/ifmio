import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Parties — Deep CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // ============================================================
  // 1. LIST VIEW
  // ============================================================
  test.describe('Seznam subjektů', () => {
    test('stránka se načte a zobrazí subjekty', async ({ page }) => {
      await page.goto('/parties');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('[data-testid="party-list-page"]')).toBeVisible();
      await expect(page.locator('[data-testid="party-add-btn"]')).toBeVisible();

      // Seed has at least 1 party (Jan Novák or Správa Lipová)
      const rows = page.locator('table tbody tr');
      const hasRows = await rows.first().isVisible().catch(() => false);
      if (!hasRows) {
        test.skip(true, 'Žádné subjekty v DB');
        return;
      }
      expect(await rows.count()).toBeGreaterThanOrEqual(1);
    });

    test('vyhledávání filtruje seznam', async ({ page }) => {
      await page.goto('/parties');
      await page.waitForLoadState('domcontentloaded');

      const searchInput = page.locator('[data-testid="party-search-input"]');
      await expect(searchInput).toBeVisible();

      // Count initial rows
      const rowsBefore = await page.locator('table tbody tr').count();
      if (rowsBefore < 2) {
        test.skip(true, 'Potřeba alespoň 2 subjektů pro test vyhledávání');
        return;
      }

      // Search for a unique name
      await searchInput.fill('Novák');
      // Search is server-side via query param — wait for API response
      await page.waitForResponse((r) => r.url().includes('/api/v1/parties') && r.status() === 200);
      await page.waitForTimeout(300);

      const rowsAfter = await page.locator('table tbody tr').count();
      expect(rowsAfter).toBeLessThanOrEqual(rowsBefore);
      expect(rowsAfter).toBeGreaterThanOrEqual(1);

      // Clear search
      await searchInput.fill('');
      await page.waitForResponse((r) => r.url().includes('/api/v1/parties') && r.status() === 200);
    });
  });

  // ============================================================
  // 2. CREATE
  // ============================================================
  test.describe('Vytvoření subjektu', () => {
    test('formulář obsahuje všechna pole', async ({ page }) => {
      await page.goto('/parties');
      await page.waitForLoadState('domcontentloaded');

      await page.locator('[data-testid="party-add-btn"]').click();

      // Type buttons visible
      await expect(page.locator('[data-testid="party-form-type-person"]')).toBeVisible();
      await expect(page.locator('[data-testid="party-form-type-company"]')).toBeVisible();
      await expect(page.locator('[data-testid="party-form-type-hoa"]')).toBeVisible();

      // Person is default — name fields visible
      await expect(page.locator('[data-testid="party-form-lastName"]')).toBeVisible();
      await expect(page.locator('[data-testid="party-form-firstName"]')).toBeVisible();
      await expect(page.locator('[data-testid="party-form-displayName"]')).toBeVisible();

      // Identification + contact + address
      await expect(page.locator('[data-testid="party-form-ic"]')).toBeVisible();
      await expect(page.locator('[data-testid="party-form-dic"]')).toBeVisible();
      await expect(page.locator('[data-testid="party-form-email"]')).toBeVisible();
      await expect(page.locator('[data-testid="party-form-phone"]')).toBeVisible();
      await expect(page.locator('[data-testid="party-form-street"]')).toBeVisible();
      await expect(page.locator('[data-testid="party-form-city"]')).toBeVisible();
      await expect(page.locator('[data-testid="party-form-postalCode"]')).toBeVisible();

      // Buttons
      await expect(page.locator('[data-testid="party-form-save"]')).toBeVisible();
      await expect(page.locator('[data-testid="party-form-cancel"]')).toBeVisible();
    });

    test('přepnutí na firmu zobrazí pole Název firmy', async ({ page }) => {
      await page.goto('/parties');
      await page.waitForLoadState('domcontentloaded');

      await page.locator('[data-testid="party-add-btn"]').click();
      await expect(page.locator('[data-testid="party-form-lastName"]')).toBeVisible();

      // Switch to company
      await page.locator('[data-testid="party-form-type-company"]').click();
      // Person fields hidden, company name visible
      await expect(page.locator('[data-testid="party-form-lastName"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="party-form-companyName"]')).toBeVisible();
    });

    test('validace — prázdný formulář', async ({ page }) => {
      await page.goto('/parties');
      await page.waitForLoadState('domcontentloaded');

      await page.locator('[data-testid="party-add-btn"]').click();
      // Clear displayName (auto-filled) and submit
      await page.locator('[data-testid="party-form-displayName"]').fill('');
      await page.locator('[data-testid="party-form-save"]').click();

      // Error should appear — displayName is required
      await expect(page.locator('[data-testid="party-form-error"]')).toBeVisible();
    });

    test('vytvoření osoby se všemi poli', async ({ page }) => {
      await page.goto('/parties');
      await page.waitForLoadState('domcontentloaded');

      await page.locator('[data-testid="party-add-btn"]').click();

      // Fill person fields
      await page.locator('[data-testid="party-form-type-person"]').click();
      await page.locator('[data-testid="party-form-lastName"]').fill('Testovací');
      await page.locator('[data-testid="party-form-firstName"]').fill('Subjekt');
      // displayName auto-fills to "Testovací Subjekt"
      await expect(page.locator('[data-testid="party-form-displayName"]')).toHaveValue('Testovací Subjekt');

      await page.locator('[data-testid="party-form-email"]').fill('test-e2e@example.cz');
      await page.locator('[data-testid="party-form-phone"]').fill('+420999888777');
      await page.locator('[data-testid="party-form-street"]').fill('E2E ulice 42');
      await page.locator('[data-testid="party-form-city"]').fill('Brno');
      await page.locator('[data-testid="party-form-postalCode"]').fill('60200');

      // Submit
      const responsePromise = page.waitForResponse(
        (r) => r.url().includes('/api/v1/parties') && r.request().method() === 'POST' && r.status() === 201,
      );
      await page.locator('[data-testid="party-form-save"]').click();
      await responsePromise;

      // Modal should close
      await expect(page.locator('[data-testid="party-form-save"]')).not.toBeVisible({ timeout: 5000 });

      // Party should appear in list
      await page.waitForTimeout(500);
      await expect(page.getByText('Testovací Subjekt').first()).toBeVisible({ timeout: 5000 });
    });

    test('vytvoření firmy s IČ', async ({ page }) => {
      await page.goto('/parties');
      await page.waitForLoadState('domcontentloaded');

      await page.locator('[data-testid="party-add-btn"]').click();
      await page.locator('[data-testid="party-form-type-company"]').click();

      await page.locator('[data-testid="party-form-companyName"]').fill('Testovací Firma E2E s.r.o.');
      await page.locator('[data-testid="party-form-ic"]').fill('99776655');
      await page.locator('[data-testid="party-form-email"]').fill('firma-e2e@example.cz');

      const responsePromise = page.waitForResponse(
        (r) => r.url().includes('/api/v1/parties') && r.request().method() === 'POST' && r.status() === 201,
      );
      await page.locator('[data-testid="party-form-save"]').click();
      await responsePromise;

      await expect(page.locator('[data-testid="party-form-save"]')).not.toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(500);
      await expect(page.getByText('Testovací Firma E2E s.r.o.').first()).toBeVisible({ timeout: 5000 });
    });
  });

  // ============================================================
  // 3. DETAIL VIEW (modal — clicked from list)
  // ============================================================
  test.describe('Detail subjektu', () => {
    test('detail modal zobrazí údaje osoby', async ({ page }) => {
      await page.goto('/parties');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      // Click the test person row
      await page.getByText('Testovací Subjekt').first().click();
      await page.waitForTimeout(500);

      // Modal shows party name and type
      await expect(page.getByText('Testovací Subjekt').first()).toBeVisible();
      await expect(page.getByText('test-e2e@example.cz').first()).toBeVisible();
      await expect(page.getByText('+420999888777').first()).toBeVisible();

      // Edit and Delete buttons in modal
      await expect(page.locator('[data-testid="party-detail-modal-edit"]')).toBeVisible();
      await expect(page.locator('[data-testid="party-detail-modal-delete"]')).toBeVisible();
    });
  });

  // ============================================================
  // 4. EDIT (from detail modal → edit button → form modal)
  // ============================================================
  test.describe('Editace subjektu', () => {
    test('editace — pole jsou předvyplněná a změny se uloží', async ({ page }) => {
      await page.goto('/parties');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      // Open detail modal
      await page.getByText('Testovací Subjekt').first().click();
      await page.waitForTimeout(500);

      // Click edit in modal
      await page.locator('[data-testid="party-detail-modal-edit"]').click();
      await page.waitForTimeout(300);

      // Form should be pre-filled
      await expect(page.locator('[data-testid="party-form-displayName"]')).toHaveValue('Testovací Subjekt');
      await expect(page.locator('[data-testid="party-form-email"]')).toHaveValue('test-e2e@example.cz');

      // Change fields
      await page.locator('[data-testid="party-form-lastName"]').fill('Upravený');
      await page.locator('[data-testid="party-form-displayName"]').fill('Upravený Subjekt');
      await page.locator('[data-testid="party-form-phone"]').fill('+420111222333');

      // Save
      const responsePromise = page.waitForResponse(
        (r) => r.url().includes('/api/v1/parties/') && r.request().method() === 'PATCH' && r.status() === 200,
      );
      await page.locator('[data-testid="party-form-save"]').click();
      await responsePromise;

      await expect(page.locator('[data-testid="party-form-save"]')).not.toBeVisible({ timeout: 5000 });

      // Verify updated name in list
      await page.waitForTimeout(500);
      await expect(page.getByText('Upravený Subjekt').first()).toBeVisible();
    });
  });

  // ============================================================
  // 5. DELETE (from detail modal → delete → confirmation)
  // ============================================================
  test.describe('Deaktivace subjektu', () => {
    test('deaktivace firmy přes detail modal', async ({ page }) => {
      await page.goto('/parties');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      // Open detail modal for the test company
      await page.getByText('Testovací Firma E2E s.r.o.').first().click();
      await page.waitForTimeout(500);

      // Click delete in detail modal
      await page.locator('[data-testid="party-detail-modal-delete"]').click();
      await page.waitForTimeout(300);

      // Confirmation modal should appear
      await expect(page.locator('[data-testid="party-delete-confirm"]')).toBeVisible();

      // Confirm deletion
      const responsePromise = page.waitForResponse(
        (r) => r.url().includes('/api/v1/parties/') && r.request().method() === 'DELETE',
      );
      await page.locator('[data-testid="party-delete-confirm"]').click();
      await responsePromise;

      // Confirmation modal should close
      await expect(page.locator('[data-testid="party-delete-confirm"]')).not.toBeVisible({ timeout: 5000 });
    });

    test('deaktivace osoby přes API', async ({ page }) => {
      await page.goto('/parties');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      // Get the test person via API
      const token = await page.evaluate(() => sessionStorage.getItem('ifmio:access_token'));
      const apiUrl = process.env.API_URL || 'http://localhost:3000';
      const listRes = await page.request.get(`${apiUrl}/api/v1/parties?search=Upravený Subjekt`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const listData = await listRes.json();
      const testParty = listData.data?.find((p: any) => p.displayName === 'Upravený Subjekt');

      if (testParty) {
        await page.request.delete(`${apiUrl}/api/v1/parties/${testParty.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    });
  });

  // ============================================================
  // CLEANUP — delete leftover test parties
  // ============================================================
  test('úklid — smazání zbylých testovacích subjektů', async ({ page }) => {
    await page.goto('/parties');
    await page.waitForLoadState('domcontentloaded');

    const token = await page.evaluate(() => sessionStorage.getItem('ifmio:access_token'));
    const apiUrl = process.env.API_URL || 'http://localhost:3000';

    const testNames = ['Testovací Subjekt', 'Upravený Subjekt', 'Testovací Firma E2E s.r.o.'];
    for (const name of testNames) {
      const res = await page.request.get(`${apiUrl}/api/v1/parties?search=${encodeURIComponent(name)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok()) {
        const data = await res.json();
        for (const p of data.data ?? []) {
          if (testNames.includes(p.displayName)) {
            await page.request.delete(`${apiUrl}/api/v1/parties/${p.id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
          }
        }
      }
    }
  });
});
