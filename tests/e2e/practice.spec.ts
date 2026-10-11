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
  await page.keyboard.insertText('def solve(data):\n    return len(set(data)) != len(data)');
  await page.getByRole('button', { name: 'Run examples', exact: true }).click();
  await expect(page.getByText('Examples passed · saved (unverified)', { exact: true })).toBeVisible(
    { timeout: 90000 },
  );
  await expect(page.getByRole('tab', { name: /Example 2 · Passed/ })).toBeVisible();
  await page.getByRole('tab', { name: /Example 2 · Passed/ }).click();
  await expect(page.getByRole('tabpanel')).toContainText('false');
  const separator = page.getByRole('separator', { name: 'Resize problem and editor', exact: true });
  const ratio = await separator.getAttribute('aria-valuenow');
  await separator.focus();
  await page.keyboard.press('ArrowRight');
  expect(await separator.getAttribute('aria-valuenow')).not.toBe(ratio);
  await page.getByRole('button', { name: 'Attempt history', exact: true }).click();
  await expect(page.getByText('2/2 examples passed · unverified', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Editorial', exact: true }).click();
  await page.getByText('Show reference Python solution', { exact: true }).click();
  await expect(page.getByText('Reference time: O(n)', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Custom input', exact: true }).click();
  await page.getByLabel('Custom input', { exact: true }).fill('[4,4]');
  await page.getByRole('button', { name: 'Run custom input', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Custom input · Finished', exact: true })).toBeVisible(
    { timeout: 90000 },
  );
  await expect(page.getByRole('tabpanel')).toContainText('true');
  await editor.focus();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.insertText('def solve(data):\n    return n');
  await page.getByRole('button', { name: 'Run custom input', exact: true }).click();
  await expect(page.getByRole('tabpanel').getByRole('alert')).toContainText(
    "Line 2: NameError: name 'n' is not defined",
    { timeout: 90000 },
  );
  await page.screenshot({ path: 'work/workspace-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Run examples', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'work/workspace-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1280, height: 720 });
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
