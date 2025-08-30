import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login before accessibility tests
    await page.goto('/');
    await page.fill('input[name="identifier"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('login page should be accessible', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('dashboard should be accessible', async ({ page }) => {
    await page.goto('/dashboard');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('documents page should be accessible', async ({ page }) => {
    await page.goto('/documents');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('forms should have proper labels and ARIA attributes', async ({ page }) => {
    await page.goto('/documents');
    await page.click('[data-testid="upload-button"]');
    
    // Check form labels
    const titleInput = page.locator('[data-testid="document-title"]');
    const titleLabel = page.locator('label[for="document-title"]');
    
    await expect(titleLabel).toBeVisible();
    await expect(titleInput).toHaveAttribute('aria-labelledby');
    
    // Check required field indicators
    const requiredFields = page.locator('input[required]');
    const count = await requiredFields.count();
    
    for (let i = 0; i < count; i++) {
      const field = requiredFields.nth(i);
      await expect(field).toHaveAttribute('aria-required', 'true');
    }
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/documents');
    
    // Test tab navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.locator(':focus').getAttribute('data-testid');
    expect(focusedElement).toBeTruthy();
    
    // Continue tabbing through interactive elements
    const interactiveElements = [];
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const element = await page.locator(':focus').getAttribute('data-testid');
      if (element) {
        interactiveElements.push(element);
      }
    }
    
    // Should have navigated through multiple elements
    expect(interactiveElements.length).toBeGreaterThan(3);
  });

  test('should support screen reader navigation', async ({ page }) => {
    await page.goto('/documents');
    
    // Check for proper heading structure
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const headingCount = await headings.count();
    
    expect(headingCount).toBeGreaterThan(0);
    
    // Check for main landmark
    await expect(page.locator('main')).toBeVisible();
    
    // Check for navigation landmark
    await expect(page.locator('nav')).toBeVisible();
    
    // Check for proper list structure
    const lists = page.locator('ul[role="list"], ol[role="list"], ul:not([role]), ol:not([role])');
    const listCount = await lists.count();
    
    if (listCount > 0) {
      const firstList = lists.first();
      const listItems = firstList.locator('li');
      const itemCount = await listItems.count();
      expect(itemCount).toBeGreaterThan(0);
    }
  });

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/dashboard');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .include('[data-testid]')
      .analyze();
    
    // Filter for color contrast violations
    const contrastViolations = accessibilityScanResults.violations.filter(
      violation => violation.id === 'color-contrast'
    );
    
    expect(contrastViolations).toEqual([]);
  });

  test('should support high contrast mode', async ({ page }) => {
    // Simulate high contrast mode
    await page.emulateMedia({ colorScheme: 'dark', forcedColors: 'active' });
    await page.goto('/dashboard');
    
    // Check if elements are still visible and functional
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-menu"]')).toBeVisible();
    
    // Test button interactions in high contrast
    const button = page.locator('button').first();
    await expect(button).toBeVisible();
    await button.click();
  });

  test('should support zoom up to 200%', async ({ page }) => {
    await page.goto('/documents');
    
    // Set zoom to 200%
    await page.setViewportSize({ width: 640, height: 480 }); // Simulate 200% zoom
    
    // Check if content is still accessible
    await expect(page.locator('[data-testid="documents-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="upload-button"]')).toBeVisible();
    
    // Test horizontal scrolling doesn't break layout
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    
    // Should not require horizontal scrolling at 200% zoom
    expect(hasHorizontalScroll).toBe(false);
  });

  test('should provide alternative text for images', async ({ page }) => {
    await page.goto('/dashboard');
    
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < imageCount; i++) {
      const image = images.nth(i);
      const alt = await image.getAttribute('alt');
      const ariaLabel = await image.getAttribute('aria-label');
      const ariaLabelledby = await image.getAttribute('aria-labelledby');
      
      // Image should have alt text or ARIA label
      expect(alt !== null || ariaLabel !== null || ariaLabelledby !== null).toBe(true);
      
      // Alt text should not be empty for content images
      if (alt !== null) {
        const role = await image.getAttribute('role');
        if (role !== 'presentation' && role !== 'none') {
          expect(alt.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  test('should handle focus management in modals', async ({ page }) => {
    await page.goto('/documents');
    
    // Open modal
    await page.click('[data-testid="upload-button"]');
    await expect(page.locator('[data-testid="upload-modal"]')).toBeVisible();
    
    // Focus should be trapped in modal
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Tab through modal elements
    await page.keyboard.press('Tab');
    const secondFocus = await page.locator(':focus').getAttribute('data-testid');
    expect(secondFocus).toBeTruthy();
    
    // Escape should close modal
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="upload-modal"]')).not.toBeVisible();
    
    // Focus should return to trigger element
    const returnedFocus = await page.locator(':focus').getAttribute('data-testid');
    expect(returnedFocus).toBe('upload-button');
  });

  test('should provide error messages with proper ARIA attributes', async ({ page }) => {
    await page.goto('/documents');
    await page.click('[data-testid="upload-button"]');
    
    // Submit form without required fields
    await page.click('[data-testid="upload-submit"]');
    
    // Check for error messages
    const errorMessages = page.locator('[role="alert"], [aria-live="polite"], [aria-live="assertive"]');
    const errorCount = await errorMessages.count();
    
    expect(errorCount).toBeGreaterThan(0);
    
    // Check if form fields are associated with error messages
    const titleInput = page.locator('[data-testid="document-title"]');
    const ariaDescribedby = await titleInput.getAttribute('aria-describedby');
    
    if (ariaDescribedby) {
      const errorElement = page.locator(`#${ariaDescribedby}`);
      await expect(errorElement).toBeVisible();
    }
  });

  test('should support voice control and speech recognition', async ({ page }) => {
    await page.goto('/documents');
    
    // Check if interactive elements have accessible names
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const accessibleName = await button.evaluate(el => {
        // Get accessible name (text content, aria-label, or aria-labelledby)
        return el.textContent?.trim() || 
               el.getAttribute('aria-label') || 
               (el.getAttribute('aria-labelledby') && 
                document.getElementById(el.getAttribute('aria-labelledby')!)?.textContent?.trim()) ||
               el.getAttribute('title');
      });
      
      expect(accessibleName).toBeTruthy();
      expect(accessibleName!.length).toBeGreaterThan(0);
    }
  });

  test('should provide skip links for keyboard users', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Tab to first element (should be skip link)
    await page.keyboard.press('Tab');
    
    const firstFocusedElement = page.locator(':focus');
    const elementText = await firstFocusedElement.textContent();
    
    // Should have skip link as first focusable element
    expect(elementText?.toLowerCase()).toContain('skip');
    
    // Activate skip link
    await page.keyboard.press('Enter');
    
    // Focus should move to main content
    const newFocusedElement = page.locator(':focus');
    const newElementTag = await newFocusedElement.evaluate(el => el.tagName.toLowerCase());
    
    expect(['main', 'h1', 'h2'].includes(newElementTag)).toBe(true);
  });

  test('should handle reduced motion preferences', async ({ page }) => {
    // Simulate reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/dashboard');
    
    // Check if animations are disabled or reduced
    const animatedElements = page.locator('[class*="animate"], [class*="transition"]');
    const elementCount = await animatedElements.count();
    
    if (elementCount > 0) {
      // Check if CSS respects prefers-reduced-motion
      const respectsReducedMotion = await page.evaluate(() => {
        const style = getComputedStyle(document.body);
        return style.getPropertyValue('--animation-duration') === '0s' ||
               style.getPropertyValue('animation-duration') === '0s';
      });
      
      // Should respect reduced motion preference
      expect(respectsReducedMotion).toBe(true);
    }
  });

  test('should provide clear focus indicators', async ({ page }) => {
    await page.goto('/documents');
    
    // Tab through interactive elements
    const interactiveElements = page.locator('button, input, select, textarea, a[href]');
    const elementCount = await interactiveElements.count();
    
    for (let i = 0; i < Math.min(elementCount, 5); i++) {
      await page.keyboard.press('Tab');
      
      const focusedElement = page.locator(':focus');
      
      // Check if focus indicator is visible
      const focusStyles = await focusedElement.evaluate(el => {
        const styles = getComputedStyle(el);
        return {
          outline: styles.outline,
          outlineWidth: styles.outlineWidth,
          outlineStyle: styles.outlineStyle,
          boxShadow: styles.boxShadow
        };
      });
      
      // Should have visible focus indicator
      const hasFocusIndicator = 
        focusStyles.outline !== 'none' ||
        focusStyles.outlineWidth !== '0px' ||
        focusStyles.boxShadow !== 'none';
      
      expect(hasFocusIndicator).toBe(true);
    }
  });
});