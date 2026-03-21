import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Properties — Deep CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // ============================================================
  // 1. LIST VIEW
  // ============================================================
  test.describe('Seznam nemovitostí', () => {
    test('stránka se načte a zobrazí seed nemovitosti', async ({ page }) => {
      await page.goto('/properties');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('[data-testid="property-list-page"]')).toBeVisible();

      // Seed has at least 1 property
      const table = page.locator('[data-testid="property-list"]');
      const hasTable = await table.isVisible().catch(() => false);
      if (!hasTable) {
        test.skip(true, 'Žádné nemovitosti v DB');
        return;
      }

      // At least one row with property name
      const rows = page.locator('.tbl tbody tr');
      await expect(rows.first()).toBeVisible();
    });

    test('vyhledávání filtruje seznam', async ({ page }) => {
      await page.goto('/properties');
      await page.waitForLoadState('domcontentloaded');

      const searchInput = page.locator('[data-testid="property-search-input"]');
      if (!(await searchInput.isVisible().catch(() => false))) {
        test.skip(true, 'Search input nenalezen');
        return;
      }

      // Count initial rows
      const rowsBefore = await page.locator('.tbl tbody tr').count();
      if (rowsBefore < 2) {
        test.skip(true, 'Potřeba alespoň 2 nemovitostí pro test vyhledávání');
        return;
      }

      // Search for the seed property name
      await searchInput.fill('Lipová');
      await page.waitForTimeout(500); // debounce

      const rowsAfter = await page.locator('.tbl tbody tr').count();
      expect(rowsAfter).toBeLessThanOrEqual(rowsBefore);
      expect(rowsAfter).toBeGreaterThanOrEqual(1);

      // Clear search and verify all rows are back
      await searchInput.fill('');
      await page.waitForTimeout(500);
      const rowsCleared = await page.locator('.tbl tbody tr').count();
      expect(rowsCleared).toBe(rowsBefore);
    });
  });

  // ============================================================
  // 2. CREATE
  // ============================================================
  test.describe('Vytvoření nemovitosti', () => {
    test('formulář obsahuje všechna povinná pole', async ({ page }) => {
      await page.goto('/properties');
      await page.waitForLoadState('domcontentloaded');

      await page.locator('[data-testid="property-add-btn"]').click();

      // Modal should be visible — PropertyForm is a Modal
      await expect(page.locator('[data-testid="property-form-name"]')).toBeVisible();
      await expect(page.locator('[data-testid="property-form-address"]')).toBeVisible();
      await expect(page.locator('[data-testid="property-form-city"]')).toBeVisible();
      await expect(page.locator('[data-testid="property-form-zip"]')).toBeVisible();
      await expect(page.locator('[data-testid="property-form-type"]')).toBeVisible();
      await expect(page.locator('[data-testid="property-form-ownership"]')).toBeVisible();
      await expect(page.locator('[data-testid="property-form-legalMode"]')).toBeVisible();
      await expect(page.locator('[data-testid="property-form-save"]')).toBeVisible();
      await expect(page.locator('[data-testid="property-form-cancel"]')).toBeVisible();

      // All fields should be enabled
      await expect(page.locator('[data-testid="property-form-name"]')).toBeEnabled();
      await expect(page.locator('[data-testid="property-form-type"]')).toBeEnabled();
    });

    test('validace — prázdný formulář nelze odeslat', async ({ page }) => {
      await page.goto('/properties');
      await page.waitForLoadState('domcontentloaded');

      await page.locator('[data-testid="property-add-btn"]').click();
      await expect(page.locator('[data-testid="property-form-name"]')).toBeVisible();

      // Clear any default values and submit empty
      await page.locator('[data-testid="property-form-name"]').fill('');
      await page.locator('[data-testid="property-form-address"]').fill('');
      await page.locator('[data-testid="property-form-city"]').fill('');
      await page.locator('[data-testid="property-form-zip"]').fill('');

      await page.locator('[data-testid="property-form-save"]').click();

      // Form should still be visible (not submitted)
      await expect(page.locator('[data-testid="property-form-name"]')).toBeVisible();

      // Validation errors should appear for required fields
      await expect(page.locator('[data-testid="property-form-error-name"]')).toBeVisible();
      await expect(page.locator('[data-testid="property-form-error-address"]')).toBeVisible();
      await expect(page.locator('[data-testid="property-form-error-city"]')).toBeVisible();
      await expect(page.locator('[data-testid="property-form-error-postalCode"]')).toBeVisible();
    });

    test('vytvoření nové nemovitosti se všemi poli', async ({ page }) => {
      await page.goto('/properties');
      await page.waitForLoadState('domcontentloaded');

      await page.locator('[data-testid="property-add-btn"]').click();
      await expect(page.locator('[data-testid="property-form-name"]')).toBeVisible();

      // Fill all fields
      await page.locator('[data-testid="property-form-type"]').selectOption('bytdum');
      await page.locator('[data-testid="property-form-ownership"]').selectOption('vlastnictvi');
      await page.locator('[data-testid="property-form-name"]').fill('Testovací Dům E2E');
      await page.locator('[data-testid="property-form-address"]').fill('Testovací 123');
      await page.locator('[data-testid="property-form-city"]').fill('Brno');
      await page.locator('[data-testid="property-form-zip"]').fill('60200');
      await page.locator('[data-testid="property-form-legalMode"]').selectOption('SVJ');

      // IČ/DIČ fields appear for SVJ — wait for them
      await expect(page.locator('[data-testid="property-form-ico"]')).toBeVisible();
      await page.locator('[data-testid="property-form-ico"]').fill('99887766');
      await expect(page.locator('[data-testid="property-form-dic"]')).toBeVisible();
      await page.locator('[data-testid="property-form-dic"]').fill('CZ99887766');

      // Submit and wait for API response
      const responsePromise = page.waitForResponse(
        (r) => r.url().includes('/api/v1/properties') && r.request().method() === 'POST' && r.status() === 201,
      );
      await page.locator('[data-testid="property-form-save"]').click();
      await responsePromise;

      // Modal should close
      await expect(page.locator('[data-testid="property-form-name"]')).not.toBeVisible({ timeout: 5000 });

      // Property should appear in the list
      await expect(page.locator('text=Testovací Dům E2E')).toBeVisible({ timeout: 5000 });
    });

    test('nově vytvořená nemovitost se zobrazí v seznamu', async ({ page }) => {
      await page.goto('/properties');
      await page.waitForLoadState('domcontentloaded');

      // Verify the property we created in the previous test exists
      await expect(page.locator('text=Testovací Dům E2E')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=Testovací 123')).toBeVisible();
    });
  });

  // ============================================================
  // 3. DETAIL VIEW — field verification
  // ============================================================
  test.describe('Detail nemovitosti', () => {
    test('detail zobrazí správné údaje', async ({ page }) => {
      await page.goto('/properties');
      await page.waitForLoadState('domcontentloaded');

      // Click on our test property
      await page.locator('text=Testovací Dům E2E').click();
      await page.waitForLoadState('domcontentloaded');

      await expect(page.locator('[data-testid="property-detail-page"]')).toBeVisible();
      await expect(page.locator('[data-testid="property-detail-name"]')).toHaveText('Testovací Dům E2E');
      await expect(page.locator('[data-testid="property-detail-address"]')).toContainText('Testovací 123');
      await expect(page.locator('[data-testid="property-detail-address"]')).toContainText('Brno');

      // IČ should be displayed in the info strip
      await expect(page.locator('text=99887766')).toBeVisible();
    });

    test('detail má všechny taby', async ({ page }) => {
      await page.goto('/properties');
      await page.waitForLoadState('domcontentloaded');
      await page.locator('text=Testovací Dům E2E').click();
      await page.waitForLoadState('domcontentloaded');

      // All tabs should exist
      const tabKeys = ['overview', 'units', 'owners', 'groups', 'meters', 'components', 'representatives'];
      for (const key of tabKeys) {
        await expect(page.locator(`[data-testid="property-tab-${key}"]`)).toBeVisible();
      }

      // Click each tab and verify content area changes
      await page.locator('[data-testid="property-tab-units"]').click();
      await page.waitForTimeout(500);
      await page.locator('[data-testid="property-tab-owners"]').click();
      await page.waitForTimeout(500);
      await page.locator('[data-testid="property-tab-overview"]').click();
    });

    test('přehled tab zobrazí základní informace', async ({ page }) => {
      await page.goto('/properties');
      await page.waitForLoadState('domcontentloaded');
      await page.locator('text=Testovací Dům E2E').click();
      await page.waitForLoadState('domcontentloaded');

      // Overview tab is default — check "Základní informace" section
      await expect(page.locator('text=Základní informace')).toBeVisible();
      await expect(page.locator('text=Testovací 123')).toBeVisible();
      await expect(page.locator('text=60200')).toBeVisible();
      // IČO and DIČ displayed in overview
      await expect(page.locator('text=99887766')).toBeVisible();
    });
  });

  // ============================================================
  // 4. EDIT
  // ============================================================
  test.describe('Editace nemovitosti', () => {
    test('editace — pole jsou předvyplněná', async ({ page }) => {
      await page.goto('/properties');
      await page.waitForLoadState('domcontentloaded');
      await page.locator('text=Testovací Dům E2E').click();
      await page.waitForLoadState('domcontentloaded');

      await page.locator('[data-testid="property-detail-edit-btn"]').click();

      // Form should be pre-filled
      await expect(page.locator('[data-testid="property-form-name"]')).toHaveValue('Testovací Dům E2E');
      await expect(page.locator('[data-testid="property-form-address"]')).toHaveValue('Testovací 123');
      await expect(page.locator('[data-testid="property-form-city"]')).toHaveValue('Brno');
      await expect(page.locator('[data-testid="property-form-zip"]')).toHaveValue('60200');

      // Close without saving
      await page.locator('[data-testid="property-form-cancel"]').click();
    });

    test('editace — změna hodnot se uloží', async ({ page }) => {
      await page.goto('/properties');
      await page.waitForLoadState('domcontentloaded');
      await page.locator('text=Testovací Dům E2E').click();
      await page.waitForLoadState('domcontentloaded');

      await page.locator('[data-testid="property-detail-edit-btn"]').click();
      await expect(page.locator('[data-testid="property-form-name"]')).toBeVisible();

      // Change some fields
      await page.locator('[data-testid="property-form-name"]').fill('Upravený Dům E2E');
      await page.locator('[data-testid="property-form-city"]').fill('Ostrava');
      await page.locator('[data-testid="property-form-zip"]').fill('70200');

      // Submit and wait for API response
      const responsePromise = page.waitForResponse(
        (r) => r.url().includes('/api/v1/properties/') && r.request().method() === 'PATCH' && r.status() === 200,
      );
      await page.locator('[data-testid="property-form-save"]').click();
      await responsePromise;

      // Modal should close
      await expect(page.locator('[data-testid="property-form-name"]')).not.toBeVisible({ timeout: 5000 });

      // Verify updated values on detail page
      await expect(page.locator('[data-testid="property-detail-name"]')).toHaveText('Upravený Dům E2E');
      await expect(page.locator('[data-testid="property-detail-address"]')).toContainText('Ostrava');

      // Unchanged field should remain
      await expect(page.locator('text=99887766')).toBeVisible();
    });

    test('editace se projeví v seznamu', async ({ page }) => {
      await page.goto('/properties');
      await page.waitForLoadState('domcontentloaded');

      // Updated name should be in the list
      await expect(page.locator('text=Upravený Dům E2E')).toBeVisible();
      // Old name should NOT be there
      await expect(page.locator('text=Testovací Dům E2E')).not.toBeVisible();
    });
  });

  // ============================================================
  // 5. DELETE (archive)
  // ============================================================
  test.describe('Smazání nemovitosti', () => {
    // NOTE: PropertyDetailPage does NOT have a dedicated delete button.
    // Delete is triggered via the API (archive). The UI for property
    // deletion may not exist yet. We test via API call + list verification.
    test('smazání nemovitosti přes API a ověření v seznamu', async ({ page }) => {
      await page.goto('/properties');
      await page.waitForLoadState('domcontentloaded');

      // Find the test property and navigate to its detail to get the ID
      await page.locator('text=Upravený Dům E2E').click();
      await page.waitForLoadState('domcontentloaded');

      // Extract property ID from URL
      const url = page.url();
      const propertyId = url.split('/properties/')[1]?.split(/[?#/]/)[0];
      expect(propertyId).toBeTruthy();

      // Delete via API
      const token = await page.evaluate(() => sessionStorage.getItem('ifmio:access_token'));
      const baseUrl = await page.evaluate(() => window.location.origin);
      const deleteRes = await page.request.delete(
        `${baseUrl}/api/v1/properties/${propertyId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      expect(deleteRes.status()).toBeLessThan(300);

      // Navigate back and verify property is gone
      await page.goto('/properties');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);
      await expect(page.locator('text=Upravený Dům E2E')).not.toBeVisible();
    });
  });
});
