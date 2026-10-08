import { test, expect } from '@playwright/test';
test('players can update their profile and retain it after reload', async ({ page }) => {
  await page.goto('/app');
  await page.getByRole('button', { name: 'Allow saved preferences', exact: true }).click();
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /AdaByte/ })
    .click();
  await page.getByRole('button', { name: 'Edit profile' }).click();
  const dialog = page.getByRole('dialog', { name: 'Your player profile.' });
  await dialog.getByLabel('Username', { exact: true }).fill('ArenaNinja');
  await dialog.getByLabel('About you').fill('Learning Python, one duel at a time.');
  await dialog.getByRole('radio', { name: 'purple' }).check();
  await dialog.getByRole('button', { name: 'Save profile' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: /ArenaNinja Sign out/ })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Edit profile' }).click();
  await expect(dialog.getByLabel('Username', { exact: true })).toHaveValue('ArenaNinja');
  await expect(dialog.getByLabel('About you')).toHaveValue('Learning Python, one duel at a time.');
  await expect(dialog.getByRole('radio', { name: 'purple' })).toBeChecked();
  await page.keyboard.press('Escape');
});
