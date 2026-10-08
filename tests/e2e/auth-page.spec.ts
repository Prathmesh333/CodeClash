import { test, expect } from '@playwright/test';

test('opening page, registration, session redirect and logout work', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Essential only', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Put your Python/ })).toBeVisible();
  await page.getByRole('link', { name: 'Create account', exact: true }).click();
  await expect(page).toHaveURL(/\/register$/);
  await expect(page.getByRole('heading', { name: 'Make it your arena.' })).toBeVisible();
  await page.getByRole('button', { name: /AdaByte/ }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole('button', { name: /AdaByte Sign out/ })).toBeVisible();
  await page.goto('/login');
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole('heading', { name: /Put your Python/ })).not.toBeVisible();
  await page.getByRole('button', { name: /AdaByte Sign out/ }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: /Put your Python/ })).toBeVisible();
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
  await expect(
    page.getByRole('link', { name: /Continue with Google/ }).locator('.provider-logo'),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: /Continue with GitHub/ }).locator('.provider-logo'),
  ).toBeVisible();
  await page.getByLabel('Or use your email').fill('player@example.com');
  await page.getByRole('button', { name: 'Email me a sign-in link' }).click();
  await expect(page.getByRole('status')).toHaveText('Check your inbox.');
  await page.screenshot({ path: 'artifacts/auth-desktop.png', fullPage: true });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(
    await page
      .locator('.preview-result-check')
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

test('signed-out users cannot bypass sign-in through app or arbitrary paths', async ({
  page,
  request,
}) => {
  for (const path of ['/app', '/app/match/anything', '/top', '/top?tab=arena', '/anything/else']) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(302);
    expect(new URL(response.headers().location).pathname).toBe('/login');
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator('.player-dashboard')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /Put your Python/ })).toBeVisible();
  }
  expect((await request.get('/api/leaderboard')).status()).toBe(401);
  expect((await request.get('/api/matches')).status()).toBe(401);
});

test('expired sessions return the player to login instead of keeping the app visible', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Essential only', exact: true }).click();
  await page.getByRole('button', { name: /AdaByte/ }).click();
  await expect(page.locator('.player-dashboard')).toBeVisible();
  await page.route('**/api/matchmaking/join', async (route) => {
    await page.context().clearCookies();
    await route.fulfill({ status: 401, json: { message: 'Sign in to enter the arena.' } });
  });
  await page.getByRole('button', { name: /^Find a (casual )?match$/ }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator('.player-dashboard')).toHaveCount(0);
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

test('match preview follows every palette and lime themes share NVIDIA green', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Essential only', exact: true }).click();
  for (let index = 0; index < 11; index++) {
    await page.getByRole('button', { name: 'Change theme' }).click();
    const dialog = page.getByRole('dialog', { name: 'Make the arena yours.' });
    await dialog.locator('.theme-option').nth(index).click();
    await dialog.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Two Sum', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if ([0, 2, 8, 9, 10].includes(index)) {
      expect(
        await page.evaluate(() => document.documentElement.style.getPropertyValue('--cc-lime')),
      ).toBe('#76B900');
    }
    if (index === 2) await page.screenshot({ path: 'artifacts/auth-dark.png', fullPage: true });
  }
});
