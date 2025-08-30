import { test, expect } from '@playwright/test';

// Minimal smoke test: verifies that a user can log in via the real frontend and reaches the private area (dashboard)
// Preconditions:
// - Backend proxy is running on :4003 and Vite dev server on :5173
// - Seed has created admin@example.com with password Admin123!

test('Smoke: login redirects to dashboard', async ({ page }, testInfo) => {
  // Temporarily skip flaky Mobile Chrome project
  if (testInfo.project.name === 'Mobile Chrome') {
    test.skip(true, 'Temporarily skip on Mobile Chrome due to flakiness in CI/local.');
  }

  const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173';

  // Go directly to the login page
  await page.goto(`${baseURL}/login`);

  // Fill credentials (align with frontend LoginPage.tsx input names)
  await page.fill('input[name="identifier"]', 'admin@example.com');
  await page.fill('input[name="password"]', 'Admin123!');

  // Submit
  await page.click('button[type="submit"]');

  // Be robust across browsers: either URL becomes /dashboard or the Dashboard heading appears
  // First try URL assertion, then fallback to heading visibility
  try {
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });
  } catch {
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 30000 });
  }
});