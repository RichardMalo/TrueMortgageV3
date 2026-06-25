import { test, expect } from '@playwright/test';

test.describe('Debt Elimination Engine E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app (uses baseURL in config, i.e., http://localhost:5173)
    await page.goto('/');
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

    // Focus and fill downPayment with 0, then tab out to trigger change/blur events safely
    await downPaymentInput.fill('0');
    await downPaymentInput.press('Tab');

    // Focus and fill homePrice with 500000, then tab out
    await homePriceInput.fill('500000');
    await homePriceInput.press('Tab');

    // Focus and fill downPayment with 100000, then tab out
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
});
