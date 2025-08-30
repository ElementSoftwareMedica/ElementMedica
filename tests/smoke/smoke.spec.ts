import { test, expect } from '@playwright/test';

test.describe('Smoke Tests - Critical Functionality', () => {
  test('application loads and basic navigation works', async ({ page }) => {
    // Test 1: Application loads
    await page.goto('/');
    await expect(page.locator('form')).toBeVisible();
    await expect(page).toHaveTitle(/Document Management/);
    
    // Test 2: Login functionality
    await page.fill('input[name="identifier"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    
    // Test 3: Navigation works
    await page.click('[data-testid="nav-documents"]');
    await expect(page).toHaveURL('/documents');
    await expect(page.locator('[data-testid="documents-list"]')).toBeVisible();
    
    await page.click('[data-testid="nav-dashboard"]');
    await expect(page).toHaveURL('/dashboard');
    
    // Test 4: Logout works
    await page.click('[data-testid="profile-menu"]');
    await page.click('[data-testid="logout"]');
    await expect(page).toHaveURL('/');
  });

  test('document upload and basic operations work', async ({ page }) => {
    // Login
    await page.goto('/');
    await page.fill('input[name="identifier"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Navigate to documents
    await page.goto('/documents');
    
    // Test 1: Upload modal opens
    await page.click('[data-testid="upload-button"]');
    await expect(page.locator('[data-testid="upload-modal"]')).toBeVisible();
    
    // Test 2: Form validation works
    await page.click('[data-testid="upload-submit"]');
    await expect(page.locator('[role="alert"]')).toBeVisible();
    
    // Test 3: Close modal
    await page.click('[data-testid="upload-close"]');
    await expect(page.locator('[data-testid="upload-modal"]')).not.toBeVisible();
    
    // Test 4: Search functionality
    await page.fill('[data-testid="search-input"]', 'test');
    await page.click('[data-testid="search-button"]');
    // Should not crash
    await expect(page.locator('[data-testid="documents-list"]')).toBeVisible();
  });

  test('user profile and settings are accessible', async ({ page }) => {
    // Login
    await page.goto('/');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Test 1: Profile menu opens
    await page.click('[data-testid="profile-menu"]');
    await expect(page.locator('[data-testid="profile-dropdown"]')).toBeVisible();
    
    // Test 2: Settings page loads
    await page.click('[data-testid="profile-settings"]');
    await expect(page).toHaveURL('/settings');
    await expect(page.locator('[data-testid="settings-form"]')).toBeVisible();
    
    // Test 3: Profile information is displayed
    await expect(page.locator('[data-testid="profile-email"]')).toBeVisible();
    await expect(page.locator('[data-testid="profile-name"]')).toBeVisible();
  });

  test('error handling works correctly', async ({ page }) => {
    // Test 1: Invalid login
    await page.goto('/');
    await page.fill('input[name="identifier"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('[role="alert"]')).toBeVisible();
    await expect(page).toHaveURL('/');
    
    // Test 2: Network error simulation
    await page.route('**/api/**', route => route.abort());
    
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('[role="alert"]')).toBeVisible();
    
    // Restore network
    await page.unroute('**/api/**');
  });

  test('responsive design works on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Test 1: Login on mobile
    await page.goto('/');
    await expect(page.locator('form')).toBeVisible();
    
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/dashboard');
    
    // Test 2: Mobile navigation
    await expect(page.locator('[data-testid="mobile-menu-toggle"]')).toBeVisible();
    
    await page.click('[data-testid="mobile-menu-toggle"]');
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    
    // Test 3: Navigate to documents on mobile
    await page.click('[data-testid="mobile-nav-documents"]');
    await expect(page).toHaveURL('/documents');
    await expect(page.locator('[data-testid="documents-list"]')).toBeVisible();
  });

  test('admin functionality is accessible', async ({ page }) => {
    // Login as admin
    await page.goto('/');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Test 1: Admin menu is visible
    await expect(page.locator('[data-testid="admin-menu"]')).toBeVisible();
    
    // Test 2: User management page loads
    await page.click('[data-testid="admin-users"]');
    await expect(page).toHaveURL('/admin/users');
    await expect(page.locator('[data-testid="users-table"]')).toBeVisible();
    
    // Test 3: System settings page loads
    await page.click('[data-testid="admin-settings"]');
    await expect(page).toHaveURL('/admin/settings');
    await expect(page.locator('[data-testid="settings-form"]')).toBeVisible();
    
    // Test 4: Monitoring page loads
    await page.click('[data-testid="admin-monitoring"]');
    await expect(page).toHaveURL('/admin/monitoring');
    await expect(page.locator('[data-testid="system-status"]')).toBeVisible();
  });

  test('api endpoints respond correctly', async ({ page }) => {
    // Login to get auth token
    await page.goto('/');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Test API endpoints
    const apiTests = [
      { endpoint: '/api/auth/me', expectedStatus: 200 },
      { endpoint: '/api/documents', expectedStatus: 200 },
      { endpoint: '/api/users', expectedStatus: 200 },
      { endpoint: '/api/system/health', expectedStatus: 200 }
    ];
    
    for (const test of apiTests) {
      const response = await page.evaluate(async (endpoint) => {
        const res = await fetch(endpoint, {
          credentials: 'include'
        });
        return res.status;
      }, test.endpoint);
      
      expect(response).toBe(test.expectedStatus);
    }
  });

  test('database connectivity works', async ({ page }) => {
    // Test through health check endpoint
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/system/health');
      return await res.json();
    });
    
    expect(response.database).toBe('connected');
    expect(response.status).toBe('healthy');
  });

  test('file storage is accessible', async ({ page }) => {
    // Login
    await page.goto('/');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Test storage health
    const storageHealth = await page.evaluate(async () => {
      const res = await fetch('/api/system/storage', {
        credentials: 'include'
      });
      return await res.json();
    });
    
    expect(storageHealth.status).toBe('available');
    expect(storageHealth.freeSpace).toBeGreaterThan(0);
  });

  test('security headers are present', async ({ page }) => {
    const response = await page.goto('/');
    const headers = response?.headers();
    
    // Check for security headers
    expect(headers?.['x-frame-options']).toBeTruthy();
    expect(headers?.['x-content-type-options']).toBe('nosniff');
    expect(headers?.['x-xss-protection']).toBeTruthy();
    expect(headers?.['strict-transport-security']).toBeTruthy();
  });

  test('session management works', async ({ page }) => {
    // Login
    await page.goto('/');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/dashboard');
    
    // Test session persistence
    await page.reload();
    await expect(page).toHaveURL('/dashboard');
    
    // Test session expiration handling
    await page.evaluate(() => {
      // Clear session storage
      sessionStorage.clear();
      localStorage.clear();
    });
    
    await page.goto('/documents');
    // Should redirect to login
    await expect(page).toHaveURL('/');
  });

  test('basic performance benchmarks', async ({ page }) => {
    const startTime = Date.now();
    
    // Test page load time
    await page.goto('/');
    const loginLoadTime = Date.now() - startTime;
    expect(loginLoadTime).toBeLessThan(3000); // Should load within 3 seconds
    
    // Test login performance
    const loginStart = Date.now();
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
    const loginTime = Date.now() - loginStart;
    expect(loginTime).toBeLessThan(5000); // Login should complete within 5 seconds
    
    // Test navigation performance
    const navStart = Date.now();
    await page.click('[data-testid="nav-documents"]');
    await expect(page.locator('[data-testid="documents-list"]')).toBeVisible();
    const navTime = Date.now() - navStart;
    expect(navTime).toBeLessThan(2000); // Navigation should be fast
  });

  test('critical user flows work end-to-end', async ({ page }) => {
    // Complete user journey in minimal steps
    
    // 1. Login
    await page.goto('/');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
    
    // 2. Navigate to documents
    await page.click('[data-testid="nav-documents"]');
    await expect(page.locator('[data-testid="documents-list"]')).toBeVisible();
    
    // 3. Open upload modal
    await page.click('[data-testid="upload-button"]');
    await expect(page.locator('[data-testid="upload-modal"]')).toBeVisible();
    
    // 4. Close modal
    await page.click('[data-testid="upload-close"]');
    await expect(page.locator('[data-testid="upload-modal"]')).not.toBeVisible();
    
    // 5. Search documents
    await page.fill('[data-testid="search-input"]', 'test');
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('[data-testid="documents-list"]')).toBeVisible();
    
    // 6. Access settings
    await page.click('[data-testid="profile-menu"]');
    await page.click('[data-testid="profile-settings"]');
    await expect(page).toHaveURL('/settings');
    
    // 7. Logout
    await page.click('[data-testid="profile-menu"]');
    await page.click('[data-testid="logout"]');
    await expect(page).toHaveURL('/');
    
    // All critical flows completed successfully
  });
});