import { test, expect } from '@playwright/test';

test.describe('Debt Elimination Engine E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app (uses baseURL in config, i.e., http://localhost:5173)
    await page.goto('/');

    // Disable CSS animations/transitions for E2E speed and stability (prevent WebKit instability)
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          transition: none !important;
          animation: none !important;
          transition-duration: 0s !important;
          animation-duration: 0s !important;
        }
      `
    });
  });

  test('should render the dashboard and show initial correct default values', async ({ page }) => {
    // Check main title
    await expect(page.locator('h1')).toContainText('Debt Elimination Engine');

    // Check initial mortgage outputs
    const mortgageAmount = page.locator('#mortgageAmountDisplay');
    await expect(mortgageAmount).toHaveText('$640,000'); // 800k home - 160k down

    // Check payoff timeline
    const paidOffIn = page.locator('#paidOffIn');
    await expect(paidOffIn).toContainText('30 Years');
  });

  test('should toggle modes between Mortgage and Credit Card', async ({ page }) => {
    // Mode selector buttons
    const mortgageBtn = page.locator('.mode-btn[data-mode="mortgage"]');
    const ccBtn = page.locator('.mode-btn[data-mode="cc"]');

    // Click Credit Card Mode
    await ccBtn.click();
    await expect(page.locator('body')).toHaveClass(/mode-cc/);

    // Check that Revolving Debt title is visible and Property & Loan is hidden
    await expect(page.locator('text=Revolving Debt')).toBeVisible();
    await expect(page.locator('text=Property & Loan')).not.toBeVisible();

    // Click Mortgage Mode back
    await mortgageBtn.click();
    await expect(page.locator('body')).toHaveClass(/mode-mortgage/);
    await expect(page.locator('text=Property & Loan')).toBeVisible();
  });

  test('should trap focus inside the sync modal', async ({ page }) => {
    // Click Settings trigger
    await page.click('#settingsTrigger');

    // Click Secure Sync & Portability
    await page.click('#settingsOptSync');

    // Verify syncModal is visible
    const syncModal = page.locator('#syncModal');
    await expect(syncModal).toHaveClass(/active/);

    // Verify focus is trapped on first focusable element (close button)
    const closeBtn = page.locator('#closeSyncModalBtn');
    await expect(closeBtn).toBeFocused();

    // Press Escape, verify modal closes and focus returns to settings trigger
    await page.keyboard.press('Escape');
    await expect(syncModal).not.toHaveClass(/active/);
    await expect(page.locator('#settingsTrigger')).toBeFocused();
  });

  test('should calculate correct figures when inputs change', async ({ page }) => {
    const homePriceInput = page.locator('#homePrice');
    const downPaymentInput = page.locator('#downPayment');

    // Focus, fill downPayment with 0, and move focus via Tab
    await downPaymentInput.click();
    await downPaymentInput.fill('0');
    await downPaymentInput.press('Tab');

    // Focus, fill homePrice with 500000, and move focus via Tab
    await homePriceInput.click();
    await homePriceInput.fill('500000');
    await homePriceInput.press('Tab');

    // Focus, fill downPayment with 100000, and move focus via Tab
    await downPaymentInput.click();
    await downPaymentInput.fill('100000');
    await downPaymentInput.press('Tab');

    // Verify stats boxes update
    const mortgageAmount = page.locator('#mortgageAmountDisplay');
    await expect(mortgageAmount).toHaveText('$400,000');
  });

  test('should reorder cards using keyboard accessibility keys', async ({ page }) => {
    // Switch to Advanced Mode first so all bento cards are visible/active
    await page.click('#settingsTrigger');
    await page.click('.complexity-btn[data-complexity="advanced"]');
    // Click settings trigger again to close the settings menu
    await page.click('#settingsTrigger');

    const card1 = page.locator('.chart-wrapper').nth(0);
    const card2 = page.locator('.chart-wrapper').nth(1);

    // Get initial IDs of Plotly containers inside wrappers
    const initialId1 = await card1.locator('.plotly-container').getAttribute('id');
    const initialId2 = await card2.locator('.plotly-container').getAttribute('id');

    // Click card 1 to select
    await card1.focus();
    await page.keyboard.press('Enter');
    await expect(card1).toHaveClass(/selected-card/);

    // Click card 2 to swap
    await card2.focus();
    await page.keyboard.press('Enter');

    // Verify card1 loses selected-card class and visual swap occurs
    await expect(card1).not.toHaveClass(/selected-card/);

    // Read new visual order inside draggable container
    const newCard1 = page.locator('.chart-wrapper').nth(0);
    const newId1 = await newCard1.locator('.plotly-container').getAttribute('id');
    expect(newId1).toBe(initialId2);

    const newCard2 = page.locator('.chart-wrapper').nth(1);
    const newId2 = await newCard2.locator('.plotly-container').getAttribute('id');
    expect(newId2).toBe(initialId1);
  });

  test('should export the active strategy blueprint with only the active profile', async ({
    page
  }) => {
    // Open settings menu
    await page.click('#settingsTrigger');

    // Open Secure Sync modal
    await page.click('#settingsOptSync');

    // Make sure Export Scope defaults to active scenario
    const activeScopeBtn = page.locator('#export-scope-selector .scope-btn[data-scope="active"]');
    await expect(activeScopeBtn).toHaveClass(/active/);

    // Wait for download event when clicking export blueprint button
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('#exportBlueprintBtn')
    ]);

    // Verify downloaded filename matches active scenario filename pattern
    const filename = download.suggestedFilename();
    expect(filename).toContain('mtg_active_strategy_blueprint.json');

    // Read the file content
    const fs = await import('fs');
    const path = await download.path();
    const contents = fs.readFileSync(path, 'utf-8');
    const json = JSON.parse(contents);

    // Validate active blueprint structure contains version, activeProfileId, and profiles
    expect(json.version).toBe(2);
    expect(json.activeProfileId).toBeDefined();
    expect(Object.keys(json.profiles)).toHaveLength(1);
    expect(json.profiles[json.activeProfileId]).toBeDefined();
  });

  test('should toggle custom credit card minimum payment fields and calculate dynamically', async ({
    page
  }) => {
    // 1. Switch mode to CC
    await page.click('.mode-btn[data-mode="cc"]');
    await expect(page.locator('body')).toHaveClass(/mode-cc/);

    // 2. Switch complexity to Advanced
    await page.click('#settingsTrigger');
    await page.click('.complexity-btn[data-complexity="advanced"]');
    await page.click('#settingsTrigger'); // close dropdown

    // 3. Check custom CC fields are initially hidden
    const customSection = page.locator('#ccCustomMinPaymentSection');
    await expect(customSection).not.toBeVisible();

    // 4. Select CUSTOM minimum payment rule
    await page.selectOption('#province', 'CUSTOM');
    await expect(customSection).toBeVisible();

    // 5. Fill custom parameters
    await page.locator('#ccMinPercent').fill('4');
    await page.locator('#ccMinPercent').press('Tab');
    await page.locator('#ccMinPrincipalPct').fill('2');
    await page.locator('#ccMinPrincipalPct').press('Tab');
    await page.locator('#ccMinFlat').fill('25');
    await page.locator('#ccMinFlat').press('Tab');

    // Wait for the daily vampire drain output to exist/render
    const vampireText = page.locator('#dailyVampireDrain');
    await expect(vampireText).toBeVisible();
  });

  test('should customize widget visibility and grid layout width using layout modal', async ({
    page
  }) => {
    // 1. Switch complexity to Advanced so widgets are present
    await page.click('#settingsTrigger');
    await page.click('.complexity-btn[data-complexity="advanced"]');

    // 2. Open Layout modal
    await page.click('#settingsOptLayout');
    const layoutModal = page.locator('#layoutModal');
    await expect(layoutModal).toHaveClass(/active/);

    // 3. Verify focus is trapped inside the layout modal (on the close button)
    const closeBtn = page.locator('#closeLayoutModalBtn');
    await expect(closeBtn).toBeFocused();

    // 4. Toggle chart3 visibility (uncheck) and chart6 width (check full-width)
    const showChart3 = page.locator('#layoutShow-chart3');
    await expect(showChart3).toBeChecked();
    await showChart3.uncheck({ force: true });

    const fullChart6 = page.locator('#layoutFull-chart6');
    await expect(fullChart6).not.toBeChecked();
    await fullChart6.check({ force: true });

    // 5. Apply and save
    await page.click('#saveLayoutBtn');
    await expect(layoutModal).not.toHaveClass(/active/);

    // 6. Verify CSS classes applied to widget wrappers in the bento grid
    const chart3Wrapper = page.locator('#chart3').locator('..');
    await expect(chart3Wrapper).toHaveClass(/custom-hidden/);

    const chart6Wrapper = page.locator('#chart6').locator('..');
    await expect(chart6Wrapper).toHaveClass(/full-width/);
  });

  test('should dynamically add, edit, and delete scheduled lump sums', async ({ page }) => {
    // 1. Switch complexity to Advanced so scheduled lump sums sections are visible
    await page.click('#settingsTrigger');
    await page.click('.complexity-btn[data-complexity="advanced"]');
    await page.click('#settingsTrigger'); // close settings

    // 2. Click + Add Scheduled Row
    const addBtn = page.locator('#addLumpSumBtn');
    await addBtn.click();

    // 3. Verify a row with class lump-sum-row is added
    const row = page.locator('.lump-sum-row').first();
    await expect(row).toBeVisible();

    // 4. Fill amount and payment number
    const amountInput = row.locator('.lump-sum-amount');
    const paymentInput = row.locator('.lump-sum-payment-number');

    await amountInput.click();
    await amountInput.fill('15000');
    await amountInput.press('Tab');

    await paymentInput.click();
    await paymentInput.fill('24');
    await paymentInput.press('Tab');

    // 5. Verify dynamic date label updates correctly (should contain 2028)
    const dateLabel = row.locator('.lump-sum-date-badge');
    await expect(dateLabel).toContainText('2028');

    // 6. Delete the row
    const deleteBtn = row.locator('.lump-sum-delete-btn');
    await deleteBtn.click();

    // 7. Verify row is deleted
    await expect(row).not.toBeVisible();
  });

  test('should toggle term renewal milestone in amortization schedule table and chart', async ({
    page
  }) => {
    // 1. Verify toggle starts off checked
    const toggle = page.locator('#termMilestoneToggle');
    await expect(toggle).toBeChecked();

    // 2. Verify milestone banner exists in table
    const banner = page.locator('.term-divider-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('End of Term');

    // 3. Click toggle to turn OFF
    await toggle.click();
    await expect(toggle).not.toBeChecked();

    // 4. Verify milestone banner disappears from rendering
    await expect(banner).not.toBeVisible();

    // 5. Click toggle to turn back ON
    await toggle.click();
    await expect(toggle).toBeChecked();
    await expect(banner).toBeVisible();
  });
});
