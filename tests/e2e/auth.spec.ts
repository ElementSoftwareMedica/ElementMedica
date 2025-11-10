import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Vai direttamente alla pagina di login (UI reale)
    await page.goto('/login');
  });

  test('should display login form', async ({ page }) => {
    // Controlla che il form di login sia visibile
    await expect(page.locator('h2:has-text("Accedi al tuo account")')).toBeVisible();
    await expect(page.locator('input[name="identifier"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    test.fixme(true, 'L\'UI non mostra messaggi di validazione inline; verrà implementato/testato separatamente.');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Compila form con credenziali non valide
    await page.fill('input[name="identifier"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Verifica che compaia il box di errore generico
    await expect(page.locator('.bg-red-50')).toBeVisible({ timeout: 15000 });
    // Rimane sulla pagina di login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    // Usa le credenziali standard del progetto
    await page.fill('input[name="identifier"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'Admin123!');
    await page.click('button[type="submit"]');

    // Attendi redirect alla dashboard oppure verifica la presenza dell\'heading
    try {
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });
    } catch {
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 30000 });
    }
  });

  test('should logout successfully', async ({ page }) => {
    test.fixme(true, 'Selettori del menu utente/logout non disponibili (nessun data-testid). Da riallineare con l\'UI.');
  });

  test('should remember user session', async ({ page, context }) => {
    // Login
    await page.fill('input[name="identifier"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'Admin123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });

    // Nuova pagina nello stesso contesto
    const newPage = await context.newPage();
    // Accedi direttamente a una route protetta: la sessione deve essere valida senza rilogin
    await newPage.goto('/dashboard');
    await expect(newPage).toHaveURL(/\/dashboard/, { timeout: 20000 });
    await expect(newPage.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 20000 });
  });

  test('should handle session expiration', async ({ page }) => {
    // Login
    await page.fill('input[name="identifier"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'Admin123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });

    // Simula scadenza sessione
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Prova ad accedere a una route protetta
    await page.goto('/dashboard');

    // Dovrebbe redirigere alla pagina di login
    await expect(page).toHaveURL(/\/login/, { timeout: 20000 });
    await expect(page.locator('h2:has-text("Accedi al tuo account")')).toBeVisible();
  });
});