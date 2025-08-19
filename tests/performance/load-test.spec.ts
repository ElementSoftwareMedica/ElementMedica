import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login before performance tests
    await page.goto('/');
    await page.fill('input[name="identifier"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('dashboard should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Dashboard should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    // Check if main elements are visible
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="stats-cards"]')).toBeVisible();
  });

  test('documents list should load quickly', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/documents');
    await page.waitForSelector('[data-testid="documents-list"]');
    
    const loadTime = Date.now() - startTime;
    
    // Documents list should load within 2 seconds
    expect(loadTime).toBeLessThan(2000);
    
    // Check if pagination is working efficiently
    const paginationStart = Date.now();
    await page.click('[data-testid="next-page"]');
    await page.waitForSelector('[data-testid="documents-list"]');
    const paginationTime = Date.now() - paginationStart;
    
    // Pagination should be fast (under 1 second)
    expect(paginationTime).toBeLessThan(1000);
  });

  test('search should respond quickly', async ({ page }) => {
    await page.goto('/documents');
    
    const searchInput = page.locator('[data-testid="search-input"]');
    
    const startTime = Date.now();
    await searchInput.fill('test document');
    
    // Wait for search results to appear
    await page.waitForFunction(() => {
      const results = document.querySelector('[data-testid="search-results"]');
      return results && results.children.length > 0;
    }, { timeout: 5000 });
    
    const searchTime = Date.now() - startTime;
    
    // Search should complete within 1 second
    expect(searchTime).toBeLessThan(1000);
  });

  test('file upload should handle large files efficiently', async ({ page }) => {
    await page.goto('/documents');
    
    // Click upload button
    await page.click('[data-testid="upload-button"]');
    await expect(page.locator('[data-testid="upload-modal"]')).toBeVisible();
    
    // Simulate large file upload (we'll use a smaller file for testing)
    const testFile = 'tests/fixtures/test-document.pdf';
    
    const startTime = Date.now();
    
    await page.setInputFiles('[data-testid="file-input"]', testFile);
    await page.fill('[data-testid="document-title"]', 'Performance Test Document');
    await page.click('[data-testid="upload-submit"]');
    
    // Wait for upload completion
    await expect(page.locator('text=Documento caricato con successo')).toBeVisible({ timeout: 10000 });
    
    const uploadTime = Date.now() - startTime;
    
    // Upload should complete within 10 seconds for test file
    expect(uploadTime).toBeLessThan(10000);
  });

  test('concurrent user actions should not degrade performance', async ({ browser }) => {
    // Create multiple browser contexts to simulate concurrent users
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext()
    ]);
    
    const pages = await Promise.all(
      contexts.map(context => context.newPage())
    );
    
    // Login all users concurrently
    await Promise.all(pages.map(async (page) => {
      await page.goto('/');
      await page.fill('input[type="email"]', 'admin@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard');
    }));
    
    // Perform concurrent actions
    const startTime = Date.now();
    
    await Promise.all([
      // User 1: Navigate to documents
      pages[0].goto('/documents'),
      // User 2: Navigate to users
      pages[1].goto('/users'),
      // User 3: Navigate to settings
      pages[2].goto('/settings')
    ]);
    
    // Wait for all pages to load
    await Promise.all([
      pages[0].waitForSelector('[data-testid="documents-list"]'),
      pages[1].waitForSelector('[data-testid="users-list"]'),
      pages[2].waitForSelector('[data-testid="settings-form"]')
    ]);
    
    const concurrentTime = Date.now() - startTime;
    
    // Concurrent actions should complete within 5 seconds
    expect(concurrentTime).toBeLessThan(5000);
    
    // Clean up
    await Promise.all(contexts.map(context => context.close()));
  });

  test('memory usage should remain stable during navigation', async ({ page }) => {
    // Navigate through different pages multiple times
    const pages = ['/dashboard', '/documents', '/users', '/settings'];
    
    for (let i = 0; i < 3; i++) {
      for (const pagePath of pages) {
        await page.goto(pagePath);
        await page.waitForLoadState('networkidle');
        
        // Check if page is responsive
        const startTime = Date.now();
        await page.click('body');
        const responseTime = Date.now() - startTime;
        
        // Page should remain responsive (under 100ms for simple click)
        expect(responseTime).toBeLessThan(100);
      }
    }
  });

  test('API response times should be acceptable', async ({ page }) => {
    // Monitor network requests
    const apiCalls: { url: string; duration: number }[] = [];
    
    page.on('response', async (response) => {
      if (response.url().includes('/api/')) {
        const timing = response.request().timing();
        
        apiCalls.push({
          url: response.url(),
          duration: timing.responseEnd - timing.requestStart
        });
      }
    });
    
    // Navigate to documents page (triggers API calls)
    await page.goto('/documents');
    await page.waitForLoadState('networkidle');
    
    // Perform search (triggers search API)
    await page.fill('[data-testid="search-input"]', 'test');
    await page.waitForTimeout(1000); // Wait for debounced search
    
    // Check API response times
    for (const apiCall of apiCalls) {
      // API calls should complete within 2 seconds
      expect(apiCall.duration).toBeLessThan(2000);
      
      console.log(`API ${apiCall.url}: ${apiCall.duration}ms`);
    }
    
    // Should have made some API calls
    expect(apiCalls.length).toBeGreaterThan(0);
  });

  test('large dataset rendering should be performant', async ({ page }) => {
    // Navigate to a page with large dataset
    await page.goto('/documents');
    
    // Set a large page size to test rendering performance
    await page.selectOption('[data-testid="page-size-select"]', '100');
    
    const startTime = Date.now();
    await page.waitForSelector('[data-testid="documents-list"]');
    
    // Count rendered items
    const itemCount = await page.locator('[data-testid="document-item"]').count();
    const renderTime = Date.now() - startTime;
    
    // Should render many items quickly
    expect(itemCount).toBeGreaterThan(50);
    expect(renderTime).toBeLessThan(3000);
    
    // Test scrolling performance
    const scrollStart = Date.now();
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(100);
    const scrollTime = Date.now() - scrollStart;
    
    // Scrolling should be smooth (under 200ms)
    expect(scrollTime).toBeLessThan(200);
  });

  test('form interactions should be responsive', async ({ page }) => {
    await page.goto('/documents');
    await page.click('[data-testid="upload-button"]');
    
    // Test form field responsiveness
    const fields = [
      '[data-testid="document-title"]',
      '[data-testid="document-description"]'
    ];
    
    for (const field of fields) {
      const startTime = Date.now();
      await page.fill(field, 'Test input');
      const inputTime = Date.now() - startTime;
      
      // Form inputs should be responsive (under 50ms)
      expect(inputTime).toBeLessThan(50);
    }
    
    // Test form validation responsiveness
    const validationStart = Date.now();
    await page.fill('[data-testid="document-title"]', '');
    await page.click('[data-testid="upload-submit"]');
    
    await expect(page.locator('text=Titolo è richiesto')).toBeVisible();
    const validationTime = Date.now() - validationStart;
    
    // Validation should appear quickly (under 100ms)
    expect(validationTime).toBeLessThan(100);
  });
});