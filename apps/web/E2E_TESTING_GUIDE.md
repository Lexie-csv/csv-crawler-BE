# End-to-End Testing Guide

## Overview

This document provides comprehensive guidance on running and writing E2E tests for the CSV Policy & Data Crawler application using Playwright.

## Test Suite Organization

```
apps/web/e2e/
├── signals.spec.ts          # Signals/Dashboard page tests
├── newsletters.spec.ts      # Newsletters list and detail page tests
└── pagination.spec.ts       # Load More pagination tests
```

## Running Tests

### Prerequisites

1. **Install dependencies:**
   ```bash
   cd apps/web
   pnpm install
   ```

2. **Install Playwright browsers:**
   ```bash
   pnpm exec playwright install chromium
   ```

3. **Start the application:**
   ```bash
   # Terminal 1: Start API server
   cd apps/api
   pnpm dev

   # Terminal 2: Start web server
   cd apps/web
   pnpm dev
   ```

### Run All Tests

```bash
cd apps/web

# Run all tests headless
pnpm e2e

# Run tests with UI mode (recommended for development)
pnpm e2e:ui

# Run specific test file
pnpm exec playwright test e2e/signals.spec.ts

# Run tests in headed mode (see browser)
pnpm exec playwright test --headed

# Run tests in debug mode
pnpm exec playwright test --debug
```

### Test Reports

After running tests, view the HTML report:

```bash
pnpm exec playwright show-report
```

## Test Coverage

### Signals Page (`signals.spec.ts`)

✅ **Page Load:**
- Page title displays correctly
- URL navigation works
- Page loads without errors

✅ **KPI Stats:**
- 4 stat cards display (New Signals, New Alerts, Sources Monitored, Latest Newsletter)
- Stat values load (not stuck on "—" loading indicator)
- Stats are accessible (role="region")

✅ **Document Feed:**
- Document cards display with proper ARIA labels
- Each card shows title, time, "View Source" link
- Cards use semantic HTML (`<article>`, `<time>`)

✅ **Filters:**
- Filter fieldset is present
- Time range, document type, source filters display
- Filters have descriptive aria-labels
- Filter changes update document list

✅ **Accessibility:**
- Keyboard navigation works (Tab, Shift+Tab)
- Elements have visible focus indicators
- Screen reader attributes present (aria-label, role)

✅ **States:**
- Loading states display correctly
- Empty states show helpful messages
- Error states handled gracefully

### Newsletters Pages (`newsletters.spec.ts`)

✅ **List Page:**
- Table displays with headers
- Newsletter rows show source, date, actions
- "View" links navigate to detail pages
- Pagination controls exist (if applicable)
- Empty state handles no newsletters

✅ **Detail Page:**
- Newsletter content displays
- Highlights section shows key points
- Datapoints section shows metrics
- Back navigation button works
- Print/download functionality (if implemented)
- 404 handling for invalid IDs

✅ **Navigation Flow:**
- Can navigate from list → detail → back to list
- URLs update correctly
- Browser back button works

### Pagination (`pagination.spec.ts`)

✅ **Load More Button:**
- Button displays when more data available
- Button has descriptive aria-label ("Load more documents. Currently showing X of Y")
- Button text updates after loading ("20 of 150" → "40 of 150")
- Button hides when all data loaded
- "View all documents" link appears at end

✅ **Loading Behavior:**
- Clicking button loads more documents
- Document count increases
- Scroll position maintained
- Rapid clicks handled gracefully (no duplicate loads)

✅ **Keyboard Accessibility:**
- Button reachable via Tab key
- Enter key activates button
- Visible focus indicator present

## Writing New Tests

### Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to page before each test
    await page.goto('/your-page');
  });

  test('should do something specific', async ({ page }) => {
    // 1. Arrange: Set up test conditions
    await page.waitForLoadState('networkidle');

    // 2. Act: Perform user actions
    const button = page.locator('button').filter({ hasText: 'Click me' });
    await button.click();

    // 3. Assert: Verify expected outcomes
    await expect(page.locator('text=Success')).toBeVisible();
  });
});
```

### Best Practices

#### 1. Use Accessible Selectors

```typescript
// ✅ Good - Uses semantic HTML and ARIA
page.locator('[role="region"]')
page.locator('article[aria-labelledby]')
page.locator('[aria-label="Load more documents"]')

// ❌ Bad - Fragile, implementation-dependent
page.locator('.stat-card')
page.locator('#document-123')
page.locator('div > div > div:nth-child(3)')
```

#### 2. Wait for Content

```typescript
// ✅ Good - Explicit waits
await page.waitForSelector('[role="feed"]', { timeout: 10000 });
await page.waitForLoadState('networkidle');

// ❌ Bad - Fixed timeouts (flaky)
await page.waitForTimeout(3000);
```

#### 3. Handle Dynamic Data

```typescript
// ✅ Good - Checks for data presence first
const cards = await page.locator('article').count();
if (cards > 0) {
  const firstCard = page.locator('article').first();
  await expect(firstCard).toBeVisible();
}

// ❌ Bad - Assumes data always exists
const firstCard = page.locator('article').first();
await expect(firstCard).toBeVisible(); // May fail if no data
```

#### 4. Test User Flows, Not Implementation

```typescript
// ✅ Good - Tests what user sees/does
test('should load more documents when button clicked', async ({ page }) => {
  const initialCount = await page.locator('article').count();
  await page.locator('button').filter({ hasText: 'Load More' }).click();
  await page.waitForTimeout(1000);
  const newCount = await page.locator('article').count();
  expect(newCount).toBeGreaterThan(initialCount);
});

