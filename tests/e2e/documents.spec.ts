import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Document Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.fill('input[name="identifier"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    
    // Navigate to documents
    await page.click('[data-testid="nav-documents"]');
    await page.waitForURL('/documents');
  });

  test('should display documents list', async ({ page }) => {
    await expect(page.locator('[data-testid="documents-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="upload-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible();
  });

  test('should upload a document', async ({ page }) => {
    // Click upload button
    await page.click('[data-testid="upload-button"]');
    
    // Wait for upload modal
    await expect(page.locator('[data-testid="upload-modal"]')).toBeVisible();
    
    // Create a test file
    const testFile = path.join(__dirname, '../fixtures/test-document.pdf');
    
    // Upload file
    await page.setInputFiles('[data-testid="file-input"]', testFile);
    
    // Fill document details
    await page.fill('[data-testid="document-title"]', 'Test Document');
    await page.fill('[data-testid="document-description"]', 'This is a test document');
    
    // Submit upload
    await page.click('[data-testid="upload-submit"]');
    
    // Wait for success message
    await expect(page.locator('text=Documento caricato con successo')).toBeVisible();
    
    // Check if document appears in list
    await expect(page.locator('text=Test Document')).toBeVisible();
  });

  test('should search documents', async ({ page }) => {
    // Type in search input
    await page.fill('[data-testid="search-input"]', 'test');
    
    // Wait for search results
    await page.waitForTimeout(500);
    
    // Check if search results are filtered
    const documentItems = page.locator('[data-testid="document-item"]');
    await expect(documentItems).toHaveCount(1);
  });

  test('should filter documents by category', async ({ page }) => {
    // Click category filter
    await page.click('[data-testid="category-filter"]');
    await page.click('[data-testid="category-contracts"]');
    
    // Wait for filter to apply
    await page.waitForTimeout(500);
    
    // Check if only contract documents are shown
    const documentItems = page.locator('[data-testid="document-item"]');
    const contractBadges = page.locator('[data-testid="category-badge"]:has-text("Contratti")');
    
    const itemCount = await documentItems.count();
    const badgeCount = await contractBadges.count();
    
    expect(itemCount).toBe(badgeCount);
  });

  test('should view document details', async ({ page }) => {
    // Click on first document
    await page.click('[data-testid="document-item"]:first-child');
    
    // Wait for document details modal
    await expect(page.locator('[data-testid="document-details-modal"]')).toBeVisible();
    
    // Check if document details are displayed
    await expect(page.locator('[data-testid="document-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="document-description"]')).toBeVisible();
    await expect(page.locator('[data-testid="document-metadata"]')).toBeVisible();
  });

  test('should download document', async ({ page }) => {
    // Click on first document
    await page.click('[data-testid="document-item"]:first-child');
    
    // Wait for document details modal
    await expect(page.locator('[data-testid="document-details-modal"]')).toBeVisible();
    
    // Start download
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-button"]');
    const download = await downloadPromise;
    
    // Check if download started
    expect(download.suggestedFilename()).toBeTruthy();
  });

  test('should share document', async ({ page }) => {
    // Click on first document
    await page.click('[data-testid="document-item"]:first-child');
    
    // Wait for document details modal
    await expect(page.locator('[data-testid="document-details-modal"]')).toBeVisible();
    
    // Click share button
    await page.click('[data-testid="share-button"]');
    
    // Wait for share modal
    await expect(page.locator('[data-testid="share-modal"]')).toBeVisible();
    
    // Generate share link
    await page.click('[data-testid="generate-link-button"]');
    
    // Check if share link is generated
    await expect(page.locator('[data-testid="share-link"]')).toBeVisible();
    
    // Copy link to clipboard
    await page.click('[data-testid="copy-link-button"]');
    
    // Check for success message
    await expect(page.locator('text=Link copiato negli appunti')).toBeVisible();
  });

  test('should delete document', async ({ page }) => {
    // Click on document actions menu
    await page.click('[data-testid="document-actions"]:first-child');
    await page.click('[data-testid="delete-document"]');
    
    // Wait for confirmation modal
    await expect(page.locator('[data-testid="delete-confirmation-modal"]')).toBeVisible();
    
    // Confirm deletion
    await page.click('[data-testid="confirm-delete"]');
    
    // Check for success message
    await expect(page.locator('text=Documento eliminato con successo')).toBeVisible();
  });

  test('should handle bulk operations', async ({ page }) => {
    // Select multiple documents
    await page.click('[data-testid="select-document"]:first-child');
    await page.click('[data-testid="select-document"]:nth-child(2)');
    
    // Check if bulk actions are visible
    await expect(page.locator('[data-testid="bulk-actions"]')).toBeVisible();
    
    // Perform bulk download
    await page.click('[data-testid="bulk-download"]');
    
    // Check for download initiation
    await expect(page.locator('text=Download avviato')).toBeVisible();
  });

  test('should handle document versioning', async ({ page }) => {
    // Click on first document
    await page.click('[data-testid="document-item"]:first-child');
    
    // Wait for document details modal
    await expect(page.locator('[data-testid="document-details-modal"]')).toBeVisible();
    
    // Click versions tab
    await page.click('[data-testid="versions-tab"]');
    
    // Check if versions list is visible
    await expect(page.locator('[data-testid="versions-list"]')).toBeVisible();
    
    // Upload new version
    await page.click('[data-testid="upload-new-version"]');
    
    const testFile = path.join(__dirname, '../fixtures/test-document-v2.pdf');
    await page.setInputFiles('[data-testid="version-file-input"]', testFile);
    
    await page.click('[data-testid="upload-version-submit"]');
    
    // Check for success message
    await expect(page.locator('text=Nuova versione caricata')).toBeVisible();
  });
});