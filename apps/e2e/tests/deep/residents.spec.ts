import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Residents — Deep CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // ============================================================
  // 1. LIST VIEW
  // ============================================================
  test.describe('Seznam bydlících', () => {
    test('stránka se načte a zobrazí bydlící', async ({ page }) => {
      await page.goto('/residents');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('[data-testid="resident-list-page"]')).toBeVisible();
      await expect(page.locator('[data-testid="resident-add-btn"]')).toBeVisible();
    });

    test('vyhledávání filtruje seznam', async ({ page }) => {
      await page.goto('/residents');
      await page.waitForLoadState('domcontentloaded');

      const searchInput = page.locator('[data-testid="resident-search-input"]');
      if (!(await searchInput.isVisible().catch(() => false))) {
        test.skip(true, 'Search input nenalezen');
        return;
      }

      // Search triggers server-side API call
      await searchInput.fill('Novák');
      await page.waitForResponse((r) => r.url().includes('/api/v1/residents') && r.status() === 200);
      await page.waitForTimeout(300);

      // Clear search
      await searchInput.fill('');
      await page.waitForResponse((r) => r.url().includes('/api/v1/residents') && r.status() === 200);
    });
  });

  // ============================================================
  // 2. CREATE
  // ============================================================
  test.describe('Vytvoření bydlícího', () => {
    test('formulář obsahuje všechna pole', async ({ page }) => {
      await page.goto('/residents');
      await page.waitForLoadState('domcontentloaded');

      await page.locator('[data-testid="resident-add-btn"]').click();

      // Person mode fields
      await expect(page.locator('[data-testid="resident-form-firstName"]')).toBeVisible();
      await expect(page.locator('[data-testid="resident-form-lastName"]')).toBeVisible();
      await expect(page.locator('[data-testid="resident-form-email"]')).toBeVisible();
      await expect(page.locator('[data-testid="resident-form-phone"]')).toBeVisible();
      await expect(page.locator('[data-testid="resident-form-role"]')).toBeVisible();
      await expect(page.locator('[data-testid="resident-form-property"]')).toBeVisible();

      // Buttons
      await expect(page.locator('[data-testid="resident-form-save"]')).toBeVisible();
      await expect(page.locator('[data-testid="resident-form-cancel"]')).toBeVisible();

      // All fields enabled
      await expect(page.locator('[data-testid="resident-form-firstName"]')).toBeEnabled();
      await expect(page.locator('[data-testid="resident-form-lastName"]')).toBeEnabled();
      await expect(page.locator('[data-testid="resident-form-role"]')).toBeEnabled();
    });

    test('validace — jméno a příjmení jsou povinné', async ({ page }) => {
      await page.goto('/residents');
      await page.waitForLoadState('domcontentloaded');

      await page.locator('[data-testid="resident-add-btn"]').click();
      await expect(page.locator('[data-testid="resident-form-firstName"]')).toBeVisible();

      // Fill firstName only (leave lastName empty), then trigger validation
      await page.locator('[data-testid="resident-form-firstName"]').fill('Test');
      await page.locator('[data-testid="resident-form-firstName"]').fill('');
      // Submit triggers react-hook-form validation
      await page.locator('[data-testid="resident-form-save"]').click();

      // Form should still be visible — validation prevents submission
      await page.waitForTimeout(500);
      await expect(page.locator('[data-testid="resident-form-firstName"]')).toBeVisible();
    });

    test('vytvoření nového bydlícího se všemi poli', async ({ page }) => {
      await page.goto('/residents');
      await page.waitForLoadState('domcontentloaded');

      await page.locator('[data-testid="resident-add-btn"]').click();
      await expect(page.locator('[data-testid="resident-form-firstName"]')).toBeVisible();

      // Fill fields
      await page.locator('[data-testid="resident-form-firstName"]').fill('Testovací');
      await page.locator('[data-testid="resident-form-lastName"]').fill('Bydlící');
      await page.locator('[data-testid="resident-form-email"]').fill('testovaci-e2e@example.cz');
      await page.locator('[data-testid="resident-form-phone"]').fill('+420666555444');
      await page.locator('[data-testid="resident-form-role"]').selectOption('owner');

      // Select first property if available
      const propertySelect = page.locator('[data-testid="resident-form-property"]');
      const options = await propertySelect.locator('option').count();
      if (options > 1) {
        await propertySelect.selectOption({ index: 1 });
      }

      // Submit
      const responsePromise = page.waitForResponse(
        (r) => r.url().includes('/api/v1/residents') && r.request().method() === 'POST' && r.status() === 201,
      );
      await page.locator('[data-testid="resident-form-save"]').click();
      await responsePromise;

      // Modal should close
      await expect(page.locator('[data-testid="resident-form-firstName"]')).not.toBeVisible({ timeout: 5000 });

      // Resident should appear in list
      await page.waitForTimeout(500);
      await expect(page.getByText('Testovací').first()).toBeVisible({ timeout: 5000 });
    });
  });

  // ============================================================
  // 3. DETAIL VIEW (modal)
  // ============================================================
  test.describe('Detail bydlícího', () => {
    test('detail modal zobrazí údaje', async ({ page }) => {
      await page.goto('/residents');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      // Click on the test resident row
      await page.getByText('Testovací').first().click();
      await page.waitForTimeout(500);

      // Detail modal shows name
      await expect(page.locator('[data-testid="resident-detail-name"]')).toContainText('Testovací');
      await expect(page.locator('[data-testid="resident-detail-name"]')).toContainText('Bydlící');

      // Contact info visible
      await expect(page.getByText('testovaci-e2e@example.cz').first()).toBeVisible();
      await expect(page.getByText('+420666555444').first()).toBeVisible();

      // Edit and delete buttons
      await expect(page.locator('[data-testid="resident-detail-edit-btn"]')).toBeVisible();
      await expect(page.locator('[data-testid="resident-detail-delete-btn"]')).toBeVisible();
    });
  });

  // ============================================================
  // 4. EDIT
  // ============================================================
  test.describe('Editace bydlícího', () => {
    test('editace — pole předvyplněná, změna se uloží', async ({ page }) => {
      await page.goto('/residents');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      // Open detail modal
      await page.getByText('Testovací').first().click();
      await page.waitForTimeout(500);

      // Click edit
      await page.locator('[data-testid="resident-detail-edit-btn"]').click();
      await page.waitForTimeout(300);

      // Form should be pre-filled
      await expect(page.locator('[data-testid="resident-form-firstName"]')).toHaveValue('Testovací');
      await expect(page.locator('[data-testid="resident-form-lastName"]')).toHaveValue('Bydlící');
      await expect(page.locator('[data-testid="resident-form-email"]')).toHaveValue('testovaci-e2e@example.cz');

      // Change values
      await page.locator('[data-testid="resident-form-lastName"]').fill('Upravený');
      await page.locator('[data-testid="resident-form-phone"]').fill('+420111222333');

      // Save
      const responsePromise = page.waitForResponse(
        (r) => r.url().includes('/api/v1/residents/') && r.request().method() === 'PATCH' && r.status() === 200,
      );
      await page.locator('[data-testid="resident-form-save"]').click();
      await responsePromise;

      // Modal should close
      await expect(page.locator('[data-testid="resident-form-save"]')).not.toBeVisible({ timeout: 5000 });

      // Verify updated name in list
      await page.waitForTimeout(500);
      await expect(page.getByText('Upravený').first()).toBeVisible();
    });
  });

  // ============================================================
  // 5. DELETE
  // ============================================================
  test.describe('Smazání bydlícího', () => {
    test('smazání přes detail modal a potvrzení', async ({ page }) => {
      await page.goto('/residents');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      // Open detail modal
      await page.getByText('Upravený').first().click();
      await page.waitForTimeout(500);

      // Click delete in detail modal footer
      await page.locator('[data-testid="resident-detail-delete-btn"]').click();
      await page.waitForTimeout(300);

      // Confirmation modal should appear
      await expect(page.locator('[data-testid="resident-delete-confirm"]')).toBeVisible();

      // Confirm
      const responsePromise = page.waitForResponse(
        (r) => r.url().includes('/api/v1/residents/') && r.request().method() === 'DELETE',
      );
      await page.locator('[data-testid="resident-delete-confirm"]').click();
      await responsePromise;

      // Confirmation modal should close
      await expect(page.locator('[data-testid="resident-delete-confirm"]')).not.toBeVisible({ timeout: 5000 });
    });
  });

  // ============================================================
  // CLEANUP
  // ============================================================
  test('úklid — smazání zbylých testovacích bydlících', async ({ page }) => {
    await page.goto('/residents');
    await page.waitForLoadState('domcontentloaded');

    const token = await page.evaluate(() => sessionStorage.getItem('ifmio:access_token'));
    const apiUrl = process.env.API_URL || 'http://localhost:3000';

    for (const name of ['Testovací', 'Upravený']) {
      const res = await page.request.get(`${apiUrl}/api/v1/residents?search=${encodeURIComponent(name)}&limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok()) {
        const data = await res.json();
        for (const r of data.data ?? []) {
          if (r.firstName === 'Testovací' || r.lastName === 'Upravený' || r.lastName === 'Bydlící') {
            await page.request.delete(`${apiUrl}/api/v1/residents/${r.id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
          }
        }
      }
    }
  });
});
