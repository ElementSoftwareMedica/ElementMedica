import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Full Workflow Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Start with a clean state
    await page.goto('/');
  });

  test('complete user journey from registration to document management', async ({ page }) => {
    // Step 1: User Registration
    await page.click('[data-testid="register-link"]');
    await expect(page).toHaveURL('/register');
    
    const timestamp = Date.now();
    const testEmail = `test${timestamp}@example.com`;
    
    await page.fill('[data-testid="register-email"]', testEmail);
    await page.fill('[data-testid="register-password"]', 'SecurePass123!');
    await page.fill('[data-testid="register-confirm-password"]', 'SecurePass123!');
    await page.fill('[data-testid="register-first-name"]', 'Test');
    await page.fill('[data-testid="register-last-name"]', 'User');
    
    await page.click('[data-testid="register-submit"]');
    
    // Should redirect to dashboard after successful registration
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="welcome-message"]')).toContainText('Test User');
    
    // Step 2: Profile Setup
    await page.click('[data-testid="profile-menu"]');
    await page.click('[data-testid="profile-settings"]');
    
    await page.fill('[data-testid="profile-company"]', 'Test Company');
    await page.fill('[data-testid="profile-phone"]', '+1234567890');
    await page.selectOption('[data-testid="profile-timezone"]', 'America/New_York');
    
    await page.click('[data-testid="profile-save"]');
    await expect(page.locator('[role="alert"]')).toContainText('Profile updated successfully');
    
    // Step 3: Document Upload
    await page.goto('/documents');
    await page.click('[data-testid="upload-button"]');
    
    // Upload a test document
    const filePath = path.join(__dirname, '../fixtures/test-document.pdf');
    await page.setInputFiles('[data-testid="file-input"]', filePath);
    
    await page.fill('[data-testid="document-title"]', 'My First Document');
    await page.fill('[data-testid="document-description"]', 'This is a test document for integration testing');
    await page.selectOption('[data-testid="document-category"]', 'contracts');
    await page.check('[data-testid="document-confidential"]');
    
    await page.click('[data-testid="upload-submit"]');
    
    // Wait for upload to complete
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();
    await page.click('[data-testid="upload-close"]');
    
    // Verify document appears in list
    await expect(page.locator('[data-testid="document-item"]')).toContainText('My First Document');
    
    // Step 4: Document Management
    const documentItem = page.locator('[data-testid="document-item"]').first();
    await documentItem.click();
    
    // View document details
    await expect(page.locator('[data-testid="document-details"]')).toBeVisible();
    await expect(page.locator('[data-testid="document-title"]')).toContainText('My First Document');
    await expect(page.locator('[data-testid="document-category"]')).toContainText('Contracts');
    
    // Edit document
    await page.click('[data-testid="edit-document"]');
    await page.fill('[data-testid="document-title"]', 'My Updated Document');
    await page.fill('[data-testid="document-tags"]', 'important, contract, legal');
    await page.click('[data-testid="save-document"]');
    
    await expect(page.locator('[role="alert"]')).toContainText('Document updated successfully');
    
    // Step 5: Document Sharing
    await page.click('[data-testid="share-document"]');
    
    await page.fill('[data-testid="share-email"]', 'colleague@example.com');
    await page.selectOption('[data-testid="share-permission"]', 'view');
    await page.fill('[data-testid="share-message"]', 'Please review this document');
    
    await page.click('[data-testid="send-share"]');
    await expect(page.locator('[role="alert"]')).toContainText('Document shared successfully');
    
    // Verify share appears in shares list
    await page.click('[data-testid="view-shares"]');
    await expect(page.locator('[data-testid="share-item"]')).toContainText('colleague@example.com');
    
    // Step 6: Search and Filter
    await page.goto('/documents');
    
    // Test search functionality
    await page.fill('[data-testid="search-input"]', 'Updated');
    await page.click('[data-testid="search-button"]');
    
    await expect(page.locator('[data-testid="document-item"]')).toContainText('My Updated Document');
    
    // Test category filter
    await page.selectOption('[data-testid="category-filter"]', 'contracts');
    await expect(page.locator('[data-testid="document-item"]')).toContainText('My Updated Document');
    
    // Clear filters
    await page.click('[data-testid="clear-filters"]');
    await expect(page.locator('[data-testid="search-input"]')).toHaveValue('');
    
    // Step 7: Bulk Operations
    await page.check('[data-testid="select-all-documents"]');
    await page.click('[data-testid="bulk-actions"]');
    await page.click('[data-testid="bulk-export"]');
    
    // Wait for export to complete
    await expect(page.locator('[data-testid="export-success"]')).toBeVisible();
    
    // Step 8: Activity Log
    await page.goto('/activity');
    
    // Verify activities are logged
    await expect(page.locator('[data-testid="activity-item"]')).toContainText('Document uploaded');
    await expect(page.locator('[data-testid="activity-item"]')).toContainText('Document updated');
    await expect(page.locator('[data-testid="activity-item"]')).toContainText('Document shared');
    
    // Step 9: Settings and Preferences
    await page.goto('/settings');
    
    // Update notification preferences
    await page.check('[data-testid="email-notifications"]');
    await page.check('[data-testid="document-updates"]');
    await page.uncheck('[data-testid="marketing-emails"]');
    
    await page.click('[data-testid="save-preferences"]');
    await expect(page.locator('[role="alert"]')).toContainText('Preferences saved');
    
    // Update security settings
    await page.click('[data-testid="security-tab"]');
    await page.check('[data-testid="two-factor-auth"]');
    
    // Mock 2FA setup
    await expect(page.locator('[data-testid="qr-code"]')).toBeVisible();
    await page.fill('[data-testid="verification-code"]', '123456');
    await page.click('[data-testid="verify-2fa"]');
    
    await expect(page.locator('[role="alert"]')).toContainText('Two-factor authentication enabled');
    
    // Step 10: Data Export
    await page.click('[data-testid="data-tab"]');
    await page.click('[data-testid="export-data"]');
    
    await page.check('[data-testid="export-documents"]');
    await page.check('[data-testid="export-activity"]');
    await page.selectOption('[data-testid="export-format"]', 'json');
    
    await page.click('[data-testid="start-export"]');
    await expect(page.locator('[data-testid="export-progress"]')).toBeVisible();
    
    // Wait for export completion
    await expect(page.locator('[data-testid="export-complete"]')).toBeVisible({ timeout: 10000 });
    
    // Step 11: Logout
    await page.click('[data-testid="profile-menu"]');
    await page.click('[data-testid="logout"]');
    
    // Should redirect to login page
    await expect(page).toHaveURL('/');
    await expect(page.locator('form')).toBeVisible();
    
    // Step 12: Login with new account
    await page.fill('input[name="identifier"]', testEmail);
    await page.fill('input[type="password"]', 'SecurePass123!');
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    
    // Verify all data is still there
    await page.goto('/documents');
    await expect(page.locator('[data-testid="document-item"]')).toContainText('My Updated Document');
  });

  test('admin workflow - user management and system settings', async ({ page }) => {
    // Login as admin
    await page.fill('input[name="identifier"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/dashboard');
    
    // Step 1: User Management
    await page.goto('/admin/users');
    
    // View user list
    await expect(page.locator('[data-testid="users-table"]')).toBeVisible();
    
    // Create new user
    await page.click('[data-testid="create-user"]');
    
    await page.fill('[data-testid="user-email"]', 'newuser@example.com');
    await page.fill('[data-testid="user-first-name"]', 'New');
    await page.fill('[data-testid="user-last-name"]', 'User');
    await page.selectOption('[data-testid="user-role"]', 'user');
    await page.check('[data-testid="send-welcome-email"]');
    
    await page.click('[data-testid="create-user-submit"]');
    await expect(page.locator('[role="alert"]')).toContainText('User created successfully');
    
    // Edit user
    const userRow = page.locator('[data-testid="user-row"]').filter({ hasText: 'newuser@example.com' });
    await userRow.locator('[data-testid="edit-user"]').click();
    
    await page.selectOption('[data-testid="user-role"]', 'manager');
    await page.click('[data-testid="update-user"]');
    
    await expect(page.locator('[role="alert"]')).toContainText('User updated successfully');
    
    // Step 2: System Settings
    await page.goto('/admin/settings');
    
    // General settings
    await page.fill('[data-testid="system-name"]', 'Document Management System');
    await page.fill('[data-testid="admin-email"]', 'admin@company.com');
    await page.selectOption('[data-testid="default-timezone"]', 'UTC');
    
    await page.click('[data-testid="save-general-settings"]');
    await expect(page.locator('[role="alert"]')).toContainText('Settings saved');
    
    // Security settings
    await page.click('[data-testid="security-settings-tab"]');
    
    await page.check('[data-testid="require-2fa"]');
    await page.fill('[data-testid="session-timeout"]', '30');
    await page.fill('[data-testid="max-login-attempts"]', '5');
    
    await page.click('[data-testid="save-security-settings"]');
    await expect(page.locator('[role="alert"]')).toContainText('Security settings saved');
    
    // Step 3: System Monitoring
    await page.goto('/admin/monitoring');
    
    // Check system health
    await expect(page.locator('[data-testid="system-status"]')).toContainText('Healthy');
    await expect(page.locator('[data-testid="database-status"]')).toContainText('Connected');
    await expect(page.locator('[data-testid="storage-status"]')).toContainText('Available');
    
    // View metrics
    await expect(page.locator('[data-testid="active-users"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-documents"]')).toBeVisible();
    await expect(page.locator('[data-testid="storage-used"]')).toBeVisible();
    
    // Step 4: Audit Logs
    await page.goto('/admin/audit');
    
    // Filter audit logs
    await page.selectOption('[data-testid="audit-action-filter"]', 'user_created');
    await page.fill('[data-testid="audit-date-from"]', '2024-01-01');
    await page.click('[data-testid="apply-audit-filter"]');
    
    await expect(page.locator('[data-testid="audit-entry"]')).toContainText('User created');
    
    // Export audit logs
    await page.click('[data-testid="export-audit-logs"]');
    await expect(page.locator('[data-testid="export-started"]')).toBeVisible();
    
    // Step 5: Backup Management
    await page.goto('/admin/backup');
    
    // Create manual backup
    await page.click('[data-testid="create-backup"]');
    await page.fill('[data-testid="backup-description"]', 'Manual backup for testing');
    await page.click('[data-testid="start-backup"]');
    
    await expect(page.locator('[data-testid="backup-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="backup-complete"]')).toBeVisible({ timeout: 30000 });
    
    // Configure automatic backups
    await page.check('[data-testid="enable-auto-backup"]');
    await page.selectOption('[data-testid="backup-frequency"]', 'daily');
    await page.fill('[data-testid="backup-time"]', '02:00');
    await page.fill('[data-testid="backup-retention"]', '30');
    
    await page.click('[data-testid="save-backup-settings"]');
    await expect(page.locator('[role="alert"]')).toContainText('Backup settings saved');
  });

  test('multi-tenant workflow - tenant isolation and management', async ({ page }) => {
    // Login as super admin
    await page.fill('input[name="identifier"]', 'superadmin@example.com');
    await page.fill('input[type="password"]', 'superadmin123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/dashboard');
    
    // Step 1: Create new tenant
    await page.goto('/super-admin/tenants');
    await page.click('[data-testid="create-tenant"]');
    
    await page.fill('[data-testid="tenant-name"]', 'Test Corporation');
    await page.fill('[data-testid="tenant-domain"]', 'testcorp.example.com');
    await page.fill('[data-testid="tenant-admin-email"]', 'admin@testcorp.com');
    await page.selectOption('[data-testid="tenant-plan"]', 'enterprise');
    
    await page.click('[data-testid="create-tenant-submit"]');
    await expect(page.locator('[role="alert"]')).toContainText('Tenant created successfully');
    
    // Step 2: Configure tenant settings
    const tenantRow = page.locator('[data-testid="tenant-row"]').filter({ hasText: 'Test Corporation' });
    await tenantRow.locator('[data-testid="configure-tenant"]').click();
    
    // Set storage limits
    await page.fill('[data-testid="storage-limit"]', '100');
    await page.fill('[data-testid="user-limit"]', '50');
    await page.check('[data-testid="enable-api-access"]');
    
    await page.click('[data-testid="save-tenant-config"]');
    await expect(page.locator('[role="alert"]')).toContainText('Tenant configuration saved');
    
    // Step 3: Test tenant isolation
    // Switch to tenant context
    await page.goto('/tenant/testcorp');
    
    // Login as tenant admin
    await page.fill('input[name="identifier"]', 'admin@testcorp.com');
    await page.fill('input[type="password"]', 'temppassword');
    await page.click('button[type="submit"]');
    
    // Should be in tenant-specific dashboard
    await expect(page.locator('[data-testid="tenant-name"]')).toContainText('Test Corporation');
    
    // Upload document in tenant context
    await page.goto('/documents');
    await page.click('[data-testid="upload-button"]');
    
    const filePath = path.join(__dirname, '../fixtures/test-document.pdf');
    await page.setInputFiles('[data-testid="file-input"]', filePath);
    await page.fill('[data-testid="document-title"]', 'Tenant Document');
    await page.click('[data-testid="upload-submit"]');
    
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();
    
    // Step 4: Verify tenant isolation
    // Switch back to super admin
    await page.goto('/super-admin/tenants');
    
    // Check tenant usage
    await tenantRow.locator('[data-testid="view-usage"]').click();
    
    await expect(page.locator('[data-testid="documents-count"]')).toContainText('1');
    await expect(page.locator('[data-testid="storage-used"]')).toContainText('KB');
    
    // Verify other tenants can't access this data
    await page.goto('/tenant/default');
    await page.goto('/documents');
    
    // Should not see tenant-specific document
    await expect(page.locator('[data-testid="document-item"]')).not.toContainText('Tenant Document');
  });

  test('api integration workflow - external system integration', async ({ page }) => {
    // Login as admin
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Step 1: API Key Management
    await page.goto('/admin/api-keys');
    
    // Create new API key
    await page.click('[data-testid="create-api-key"]');
    await page.fill('[data-testid="api-key-name"]', 'External Integration');
    await page.selectOption('[data-testid="api-key-scope"]', 'documents:read,documents:write');
    await page.fill('[data-testid="api-key-expires"]', '2025-12-31');
    
    await page.click('[data-testid="generate-api-key"]');
    
    // Copy API key
    const apiKey = await page.locator('[data-testid="generated-api-key"]').textContent();
    expect(apiKey).toBeTruthy();
    
    await page.click('[data-testid="copy-api-key"]');
    await page.click('[data-testid="api-key-close"]');
    
    // Step 2: Test API endpoints
    // Simulate external API calls
    const apiResponse = await page.evaluate(async (key) => {
      const response = await fetch('/api/documents', {
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        }
      });
      return {
        status: response.status,
        data: await response.json()
      };
    }, apiKey);
    
    expect(apiResponse.status).toBe(200);
    expect(apiResponse.data).toHaveProperty('documents');
    
    // Step 3: Webhook Configuration
    await page.goto('/admin/webhooks');
    
    await page.click('[data-testid="create-webhook"]');
    await page.fill('[data-testid="webhook-url"]', 'https://external-system.com/webhook');
    await page.check('[data-testid="webhook-document-uploaded"]');
    await page.check('[data-testid="webhook-document-shared"]');
    await page.fill('[data-testid="webhook-secret"]', 'webhook-secret-key');
    
    await page.click('[data-testid="save-webhook"]');
    await expect(page.locator('[role="alert"]')).toContainText('Webhook created successfully');
    
    // Test webhook
    await page.click('[data-testid="test-webhook"]');
    await expect(page.locator('[data-testid="webhook-test-result"]')).toContainText('Success');
    
    // Step 4: Integration Monitoring
    await page.goto('/admin/integrations');
    
    // View API usage
    await expect(page.locator('[data-testid="api-requests-today"]')).toBeVisible();
    await expect(page.locator('[data-testid="webhook-deliveries"]')).toBeVisible();
    
    // Check integration logs
    await page.click('[data-testid="view-api-logs"]');
    await expect(page.locator('[data-testid="api-log-entry"]')).toBeVisible();
    
    // Filter logs by API key
    await page.selectOption('[data-testid="log-api-key-filter"]', 'External Integration');
    await page.click('[data-testid="apply-log-filter"]');
    
    await expect(page.locator('[data-testid="api-log-entry"]')).toContainText('External Integration');
  });

  test('compliance and gdpr workflow', async ({ page }) => {
    // Login as compliance officer
    await page.fill('input[name="identifier"]', 'compliance@example.com');
    await page.fill('input[type="password"]', 'compliance123');
    await page.click('button[type="submit"]');
    
    // Step 1: Data Subject Requests
    await page.goto('/compliance/data-requests');
    
    // Create new data request
    await page.click('[data-testid="create-data-request"]');
    await page.fill('[data-testid="subject-email"]', 'user@example.com');
    await page.selectOption('[data-testid="request-type"]', 'access');
    await page.fill('[data-testid="request-reason"]', 'User requested access to personal data');
    
    await page.click('[data-testid="submit-data-request"]');
    await expect(page.locator('[role="alert"]')).toContainText('Data request created');
    
    // Process the request
    const requestRow = page.locator('[data-testid="data-request-row"]').first();
    await requestRow.locator('[data-testid="process-request"]').click();
    
    // Generate data export
    await page.click('[data-testid="generate-export"]');
    await expect(page.locator('[data-testid="export-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="export-ready"]')).toBeVisible({ timeout: 10000 });
    
    // Mark as completed
    await page.click('[data-testid="mark-completed"]');
    await page.fill('[data-testid="completion-notes"]', 'Data export provided to user');
    await page.click('[data-testid="confirm-completion"]');
    
    // Step 2: Consent Management
    await page.goto('/compliance/consent');
    
    // View consent records
    await expect(page.locator('[data-testid="consent-records"]')).toBeVisible();
    
    // Update consent preferences
    await page.click('[data-testid="update-consent-template"]');
    await page.fill('[data-testid="consent-purpose"]', 'Document processing and storage');
    await page.check('[data-testid="consent-required"]');
    await page.fill('[data-testid="consent-retention"]', '7');
    
    await page.click('[data-testid="save-consent-template"]');
    await expect(page.locator('[role="alert"]')).toContainText('Consent template updated');
    
    // Step 3: Data Retention Policies
    await page.goto('/compliance/retention');
    
    // Create retention policy
    await page.click('[data-testid="create-retention-policy"]');
    await page.fill('[data-testid="policy-name"]', 'Document Retention Policy');
    await page.selectOption('[data-testid="data-type"]', 'documents');
    await page.fill('[data-testid="retention-period"]', '7');
    await page.selectOption('[data-testid="retention-unit"]', 'years');
    
    await page.click('[data-testid="save-retention-policy"]');
    await expect(page.locator('[role="alert"]')).toContainText('Retention policy created');
    
    // Step 4: Compliance Reporting
    await page.goto('/compliance/reports');
    
    // Generate compliance report
    await page.click('[data-testid="generate-report"]');
    await page.selectOption('[data-testid="report-type"]', 'gdpr-compliance');
    await page.fill('[data-testid="report-period-from"]', '2024-01-01');
    await page.fill('[data-testid="report-period-to"]', '2024-12-31');
    
    await page.click('[data-testid="start-report-generation"]');
    await expect(page.locator('[data-testid="report-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="report-ready"]')).toBeVisible({ timeout: 15000 });
    
    // Download report
    await page.click('[data-testid="download-report"]');
    
    // Step 5: Audit Trail
    await page.goto('/compliance/audit');
    
    // Search audit trail
    await page.fill('[data-testid="audit-search"]', 'data request');
    await page.click('[data-testid="search-audit"]');
    
    await expect(page.locator('[data-testid="audit-entry"]')).toContainText('Data request created');
    
    // Export audit trail
    await page.click('[data-testid="export-audit"]');
    await page.selectOption('[data-testid="export-format"]', 'csv');
    await page.click('[data-testid="start-audit-export"]');
    
    await expect(page.locator('[data-testid="audit-export-ready"]')).toBeVisible({ timeout: 10000 });
  });
});