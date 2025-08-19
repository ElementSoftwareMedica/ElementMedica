import { test, expect } from '@playwright/test';

test.describe('Security Tests', () => {
  test.describe('Authentication Security', () => {
    test('should prevent SQL injection in login', async ({ page }) => {
      await page.goto('/');
      
      // Try SQL injection in email field
      await page.fill('input[name="identifier"]', "admin@example.com'; DROP TABLE users; --");
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      // Should show invalid credentials, not crash
      await expect(page.locator('text=Credenziali non valide')).toBeVisible();
    });

    test('should prevent XSS in login form', async ({ page }) => {
      await page.goto('/');
      
      // Try XSS in email field
      await page.fill('input[name="identifier"]', '<script>alert("XSS")</script>');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      // Should not execute script
      const alerts = [];
      page.on('dialog', dialog => {
        alerts.push(dialog.message());
        dialog.dismiss();
      });
      
      await page.waitForTimeout(1000);
      expect(alerts).toHaveLength(0);
    });

    test('should enforce rate limiting on login attempts', async ({ page }) => {
      await page.goto('/');
      
      // Make multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        await page.fill('input[name="identifier"]', 'test@example.com');
        await page.fill('input[type="password"]', 'wrongpassword');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(500);
      }
      
      // Should show rate limiting message
      await expect(page.locator('text=Troppi tentativi di accesso')).toBeVisible();
    });

    test('should require strong passwords on registration', async ({ page }) => {
      await page.goto('/register');
      
      // Try weak password
      await page.fill('input[name="email"]', 'newuser@example.com');
      await page.fill('input[name="firstName"]', 'New');
      await page.fill('input[name="lastName"]', 'User');
      await page.fill('input[name="password"]', '123');
      await page.fill('input[name="confirmPassword"]', '123');
      await page.click('button[type="submit"]');
      
      // Should show password strength error
      await expect(page.locator('text=Password deve essere di almeno 8 caratteri')).toBeVisible();
    });

    test('should prevent session fixation', async ({ page, context }) => {
      // Get initial session
      await page.goto('/');
      const initialCookies = await context.cookies();
      
      // Login
      await page.fill('input[name="identifier"]', 'admin@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard');
      
      // Get post-login session
      const postLoginCookies = await context.cookies();
      
      // Session ID should change after login
      const initialSessionId = initialCookies.find(c => c.name === 'sessionId')?.value;
      const postLoginSessionId = postLoginCookies.find(c => c.name === 'sessionId')?.value;
      
      expect(initialSessionId).not.toBe(postLoginSessionId);
    });
  });

  test.describe('Authorization Security', () => {
    test('should prevent unauthorized access to admin routes', async ({ page }) => {
      // Try to access admin route without login
      await page.goto('/admin');
      
      // Should redirect to login
      await page.waitForURL('/');
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    });

    test('should prevent privilege escalation', async ({ page }) => {
      // Login as regular user
      await page.goto('/');
      await page.fill('input[name="identifier"]', 'user@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard');
      
      // Try to access admin-only features
      await page.goto('/admin/users');
      
      // Should show access denied
      await expect(page.locator('text=Accesso negato')).toBeVisible();
    });

    test('should prevent access to other users data', async ({ page }) => {
      // Login as user
      await page.goto('/');
      await page.fill('input[type="email"]', 'user@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard');
      
      // Try to access another user's document directly
      await page.goto('/documents/999'); // Assuming this belongs to another user
      
      // Should show access denied or not found
      const errorMessage = page.locator('text=Accesso negato, text=Documento non trovato');
      await expect(errorMessage.first()).toBeVisible();
    });
  });

  test.describe('Input Validation Security', () => {
    test('should sanitize file uploads', async ({ page }) => {
      // Login first
      await page.goto('/');
      await page.fill('input[type="email"]', 'admin@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard');
      
      await page.goto('/documents');
      await page.click('[data-testid="upload-button"]');
      
      // Try to upload a potentially malicious file
      const maliciousFile = 'tests/fixtures/malicious.php';
      
      await page.setInputFiles('[data-testid="file-input"]', maliciousFile);
      await page.fill('[data-testid="document-title"]', 'Malicious File');
      await page.click('[data-testid="upload-submit"]');
      
      // Should reject the file
      await expect(page.locator('text=Tipo di file non supportato')).toBeVisible();
    });

    test('should prevent XSS in document titles', async ({ page }) => {
      // Login first
      await page.goto('/');
      await page.fill('input[type="email"]', 'admin@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard');
      
      await page.goto('/documents');
      await page.click('[data-testid="upload-button"]');
      
      // Try XSS in document title
      const xssPayload = '<script>alert("XSS in title")</script>';
      
      await page.setInputFiles('[data-testid="file-input"]', 'tests/fixtures/test-document.pdf');
      await page.fill('[data-testid="document-title"]', xssPayload);
      await page.fill('[data-testid="document-description"]', 'Test description');
      await page.click('[data-testid="upload-submit"]');
      
      // Wait for upload to complete
      await expect(page.locator('text=Documento caricato con successo')).toBeVisible();
      
      // Check if XSS is executed when title is displayed
      const alerts = [];
      page.on('dialog', dialog => {
        alerts.push(dialog.message());
        dialog.dismiss();
      });
      
      await page.reload();
      await page.waitForTimeout(1000);
      
      // Should not execute script
      expect(alerts).toHaveLength(0);
      
      // Title should be escaped
      await expect(page.locator('text=<script>alert("XSS in title")</script>')).toBeVisible();
    });

    test('should validate file size limits', async ({ page }) => {
      // Login first
      await page.goto('/');
      await page.fill('input[type="email"]', 'admin@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard');
      
      await page.goto('/documents');
      await page.click('[data-testid="upload-button"]');
      
      // Try to upload oversized file (simulated)
      await page.evaluate(() => {
        const fileInput = document.querySelector('[data-testid="file-input"]') as HTMLInputElement;
        const file = new File(['x'.repeat(100 * 1024 * 1024)], 'large-file.pdf', {
          type: 'application/pdf'
        });
        
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      });
      
      await page.fill('[data-testid="document-title"]', 'Large File');
      await page.click('[data-testid="upload-submit"]');
      
      // Should show file size error
      await expect(page.locator('text=File troppo grande')).toBeVisible();
    });
  });

  test.describe('Session Security', () => {
    test('should expire sessions after inactivity', async ({ page }) => {
      // Login
      await page.goto('/');
      await page.fill('input[type="email"]', 'admin@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard');
      
      // Simulate session expiration by manipulating localStorage
      await page.evaluate(() => {
        const expiredTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
        localStorage.setItem('sessionExpiry', expiredTime.toString());
      });
      
      // Try to navigate to protected route
      await page.goto('/documents');
      
      // Should redirect to login
      await page.waitForURL('/');
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    });

    test('should invalidate session on logout', async ({ page }) => {
      // Login
      await page.goto('/');
      await page.fill('input[type="email"]', 'admin@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard');
      
      // Logout
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="logout-button"]');
      await page.waitForURL('/');
      
      // Try to access protected route using browser back
      await page.goBack();
      
      // Should redirect to login
      await page.waitForURL('/');
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    });
  });

  test.describe('CSRF Protection', () => {
    test('should protect against CSRF attacks', async ({ page }) => {
      // Login first
      await page.goto('/');
      await page.fill('input[type="email"]', 'admin@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard');
      
      // Try to make a request without CSRF token
      const response = await page.evaluate(async () => {
        try {
          const response = await fetch('/api/documents', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: 'CSRF Test Document',
              description: 'This should be blocked'
            })
          });
          return { status: response.status, ok: response.ok };
        } catch (error) {
          return { error: (error as Error).message };
        }
      });
      
      // Should be rejected (403 Forbidden)
      expect(response.status).toBe(403);
    });
  });

  test.describe('Content Security Policy', () => {
    test('should have proper CSP headers', async ({ page }) => {
      const response = await page.goto('/');
      const headers = response?.headers();
      
      // Should have CSP header
      expect(headers?.['content-security-policy']).toBeTruthy();
      
      // Should prevent inline scripts
      const csp = headers?.['content-security-policy'];
      expect(csp).toContain("script-src 'self'");
      expect(csp).not.toContain("'unsafe-inline'");
    });

    test('should prevent loading external scripts', async ({ page }) => {
      await page.goto('/');
      
      // Try to inject external script
      const scriptLoaded = await page.evaluate(() => {
        try {
          const script = document.createElement('script');
          script.src = 'https://evil.com/malicious.js';
          document.head.appendChild(script);
          return true;
        } catch {
          return false;
        }
      });
      
      // Should be blocked by CSP
      expect(scriptLoaded).toBe(false);
    });
  });

  test.describe('Data Protection', () => {
    test('should not expose sensitive data in client-side code', async ({ page }) => {
      await page.goto('/');
      
      // Check if sensitive data is exposed in page source
      const content = await page.content();
      
      // Should not contain database credentials
      expect(content).not.toContain('DB_PASSWORD');
      expect(content).not.toContain('JWT_SECRET');
      expect(content).not.toContain('API_KEY');
      
      // Check localStorage and sessionStorage
      const storageData = await page.evaluate(() => {
        const local = { ...localStorage };
        const session = { ...sessionStorage };
        return { local, session };
      });
      
      // Should not store sensitive data in browser storage
      const allStorageValues = Object.values(storageData.local).concat(Object.values(storageData.session));
      for (const value of allStorageValues) {
        expect(value).not.toContain('password');
        expect(value).not.toContain('secret');
      }
    });

    test('should mask sensitive data in forms', async ({ page }) => {
      await page.goto('/');
      
      // Password field should be masked
      const passwordField = page.locator('input[type="password"]');
      await passwordField.fill('secretpassword');
      
      const fieldType = await passwordField.getAttribute('type');
      expect(fieldType).toBe('password');
      
      // Value should not be visible in DOM
      const fieldValue = await passwordField.inputValue();
      expect(fieldValue).toBe('secretpassword');
      
      // But should not be visible as text
      const visibleText = await passwordField.textContent();
      expect(visibleText).not.toContain('secretpassword');
    });
  });
});