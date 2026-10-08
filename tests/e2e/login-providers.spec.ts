import { test, expect } from '@playwright/test';
test('hosted sign-in exposes configured providers and submits email requests', async ({ page }) => {
  await page.route('**/api/health', (route) =>
    route.fulfill({
      json: {
        local: false,
        judge: 'unavailable',
        github: true,
        google: true,
        email: true,
        casual: true,
      },
    }),
  );
  await page.route('**/api/auth/email', async (route) => {
    expect(route.request().postDataJSON().email).toBe('coder@example.com');
    await route.fulfill({ json: { message: 'Check your inbox.' } });
  });
  await page.goto('/app');
  await page.getByRole('button', { name: 'Allow saved preferences', exact: true }).click();
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('link', { name: /Continue with Google/ })).toHaveAttribute(
    'href',
    '/api/auth/google',
  );
  await expect(dialog.getByRole('link', { name: /Continue with GitHub/ })).toHaveAttribute(
    'href',
    '/api/auth/github',
  );
  await dialog.getByLabel('Or use your email').fill('coder@example.com');
  await dialog.getByRole('button', { name: 'Email me a sign-in link' }).click();
  await expect(dialog.getByRole('status')).toHaveText('Check your inbox.');
});
test('unconfigured providers cannot start broken login flows', async ({ page }) => {
  await page.route('**/api/health', (route) =>
    route.fulfill({
      json: { local: false, judge: 'unavailable', github: true, google: false, email: false },
    }),
  );
  await page.goto('/app');
  await page.getByRole('button', { name: 'Allow saved preferences', exact: true }).click();
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Google · Coming soon' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Email sign-in · Coming soon' })).toBeDisabled();
});
