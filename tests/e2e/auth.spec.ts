import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('should display login form', async ({ page }) => {
    // Check if login form is visible
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    await expect(page.locator('input[name="identifier"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Check for validation messages
    await expect(page.locator('text=Email è richiesta')).toBeVisible();
    await expect(page.locator('text=Password è richiesta')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Fill form with invalid credentials
    await page.fill('input[name="identifier"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Check for error message
    await expect(page.locator('text=Credenziali non valide')).toBeVisible();
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    // Fill form with valid credentials
    await page.fill('input[name="identifier"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await page.waitForURL('/dashboard');
    
    // Check if dashboard is loaded
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    await expect(page.locator('text=Benvenuto')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.fill('input[name="identifier"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    
    // Click logout button
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    
    // Should redirect to login
    await page.waitForURL('/');
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
  });

  test('should remember user session', async ({ page, context }) => {
    // Login
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    
    // Create new page in same context
    const newPage = await context.newPage();
    await newPage.goto('/');
    
    // Should automatically redirect to dashboard
    await newPage.waitForURL('/dashboard');
    await expect(newPage.locator('[data-testid="dashboard"]')).toBeVisible();
  });

  test('should handle session expiration', async ({ page }) => {
    // Login
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    
    // Simulate session expiration by clearing storage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Try to navigate to protected route
    await page.goto('/users');
    
    // Should redirect to login
    await page.waitForURL('/');
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
  });
});