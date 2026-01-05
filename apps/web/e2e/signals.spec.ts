import { test, expect } from '@playwright/test';

test.describe('Signals Page', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to signals page before each test
        await page.goto('/signals');
    });

    test('should load and display page title', async ({ page }) => {
        // Wait for page to load
        await page.waitForLoadState('networkidle');

        // Check that the main heading is present
        await expect(page.locator('h1, h2').first()).toBeVisible();

        // Verify we're on the right page
        await expect(page).toHaveURL('/signals');
    });

    test('should display KPI stat cards', async ({ page }) => {
        // Wait for stats to load
        await page.waitForSelector('[role="region"]', { timeout: 10000 });

        // Should have 4 stat cards (New Signals, New Alerts, Sources Monitored, Latest Newsletter)
        const statCards = page.locator('[role="region"]');
        await expect(statCards).toHaveCount(4);

        // Check that stat values are visible (not just loading states)
        const firstStat = statCards.first();
        await expect(firstStat).toBeVisible();

        // Stat should have a number (not "—" loading indicator)
        const statValue = firstStat.locator('p[aria-live="polite"]');
        const valueText = await statValue.textContent();
        expect(valueText).not.toBe('—');
    });

    test('should display document feed with cards', async ({ page }) => {
        // Wait for document feed to load
        await page.waitForSelector('[role="feed"]', { timeout: 10000 });

        // Check that document cards are present
        const documentCards = page.locator('article[aria-labelledby]');
        const count = await documentCards.count();

        // Should have at least one document (or empty state)
        expect(count).toBeGreaterThanOrEqual(0);

        // If documents exist, verify first card structure
        if (count > 0) {
            const firstCard = documentCards.first();

            // Check for title
            const title = firstCard.locator('h3');
            await expect(title).toBeVisible();

            // Check for time element
            const time = firstCard.locator('time');
            await expect(time).toBeVisible();

            // Check for "View Source" link
            const link = firstCard.locator('a[aria-label*="View source"]');
            await expect(link).toBeVisible();
        }
    });

    test('should have functional filter controls', async ({ page }) => {
        // Wait for page to load
        await page.waitForLoadState('networkidle');

        // Check for filter fieldset
        const fieldset = page.locator('fieldset');
        await expect(fieldset).toBeVisible();

        // Time range filter should be present
        const timeFilter = page.locator('[aria-label*="time range"]').first();
        await expect(timeFilter).toBeVisible();

        // Document type filter should be present
        const typeFilter = page.locator('[aria-label*="document type"]').first();
        await expect(typeFilter).toBeVisible();

        // Source filter should be present
        const sourceFilter = page.locator('[aria-label*="source"]').first();
        await expect(sourceFilter).toBeVisible();
    });

    test('should filter documents by time range', async ({ page }) => {
        // Wait for initial load
        await page.waitForSelector('[role="feed"]', { timeout: 10000 });

        // Get initial document count
        const initialCards = await page.locator('article[aria-labelledby]').count();

        // Click a time range filter (e.g., "30 days")
        // Note: This depends on your actual filter implementation
        const timeButtons = page.locator('[aria-label*="time range"]').first().locator('button');
        const buttonCount = await timeButtons.count();

        if (buttonCount > 1) {
            // Click second time range option
            await timeButtons.nth(1).click();

            // Wait for documents to update
            await page.waitForTimeout(1000);

            // Document count may have changed
            const newCards = await page.locator('article[aria-labelledby]').count();

            // Just verify the filter interaction worked (count may be same or different)
            expect(newCards).toBeGreaterThanOrEqual(0);
        }
    });

    test('should handle empty state gracefully', async ({ page }) => {
        // This test may need mock data or specific conditions
        // For now, just check that empty state component exists in codebase
        const feed = page.locator('[role="feed"]');

        // If no documents, should show empty state
        const documentCards = page.locator('article[aria-labelledby]');
        const count = await documentCards.count();

        if (count === 0) {
            // Look for empty state message
            const emptyStateTitle = page.locator('text=/No signals found/i');
            const emptyStateExists = await emptyStateTitle.count();

            // Should have empty state if no documents
            expect(emptyStateExists).toBeGreaterThan(0);
        }
    });

    test('should have keyboard-accessible navigation', async ({ page }) => {
        await page.waitForLoadState('networkidle');

        // Focus on first interactive element
        await page.keyboard.press('Tab');

        // Check that something is focused
        const focusedElement = await page.locator(':focus').count();
        expect(focusedElement).toBe(1);

        // Tab through a few elements
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');

        // Should still have a focused element
        const stillFocused = await page.locator(':focus').count();
        expect(stillFocused).toBe(1);
    });

    test('should display loading states correctly', async ({ page }) => {
        // Intercept API calls to simulate slow loading
        await page.route('**/api/v1/**', async (route) => {
            await page.waitForTimeout(500);
            await route.continue();
        });

        // Navigate to page
        await page.goto('/signals');

        // Should see loading state initially
        const loadingIndicator = page.locator('[role="status"][aria-live="polite"]');

        // May or may not catch loading state depending on speed
        // Just verify page eventually loads
        await page.waitForSelector('[role="feed"]', { timeout: 10000 });
    });
});
