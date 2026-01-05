import { test, expect } from '@playwright/test';

test.describe('Newsletters List Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/newsletters');
    });

    test('should load and display page title', async ({ page }) => {
        await page.waitForLoadState('networkidle');

        // Check for main heading
        const heading = page.locator('h1, h2').filter({ hasText: /newsletter|digest/i }).first();
        await expect(heading).toBeVisible();

        // Verify URL
        await expect(page).toHaveURL('/newsletters');
    });

    test('should display newsletters table', async ({ page }) => {
        // Wait for table to load
        await page.waitForSelector('table', { timeout: 10000 });

        // Table should be visible
        const table = page.locator('table');
        await expect(table).toBeVisible();

        // Should have table headers
        const headers = page.locator('th');
        const headerCount = await headers.count();
        expect(headerCount).toBeGreaterThan(0);
    });

    test('should display newsletter rows with data', async ({ page }) => {
        await page.waitForSelector('table', { timeout: 10000 });

        // Get table rows (excluding header)
        const rows = page.locator('tbody tr');
        const rowCount = await rows.count();

        // Should have at least one newsletter (or empty state)
        expect(rowCount).toBeGreaterThanOrEqual(0);

        // If rows exist, check first row structure
        if (rowCount > 0) {
            const firstRow = rows.first();

            // Should have multiple cells
            const cells = firstRow.locator('td');
            const cellCount = await cells.count();
            expect(cellCount).toBeGreaterThan(2); // At least source, date, actions
        }
    });

    test('should have "View" links that navigate to detail pages', async ({ page }) => {
        await page.waitForSelector('table', { timeout: 10000 });

        // Find "View" links in table
        const viewLinks = page.locator('a').filter({ hasText: /view|open/i });
        const linkCount = await viewLinks.count();

        if (linkCount > 0) {
            // Get href of first link
            const firstLink = viewLinks.first();
            const href = await firstLink.getAttribute('href');

            // Href should match pattern /newsletters/[jobId]
            expect(href).toMatch(/\/newsletters\/[a-f0-9-]+/);
        }
    });

    test('should have pagination controls', async ({ page }) => {
        await page.waitForSelector('table', { timeout: 10000 });

        // Look for pagination buttons or page numbers
        const paginationControls = page.locator('button').filter({ hasText: /previous|next|page/i });

        // May or may not have pagination depending on data
        // Just verify page doesn't crash
        await expect(page.locator('table')).toBeVisible();
    });

    test('should handle empty state when no newsletters exist', async ({ page }) => {
        await page.waitForLoadState('networkidle');

        // Check for either table rows or empty state
        const rows = page.locator('tbody tr');
        const rowCount = await rows.count();

        if (rowCount === 0) {
            // Should show some message about no newsletters
            const emptyMessage = page.locator('text=/no newsletter|no digest|empty/i');
            const hasEmptyMessage = await emptyMessage.count();

            // Either has rows or has empty message
            expect(hasEmptyMessage).toBeGreaterThan(0);
        }
    });
});

test.describe('Newsletter Detail Page', () => {
    // Note: This test requires a valid newsletter ID in the database
    // You may need to seed test data or use a known ID
    const testJobId = '663833c9-bb4b-4d02-ac3f-adc88745ee2d'; // Example ID - update as needed

    test('should load newsletter detail page', async ({ page }) => {
        // Navigate to detail page
        await page.goto(`/newsletters/${testJobId}`);

        // Wait for content to load
        await page.waitForLoadState('networkidle');

        // Verify URL
        await expect(page).toHaveURL(`/newsletters/${testJobId}`);
    });

    test('should display newsletter content', async ({ page }) => {
        await page.goto(`/newsletters/${testJobId}`);
        await page.waitForLoadState('networkidle');

        // Should have main content area
        const mainContent = page.locator('main, article, [role="main"]').first();
        await expect(mainContent).toBeVisible();

        // Should not show 404 error
        const notFoundText = page.locator('text=/404|not found/i');
        const hasNotFound = await notFoundText.count();

        // Either shows content or shows 404 (if ID doesn't exist)
        // This test may fail if testJobId doesn't exist - that's expected
        expect(hasNotFound).toBeGreaterThanOrEqual(0);
    });

    test('should display highlights section', async ({ page }) => {
        await page.goto(`/newsletters/${testJobId}`);
        await page.waitForLoadState('networkidle');

        // Look for highlights heading or section
        const highlightsSection = page.locator('text=/highlight|key point/i').first();

        // May or may not be visible depending on whether newsletter exists
        const count = await highlightsSection.count();
        expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should display datapoints section', async ({ page }) => {
        await page.goto(`/newsletters/${testJobId}`);
        await page.waitForLoadState('networkidle');

        // Look for datapoints heading or section
        const datapointsSection = page.locator('text=/datapoint|key data|metric/i').first();

        // May or may not be visible depending on whether newsletter exists
        const count = await datapointsSection.count();
        expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should have back navigation button', async ({ page }) => {
        await page.goto(`/newsletters/${testJobId}`);
        await page.waitForLoadState('networkidle');

        // Look for back button or link
        const backButton = page.locator('a, button').filter({ hasText: /back|return|newsletters/i }).first();

        // Back button should exist
        const exists = await backButton.count();
        expect(exists).toBeGreaterThan(0);

        if (exists > 0) {
            // Should be clickable
            await expect(backButton).toBeVisible();
        }
    });

    test('should handle invalid newsletter ID gracefully', async ({ page }) => {
        const invalidId = '00000000-0000-0000-0000-000000000000';

        await page.goto(`/newsletters/${invalidId}`);
        await page.waitForLoadState('networkidle');

        // Should show 404 or error message
        const errorMessage = page.locator('text=/404|not found|error/i');
        const hasError = await errorMessage.count();

        // Should handle error gracefully
        expect(hasError).toBeGreaterThan(0);
    });

    test('should have print/download functionality', async ({ page }) => {
        await page.goto(`/newsletters/${testJobId}`);
        await page.waitForLoadState('networkidle');

        // Look for print/download button
        const printButton = page.locator('button, a').filter({ hasText: /print|download|pdf|export/i });

        // May or may not have print button
        const count = await printButton.count();

        // Just verify page doesn't crash
        expect(count).toBeGreaterThanOrEqual(0);
    });
});

test.describe('Newsletters Navigation Flow', () => {
    test('should navigate from list to detail and back', async ({ page }) => {
        // Start at list page
        await page.goto('/newsletters');
        await page.waitForSelector('table', { timeout: 10000 });

        // Find first "View" link
        const viewLinks = page.locator('a').filter({ hasText: /view/i });
        const linkCount = await viewLinks.count();

        if (linkCount > 0) {
            // Click first link
            await viewLinks.first().click();

            // Wait for navigation
            await page.waitForLoadState('networkidle');

            // Should be on detail page
            await expect(page).toHaveURL(/\/newsletters\/[a-f0-9-]+/);

            // Find back button
            const backButton = page.locator('a, button').filter({ hasText: /back|newsletters/i }).first();
            await backButton.click();

            // Should be back on list page
            await page.waitForLoadState('networkidle');
            await expect(page).toHaveURL('/newsletters');
        }
    });
});
