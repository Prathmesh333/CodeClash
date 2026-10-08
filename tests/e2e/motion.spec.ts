import { test, expect } from '@playwright/test';
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
