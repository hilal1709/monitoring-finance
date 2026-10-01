import { test, expect } from '@playwright/test';

test('Export trends page loads and displays charts', async ({ page }) => {
    // Navigate to the specific export trends page
    await page.goto('/ekspor/tren-ekspor');

    // Verify the page title to ensure Next.js has loaded
    await expect(page).toHaveTitle(/Commercial Finance 2/i);

    // Check if essential UI elements are rendered
    await expect(page.getByText('Tren Nilai Ekspor Bulanan', { exact: false }).first()).toBeVisible({ timeout: 10000 });
});
