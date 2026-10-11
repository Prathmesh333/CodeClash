import { test, expect } from '@playwright/test';
test('solo practice runs Python examples, saves per-account progress, filters and chooses another problem', async ({
  page,
}) => {
  await page.goto('/app');
  const consent = page.getByRole('button', { name: 'Essential only', exact: true });
  if (await consent.isVisible()) await consent.click();
  await page.getByRole('button', { name: /AdaByte/ }).click();
  await page.getByRole('button', { name: 'Solo practice', exact: true }).click();
  await expect(page.getByText('153 problems', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: /Duplicate manifest/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Duplicate manifest', exact: true }),
  ).toBeVisible();
  const editor = page.getByRole('textbox', { name: 'Python solution editor' });
  await editor.focus();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.insertText(
    'import json\na = json.loads(input())\nprint(json.dumps(len(set(a)) != len(a)))',
  );
  await page.getByRole('button', { name: 'Run examples', exact: true }).click();
  await expect(page.getByText('Examples passed · saved (unverified)', { exact: true })).toBeVisible(
    { timeout: 90000 },
  );
  const saved = await page.request.get('/api/practice/practice-duplicate-manifest');
  expect((await saved.json()).progress.status).toBe('examples_passed');
  await page.reload();
  await page.getByRole('button', { name: 'Solo practice', exact: true }).click();
  await page.getByLabel('Topic', { exact: true }).selectOption('Tries');
  await expect(page.getByText('3 matching problems', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Random problem', exact: true }).click();
  await expect(page.locator('.practice-statement h2')).toBeVisible();
  await expect(page.getByText('One problem at a time. No timer.', { exact: false })).toBeVisible();
});