// ❌ Bad - Tests internal state
test('should increment limit state on click', async ({ page }) => {
  // Can't directly test React state in E2E
});
```

#### 5. Use Descriptive Test Names

```typescript
// ✅ Good - Clear what's being tested
test('should display "Load More" button when more data available')
test('should hide button and show "View all" link when all data loaded')

// ❌ Bad - Vague or technical
test('load more works')
test('hasMore is false')
```

## Common Patterns

### Testing Forms

```typescript
test('should filter documents by time range', async ({ page }) => {
  await page.goto('/signals');
  
  // Fill form
  const timeFilter = page.locator('[aria-label*="time range"]');
  await timeFilter.click();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  
  // Verify results updated
  await page.waitForTimeout(1000);
  const count = await page.locator('article').count();
  expect(count).toBeGreaterThanOrEqual(0);
});
```

### Testing Navigation

```typescript
test('should navigate to detail page', async ({ page }) => {
  await page.goto('/newsletters');
  
  const firstLink = page.locator('a').filter({ hasText: 'View' }).first();
  await firstLink.click();
  
  await expect(page).toHaveURL(/\/newsletters\/[a-f0-9-]+/);
});
```

### Testing Accessibility

```typescript
test('should have keyboard navigation', async ({ page }) => {
  await page.goto('/signals');
  
  // Tab through elements
  await page.keyboard.press('Tab');
  const focused = await page.locator(':focus');
  await expect(focused).toBeVisible();
  
  // Check focus indicator
  const styles = await focused.evaluate(el => 
    window.getComputedStyle(el).outline
  );
  expect(styles).not.toBe('none');
});
```

### Testing Error States

```typescript
test('should handle API errors gracefully', async ({ page }) => {
  // Intercept API and return error
  await page.route('**/api/v1/documents', route => 
    route.fulfill({ status: 500, body: 'Server error' })
  );
  
  await page.goto('/signals');
  
  // Should show error message
  const error = page.locator('[role="alert"]');
  await expect(error).toBeVisible();
});
```

### Testing Loading States

```typescript
test('should show loading indicator', async ({ page }) => {
  // Slow down API responses
  await page.route('**/api/v1/**', async route => {
    await page.waitForTimeout(500);
    await route.continue();
  });
  
  await page.goto('/signals');
  
  // Check for loading state
  const loading = page.locator('[role="status"][aria-live="polite"]');
  // May or may not catch it depending on timing
});
```

## Debugging Tests

### Visual Debugging

```bash
# Run with UI mode (best for debugging)
pnpm e2e:ui

# Run in headed mode (see browser)
pnpm exec playwright test --headed

# Run in debug mode (step through)
pnpm exec playwright test --debug
```

### Using `page.pause()`

```typescript
test('debug test', async ({ page }) => {
  await page.goto('/signals');
  
  // Pause execution here - Playwright Inspector opens
  await page.pause();
  
  // Continue with test...
});
```

### Screenshots and Videos

Playwright automatically captures:
- **Screenshots** on failure
- **Videos** on failure  
- **Traces** on retry

View in HTML report:
```bash
pnpm exec playwright show-report
```

### Console Logs

```typescript
test('debug with console', async ({ page }) => {
  // Listen to console messages
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  await page.goto('/signals');
});
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps chromium
      
      - name: Start database
        run: docker-compose up -d postgres
      
      - name: Run migrations
        run: pnpm db:migrate
      
      - name: Start API server
        run: pnpm --filter @csv/api dev &
      
      - name: Start web server
        run: pnpm --filter @csv/web dev &
      
      - name: Wait for servers
        run: sleep 10
      
      - name: Run E2E tests
        run: pnpm --filter @csv/web e2e
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: apps/web/playwright-report/
```

## Test Data Management

### Using Test Database

For reliable tests, use a separate test database:

```bash
# .env.test
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/csv_crawler_test
```

### Seeding Test Data

```typescript
import { test as setup } from '@playwright/test';

setup('seed test data', async ({ request }) => {
  // Create test newsletters
  await request.post('http://localhost:3001/api/v1/digests', {
    data: {
      // Test data
    },
  });
});
```

## Performance Testing

Track Core Web Vitals:

```typescript
test('should have good performance metrics', async ({ page }) => {
  await page.goto('/signals');
  
  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0];
    return {
      loadTime: navigation.loadEventEnd - navigation.fetchStart,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
    };
  });
  
  expect(metrics.loadTime).toBeLessThan(3000);
});
```

## Troubleshooting

### Tests Timing Out

```typescript
// Increase timeout for slow operations
test('slow test', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds
  
  await page.goto('/signals');
  await page.waitForSelector('[role="feed"]', { timeout: 30000 });
});
```

### Flaky Tests

```typescript
// Add retries for specific tests
test('flaky test', async ({ page }) => {
  test.retries(2); // Retry up to 2 times
  
  // Test code...
});
```

### Port Conflicts

```bash
# Kill processes on ports before testing
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

## Resources

- **Playwright Docs**: https://playwright.dev
- **Best Practices**: https://playwright.dev/docs/best-practices
- **API Reference**: https://playwright.dev/docs/api/class-test
- **Debugging Guide**: https://playwright.dev/docs/debug
- **CI Examples**: https://playwright.dev/docs/ci

---

**Last Updated**: 2025-12-16  
**Maintained By**: CSV Team  
**Test Framework**: Playwright v1.57+
