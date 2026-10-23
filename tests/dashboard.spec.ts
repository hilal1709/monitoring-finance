import { test, expect } from '@playwright/test';

test('Export trends page loads and displays charts', async ({ page }) => {
    // Navigate to the specific export trends page
    await page.goto('/ekspor/tren-ekspor');

    // Verify the page title to ensure Next.js has loaded
    await expect(page).toHaveTitle(/Commercial Finance 2/i);

    // Check if essential UI elements are rendered
    await expect(page.getByText('Tren Nilai Ekspor Bulanan', { exact: false }).first()).toBeVisible({ timeout: 10000 });
});

// Edit mode end to end, without saving (saving writes the shared layout to Postgres).
test('Dashboard edit mode opens the widget editor and cancels cleanly', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('dashboard-canvas-tour-v1', 'done'));
    await page.goto('/ekspor');

    await page.getByRole('button', { name: 'Atur Dashboard' }).click();
    await expect(page.getByRole('toolbar', { name: 'Alat mengatur dashboard' })).toBeVisible({ timeout: 20000 });

    // Hide a widget, then undo it.
    const editButtons = page.getByRole('button', { name: 'Ubah', exact: true });
    const count = await editButtons.count();
    await page.getByRole('button', { name: 'Sembunyikan' }).first().click();
    await expect(editButtons).toHaveCount(count - 1);
    await page.getByRole('button', { name: 'Urungkan' }).click();
    await expect(editButtons).toHaveCount(count);

    // The editor shows the three steps and a live preview.
    await editButtons.first().click();
    const editor = page.getByRole('dialog');
    await expect(editor.getByText('Pilih data', { exact: true })).toBeVisible({ timeout: 20000 });
    await expect(editor.getByText('Pratinjau', { exact: true })).toBeVisible();
    await editor.getByRole('button', { name: 'Batal' }).click();
    await expect(editor).toBeHidden();

    await page.getByRole('toolbar', { name: 'Alat mengatur dashboard' }).getByRole('button', { name: 'Batal' }).click();
    await expect(page.getByRole('button', { name: 'Atur Dashboard' })).toBeVisible();
});
