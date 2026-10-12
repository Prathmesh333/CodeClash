import { test, expect } from '@playwright/test';
test('all palettes apply, persist, and remain usable on mobile', async ({ page }) => {
  await page.goto('/app');
  await page.getByRole('button', { name: 'Allow saved preferences', exact: true }).click();
  await page.getByRole('button', { name: /AdaByte/ }).click();
  if (await page.getByRole('button', { name: 'Settings', exact: true }).count())
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
  if (await page.getByRole('button', { name: 'Settings', exact: true }).count())
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Change theme' }).click();
  const dialog = page.getByRole('dialog', { name: 'Make the arena yours.' });
  await expect(dialog.locator('.theme-option')).toHaveCount(11);
  for (const button of await dialog.locator('.theme-option').all()) {
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(await page.locator('html').getAttribute('data-theme')).toBeTruthy();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await dialog.getByRole('button', { name: /Midnight Mint/ }).click();
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.locator('.cc-brand-name')).toHaveText('CODECLASH');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'midnight-mint');
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  await page.screenshot({ path: 'artifacts/arena-spacing-dark.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  if (await page.getByRole('button', { name: 'Settings', exact: true }).count())
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
  if (await page.getByRole('button', { name: 'Settings', exact: true }).count())
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Change theme' }).click();
  await dialog.getByRole('button', { name: /White \/ Citrus Play/ }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(dialog.locator('.theme-option').first()).toHaveCSS(
    'background-color',
    'rgb(255, 255, 255)',
  );
  await dialog.evaluate((node) => {
    node.scrollTop = 0;
  });
  await page.screenshot({ path: 'artifacts/theme-picker-mobile.png' });
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Change theme' })).toBeFocused();
});
