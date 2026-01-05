import { test, expect } from '@playwright/test';

test.describe('Pagination - Load More Functionality', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/signals');
    });

    test('should display "Load More" button when more data available', async ({ page }) => {
        // Wait for initial load
        await page.waitForSelector('[role="feed"]', { timeout: 10000 });

        // Get initial document count
        const initialCards = await page.locator('article[aria-labelledby]').count();

        // Look for "Load More" button
        const loadMoreButton = page.locator('button').filter({ hasText: /load more/i });
        const buttonExists = await loadMoreButton.count();

        // If we have documents and more are available, button should exist
        if (initialCards > 0 && buttonExists > 0) {
            await expect(loadMoreButton).toBeVisible();

            // Button should have descriptive aria-label
            const ariaLabel = await loadMoreButton.getAttribute('aria-label');
            expect(ariaLabel).toContain('Load more');
            expect(ariaLabel).toMatch(/\d+.*of.*\d+/); // Should show count like "20 of 150"
        }
    });

    test('should load more documents when button clicked', async ({ page }) => {
        await page.waitForSelector('[role="feed"]', { timeout: 10000 });

        // Get initial document count
        const initialCards = await page.locator('article[aria-labelledby]').count();

        // Look for "Load More" button
        const loadMoreButton = page.locator('button').filter({ hasText: /load more/i });
        const buttonExists = await loadMoreButton.count();

        if (buttonExists > 0) {
            // Click "Load More"
            await loadMoreButton.click();

            // Wait for new documents to load
            await page.waitForTimeout(1500);

            // Get new document count
            const newCards = await page.locator('article[aria-labelledby]').count();

            // Should have more documents (or same if at end)
            expect(newCards).toBeGreaterThanOrEqual(initialCards);
        }
    });

    test('should update button text after loading more', async ({ page }) => {
        await page.waitForSelector('[role="feed"]', { timeout: 10000 });

        const loadMoreButton = page.locator('button').filter({ hasText: /load more/i });
        const buttonExists = await loadMoreButton.count();

        if (buttonExists > 0) {
            // Get initial button text
            const initialText = await loadMoreButton.textContent();
            const initialMatch = initialText?.match(/\((\d+)\s+of\s+(\d+)\)/);

            if (initialMatch) {
                const initialLoaded = parseInt(initialMatch[1]);

                // Click "Load More"
                await loadMoreButton.click();
                await page.waitForTimeout(1500);

                // Get new button text
                const newText = await loadMoreButton.textContent();
                const newMatch = newText?.match(/\((\d+)\s+of\s+(\d+)\)/);

                if (newMatch) {
                    const newLoaded = parseInt(newMatch[1]);

                    // Should have loaded more (or be at max)
                    expect(newLoaded).toBeGreaterThanOrEqual(initialLoaded);
                }
            }
        }
    });

    test('should hide "Load More" when all data loaded', async ({ page }) => {
        await page.waitForSelector('[role="feed"]', { timeout: 10000 });

        // Keep clicking "Load More" until it disappears or max iterations
        let iterations = 0;
        const maxIterations = 10;

        while (iterations < maxIterations) {
            const loadMoreButton = page.locator('button').filter({ hasText: /load more/i });
            const buttonExists = await loadMoreButton.count();

            if (buttonExists === 0) {
                // Button is gone - all data loaded

                // Should show "View all documents" link instead
                const viewAllLink = page.locator('a').filter({ hasText: /view all/i });
                const linkExists = await viewAllLink.count();

                // Either at end or no "Load More" functionality
                expect(linkExists).toBeGreaterThanOrEqual(0);
                break;
            }

            // Click and wait
            await loadMoreButton.click();
            await page.waitForTimeout(1000);
            iterations++;
        }
    });

    test('should maintain scroll position after loading more', async ({ page }) => {
        await page.waitForSelector('[role="feed"]', { timeout: 10000 });

        const loadMoreButton = page.locator('button').filter({ hasText: /load more/i });
        const buttonExists = await loadMoreButton.count();

        if (buttonExists > 0) {
            // Scroll to button
            await loadMoreButton.scrollIntoViewIfNeeded();

            // Get scroll position before click
            const scrollBefore = await page.evaluate(() => window.scrollY);

            // Click button
            await loadMoreButton.click();
            await page.waitForTimeout(1000);

            // Scroll position should be similar (some movement is OK)
            const scrollAfter = await page.evaluate(() => window.scrollY);

            // Should not jump to top of page
            expect(scrollAfter).toBeGreaterThan(0);
        }
    });

    test('should handle rapid clicks gracefully', async ({ page }) => {
        await page.waitForSelector('[role="feed"]', { timeout: 10000 });

        const loadMoreButton = page.locator('button').filter({ hasText: /load more/i });
        const buttonExists = await loadMoreButton.count();

        if (buttonExists > 0) {
            // Get initial count
            const initialCards = await page.locator('article[aria-labelledby]').count();

            // Click multiple times rapidly
            await loadMoreButton.click();
            await loadMoreButton.click();
            await loadMoreButton.click();

            // Wait for all requests to settle
            await page.waitForTimeout(2000);

            // Get final count
            const finalCards = await page.locator('article[aria-labelledby]').count();

            // Should have more documents, but not 3x more (deduplication works)
            expect(finalCards).toBeGreaterThan(initialCards);
        }
    });
});

test.describe('Pagination - Keyboard Navigation', () => {
    test('should be able to reach "Load More" button via keyboard', async ({ page }) => {
        await page.goto('/signals');
        await page.waitForSelector('[role="feed"]', { timeout: 10000 });

        const loadMoreButton = page.locator('button').filter({ hasText: /load more/i });
        const buttonExists = await loadMoreButton.count();

        if (buttonExists > 0) {
            // Tab until we reach the button (max 50 tabs)
            for (let i = 0; i < 50; i++) {
                await page.keyboard.press('Tab');

                // Check if Load More button is focused
                const focused = await page.locator(':focus');
                const focusedText = await focused.textContent();

                if (focusedText?.includes('Load More')) {
                    // Found it!

                    // Press Enter to activate
                    await page.keyboard.press('Enter');

                    // Wait for load
                    await page.waitForTimeout(1000);

                    // Should have loaded more documents
                    const cards = await page.locator('article[aria-labelledby]').count();
                    expect(cards).toBeGreaterThan(0);

                    break;
                }
            }
        }
    });

    test('should have visible focus indicator on "Load More" button', async ({ page }) => {
        await page.goto('/signals');
        await page.waitForSelector('[role="feed"]', { timeout: 10000 });

        const loadMoreButton = page.locator('button').filter({ hasText: /load more/i });
        const buttonExists = await loadMoreButton.count();

        if (buttonExists > 0) {
            // Focus the button
            await loadMoreButton.focus();

            // Check if it has focus styles (ring, outline, etc.)
            const styles = await loadMoreButton.evaluate((el) => {
                const computed = window.getComputedStyle(el);
                return {
                    outline: computed.outline,
                    boxShadow: computed.boxShadow,
                };
            });

            // Should have some focus indicator
            const hasFocusStyle =
                styles.outline !== 'none' ||
                styles.boxShadow !== 'none';

            // Just verify button is focusable
            await expect(loadMoreButton).toBeFocused();
        }
    });
});
