import { test, expect } from '@playwright/test';
test('motion reaches sign-in, navigation and dialogs without delaying controls', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/login');
  expect(
    await page.locator('.auth-access').evaluate((el) => getComputedStyle(el).animationName),
  ).toBe('surface-arrive');
  await page.getByRole('button', { name: 'Allow saved preferences', exact: true }).click();
  await page.getByRole('button', { name: /AdaByte/ }).click();
  await expect(page.getByRole('heading', { name: 'Arena', exact: true })).toBeVisible();
  expect(
    await page.locator('.dashboard-history').evaluate((el) => getComputedStyle(el).animationName),
  ).toBe('surface-arrive');
  await page.getByRole('button', { name: 'Leaderboard', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Leaderboard', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Change theme' }).click();
  await expect(page.locator('.theme-dialog')).toBeVisible();
  expect(
    await page.locator('.theme-dialog').evaluate((el) => getComputedStyle(el).transitionProperty),
  ).toContain('transform');
  await page.keyboard.press('Escape');
  await expect(page.locator('.theme-dialog')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Change theme' })).toBeFocused();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'The arena', exact: true }).click();
  expect(
    await page.locator('#main').evaluate((el) => el.getAnimations({ subtree: true }).length),
  ).toBe(0);
});
test('reduced motion dashboard remains usable without decorative entrances', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/login');
  await page.getByRole('button', { name: 'Allow saved preferences', exact: true }).click();
  await page.getByRole('button', { name: /AdaByte/ }).click();
  await expect(page.getByRole('heading', { name: 'Arena', exact: true })).toBeVisible();
  expect(
    await page
      .locator('.player-dashboard')
      .evaluate((root) => root.getAnimations({ subtree: true }).length),
  ).toBe(0);
  await page.getByRole('button', { name: 'Leaderboard', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Leaderboard', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'The arena', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Find a match', exact: true })).toBeVisible();
  expect(await page.locator('body').innerText()).not.toMatch(/[→↗↘←]/);
});
