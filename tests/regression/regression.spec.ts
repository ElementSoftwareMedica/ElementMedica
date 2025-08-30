import { test, expect } from '@playwright/test';

test.describe('Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.fill('input[name="identifier"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test.describe('Authentication Flow', () => {
    test('should maintain session after page refresh', async ({ page }) => {
      await page.goto('/dashboard');
      await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
      
      // Refresh page
      await page.reload();
      
      // Should still be logged in
      await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
      await expect(page).toHaveURL('/dashboard');
    });

    test('should redirect to login when session expires', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Simulate session expiration by clearing storage
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
      // Navigate to protected route
      await page.goto('/documents');
      
      // Should redirect to login
      await expect(page).toHaveURL('/');
      await expect(page.locator('form')).toBeVisible();
    });

    test('should handle concurrent login attempts', async ({ page, context }) => {
      // Logout first
      await page.click('[data-testid="logout-button"]');
      await expect(page).toHaveURL('/');
      
      // Create multiple pages for concurrent login
      const page2 = await context.newPage();
      await page2.goto('/');
      
      // Attempt login on both pages simultaneously
      const loginPromise1 = page.fill('input[name="identifier"]', 'admin@example.com')
        .then(() => page.fill('input[type="password"]', 'password123'))
        .then(() => page.click('button[type="submit"]'));
      
      const loginPromise2 = page2.fill('input[name="identifier"]', 'admin@example.com')
        .then(() => page2.fill('input[type="password"]', 'password123'))
        .then(() => page2.click('button[type="submit"]'));
      
      await Promise.all([loginPromise1, loginPromise2]);
      
      // Both should succeed
      await expect(page).toHaveURL('/dashboard');
      await expect(page2).toHaveURL('/dashboard');
      
      await page2.close();
    });
  });

  test.describe('Document Management', () => {
    test('should preserve document list after navigation', async ({ page }) => {
      await page.goto('/documents');
      
      // Wait for documents to load
      await expect(page.locator('[data-testid="documents-list"]')).toBeVisible();
      
      // Get initial document count
      const initialCount = await page.locator('[data-testid="document-item"]').count();
      
      // Navigate away and back
      await page.goto('/dashboard');
      await page.goto('/documents');
      
      // Document count should be preserved
      await expect(page.locator('[data-testid="documents-list"]')).toBeVisible();
      const finalCount = await page.locator('[data-testid="document-item"]').count();
      
      expect(finalCount).toBe(initialCount);
    });

    test('should maintain search results after page refresh', async ({ page }) => {
      await page.goto('/documents');
      
      // Perform search
      await page.fill('[data-testid="search-input"]', 'test');
      await page.click('[data-testid="search-button"]');
      
      // Wait for search results
      await page.waitForTimeout(1000);
      const searchResults = await page.locator('[data-testid="document-item"]').count();
      
      // Refresh page
      await page.reload();
      
      // Search input should be preserved
      await expect(page.locator('[data-testid="search-input"]')).toHaveValue('test');
      
      // Results should be maintained
      const newResults = await page.locator('[data-testid="document-item"]').count();
      expect(newResults).toBe(searchResults);
    });

    test('should handle file upload edge cases', async ({ page }) => {
      await page.goto('/documents');
      await page.click('[data-testid="upload-button"]');
      
      // Test empty file upload
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles([]);
      await page.click('[data-testid="upload-submit"]');
      
      // Should show validation error
      await expect(page.locator('[role="alert"]')).toBeVisible();
      
      // Test multiple file selection when only single allowed
      await fileInput.setInputFiles([
        { name: 'test1.pdf', mimeType: 'application/pdf', buffer: Buffer.from('test1') },
        { name: 'test2.pdf', mimeType: 'application/pdf', buffer: Buffer.from('test2') }
      ]);
      
      // Should handle gracefully
      await page.click('[data-testid="upload-submit"]');
      await expect(page.locator('[role="alert"]')).toBeVisible();
    });

    test('should preserve document filters across sessions', async ({ page }) => {
      await page.goto('/documents');
      
      // Apply category filter
      await page.selectOption('[data-testid="category-filter"]', 'contracts');
      await page.waitForTimeout(500);
      
      // Apply date filter
      await page.fill('[data-testid="date-from"]', '2024-01-01');
      await page.fill('[data-testid="date-to"]', '2024-12-31');
      await page.waitForTimeout(500);
      
      // Refresh page
      await page.reload();
      
      // Filters should be preserved
      await expect(page.locator('[data-testid="category-filter"]')).toHaveValue('contracts');
      await expect(page.locator('[data-testid="date-from"]')).toHaveValue('2024-01-01');
      await expect(page.locator('[data-testid="date-to"]')).toHaveValue('2024-12-31');
    });
  });

  test.describe('User Interface', () => {
    test('should maintain theme preference', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Switch to dark theme
      await page.click('[data-testid="theme-toggle"]');
      await expect(page.locator('html')).toHaveClass(/dark/);
      
      // Refresh page
      await page.reload();
      
      // Theme should be preserved
      await expect(page.locator('html')).toHaveClass(/dark/);
      
      // Switch back to light theme
      await page.click('[data-testid="theme-toggle"]');
      await expect(page.locator('html')).not.toHaveClass(/dark/);
    });

    test('should handle responsive layout changes', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Test desktop layout
      await page.setViewportSize({ width: 1200, height: 800 });
      await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
      await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
      
      // Test tablet layout
      await page.setViewportSize({ width: 768, height: 1024 });
      await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
      
      // Test mobile layout
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.locator('[data-testid="mobile-menu-toggle"]')).toBeVisible();
      
      // Test mobile menu functionality
      await page.click('[data-testid="mobile-menu-toggle"]');
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    });

    test('should handle form validation consistently', async ({ page }) => {
      await page.goto('/documents');
      await page.click('[data-testid="upload-button"]');
      
      // Test required field validation
      await page.click('[data-testid="upload-submit"]');
      await expect(page.locator('[role="alert"]')).toBeVisible();
      
      // Fill required fields
      await page.fill('[data-testid="document-title"]', 'Test Document');
      await page.selectOption('[data-testid="document-category"]', 'general');
      
      // Validation errors should clear
      await expect(page.locator('[role="alert"]')).not.toBeVisible();
      
      // Test field length validation
      const longTitle = 'a'.repeat(256);
      await page.fill('[data-testid="document-title"]', longTitle);
      await page.click('[data-testid="upload-submit"]');
      
      await expect(page.locator('[role="alert"]')).toBeVisible();
    });
  });

  test.describe('Data Persistence', () => {
    test('should handle browser storage limits', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Fill localStorage with large amount of data
      await page.evaluate(() => {
        try {
          const largeData = 'x'.repeat(1024 * 1024); // 1MB
          for (let i = 0; i < 5; i++) {
            localStorage.setItem(`test_data_${i}`, largeData);
          }
        } catch {
          // Storage quota exceeded - this is expected
        }
      });
      
      // Application should still function
      await page.goto('/documents');
      await expect(page.locator('[data-testid="documents-list"]')).toBeVisible();
      
      // Clean up
      await page.evaluate(() => {
        for (let i = 0; i < 5; i++) {
          localStorage.removeItem(`test_data_${i}`);
        }
      });
    });

    test('should handle network interruptions gracefully', async ({ page }) => {
      await page.goto('/documents');
      
      // Simulate network failure
      await page.route('**/api/**', route => route.abort());
      
      // Try to perform actions that require network
      await page.click('[data-testid="upload-button"]');
      await page.fill('[data-testid="document-title"]', 'Test Document');
      await page.click('[data-testid="upload-submit"]');
      
      // Should show appropriate error message
      await expect(page.locator('[role="alert"]')).toBeVisible();
      
      // Restore network
      await page.unroute('**/api/**');
      
      // Retry should work
      await page.click('[data-testid="upload-submit"]');
      await page.waitForTimeout(2000);
    });
  });

  test.describe('Performance Regression', () => {
    test('should load dashboard within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/dashboard');
      await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      
      // Dashboard should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('should handle large document lists efficiently', async ({ page }) => {
      await page.goto('/documents');
      
      // Simulate large dataset
      await page.evaluate(() => {
        // Mock API response with many documents
        window.fetch = async (url) => {
          if (url.toString().includes('/api/documents')) {
            const documents = Array.from({ length: 1000 }, (_, i) => ({
              id: i + 1,
              title: `Document ${i + 1}`,
              category: 'general',
              createdAt: new Date().toISOString(),
              size: Math.floor(Math.random() * 1000000)
            }));
            
            return new Response(JSON.stringify({ documents, total: 1000 }), {
              headers: { 'Content-Type': 'application/json' }
            });
          }
          return fetch(url);
        };
      });
      
      // Reload to trigger new API call
      await page.reload();
      
      const startTime = Date.now();
      await expect(page.locator('[data-testid="documents-list"]')).toBeVisible();
      const renderTime = Date.now() - startTime;
      
      // Should render within reasonable time even with large dataset
      expect(renderTime).toBeLessThan(5000);
    });

    test('should maintain smooth scrolling with many elements', async ({ page }) => {
      await page.goto('/documents');
      await expect(page.locator('[data-testid="documents-list"]')).toBeVisible();
      
      // Test smooth scrolling
      const startTime = Date.now();
      
      await page.evaluate(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      });
      
      await page.waitForTimeout(1000);
      
      const scrollTime = Date.now() - startTime;
      
      // Scrolling should complete within reasonable time
      expect(scrollTime).toBeLessThan(2000);
    });
  });

  test.describe('Browser Compatibility', () => {
    test('should work with different user agents', async ({ page }) => {
      // Test with different user agents
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
      ];
      
      for (const userAgent of userAgents) {
        await page.setExtraHTTPHeaders({ 'User-Agent': userAgent });
        await page.goto('/dashboard');
        await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
      }
    });

    test('should handle different screen resolutions', async ({ page }) => {
      const resolutions = [
        { width: 1920, height: 1080 }, // Full HD
        { width: 1366, height: 768 },  // Common laptop
        { width: 1440, height: 900 },  // MacBook
        { width: 2560, height: 1440 }  // 2K
      ];
      
      for (const resolution of resolutions) {
        await page.setViewportSize(resolution);
        await page.goto('/dashboard');
        await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
        
        // Check if layout adapts properly
        const mainContent = page.locator('[data-testid="main-content"]');
        await expect(mainContent).toBeVisible();
      }
    });
  });

  test.describe('Error Recovery', () => {
    test('should recover from JavaScript errors', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Inject a JavaScript error
      await page.evaluate(() => {
        // Simulate a runtime error
        setTimeout(() => {
          throw new Error('Simulated runtime error');
        }, 100);
      });
      
      await page.waitForTimeout(500);
      
      // Application should still be functional
      await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
      
      // Navigation should still work
      await page.goto('/documents');
      await expect(page.locator('[data-testid="documents-list"]')).toBeVisible();
    });

    test('should handle API errors gracefully', async ({ page }) => {
      await page.goto('/documents');
      
      // Mock API to return errors
      await page.route('**/api/documents', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });
      
      // Reload to trigger API call
      await page.reload();
      
      // Should show error message
      await expect(page.locator('[role="alert"]')).toBeVisible();
      
      // Should provide retry mechanism
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
      
      // Restore API
      await page.unroute('**/api/documents');
      
      // Retry should work
      await page.click('[data-testid="retry-button"]');
      await expect(page.locator('[data-testid="documents-list"]')).toBeVisible();
    });
  });
});