import { test, expect } from '@playwright/test';

test('reduced motion keeps the homepage, navigation and sign-in accessible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/app');
  await page.getByRole('button', { name: 'Allow saved preferences', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Compete. Solve./ })).toBeVisible();
  await expect(page.locator('.cc-hero-copy')).toHaveCSS('animation-name', 'none');
  await page.locator('#how-it-works').scrollIntoViewIfNeeded();
  await expect(page.getByRole('heading', { name: 'From queue to code.' })).toBeVisible();
  expect(
    await page.locator('.cc-home').evaluate((root) => root.getAnimations({ subtree: true }).length),
  ).toBe(0);
  await page.getByRole('button', { name: 'Leaderboard', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'The leaderboard.' })).toBeVisible();
  await page.getByRole('button', { name: 'The arena', exact: true }).click();
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCSS('animation-name', 'none');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('motion is available without moving content outside the mobile viewport', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app');
  await page.getByRole('button', { name: 'Allow saved preferences', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Compete. Solve./ })).toBeVisible();
  await expect(page.locator('.cc-demo-stage')).toHaveCSS('animation-name', 'duel-reveal');
  await page.locator('.cc-banner').scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: /Start competing/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(page.getByRole('dialog')).toHaveCSS('animation-name', 'cc-dialog-in');
  await expect(page.getByRole('dialog')).toHaveCSS('opacity', '1');
  await page.screenshot({ path: 'artifacts/motion-signin-mobile.png' });
});
