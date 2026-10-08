import { test, expect } from '@playwright/test';

test('opening page, registration, session redirect and logout work', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Essential only', exact: true }).click();
  await expect(page.getByRole('heading', { name: /A good problem/ })).toBeVisible();
  await page.getByRole('link', { name: 'Create account', exact: true }).click();
  await expect(page).toHaveURL(/\/register$/);
  await expect(page.getByRole('heading', { name: 'Make it your arena.' })).toBeVisible();
  await page.getByRole('button', { name: /AdaByte/ }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole('button', { name: /AdaByte Sign out/ })).toBeVisible();
  await page.goto('/login');
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole('heading', { name: /A good problem/ })).not.toBeVisible();
  await page.getByRole('button', { name: /AdaByte Sign out/ }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: /A good problem/ })).toBeVisible();
});

test('opening page is responsive, uses reduced motion and submits provider requests', async ({
  page,
}) => {
  await page.route('**/api/health', (route) =>
    route.fulfill({ json: { local: false, github: true, google: true, email: true } }),
  );
  await page.route('**/api/auth/email', async (route) => {
    expect(route.request().postDataJSON().email).toBe('player@example.com');
    await route.fulfill({ json: { message: 'Check your inbox.' } });
  });
  await page.goto('/login');
  await page.getByRole('button', { name: 'Essential only', exact: true }).click();
  await expect(page.getByRole('link', { name: /Continue with GitHub/ })).toHaveAttribute(
    'href',
    '/api/auth/github',
  );
  await expect(page.getByRole('link', { name: /Continue with Google/ })).toHaveAttribute(
    'href',
    '/api/auth/google',
  );
  await page.getByLabel('Or use your email').fill('player@example.com');
  await page.getByRole('button', { name: 'Email me a sign-in link' }).click();
  await expect(page.getByRole('status')).toHaveText('Check your inbox.');
  await page.screenshot({ path: 'artifacts/auth-desktop.png', fullPage: true });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(
    await page
      .locator('.duel-track i')
      .first()
      .evaluate((node) => getComputedStyle(node).animationName),
  ).toBe('none');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole('link', { name: /Continue with Google/ })).toBeVisible();
  await page.screenshot({ path: 'artifacts/auth-mobile.png', fullPage: true });
  await page.getByRole('link', { name: 'Skip to sign in' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#access')).toBeFocused();
});

test('session failure offers retry instead of treating an unknown session as signed out', async ({
  page,
}) => {
  await page.route('**/api/me', (route) =>
    route.fulfill({ status: 503, json: { message: 'Temporarily unavailable' } }),
  );
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
});
