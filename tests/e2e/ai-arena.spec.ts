import { test, expect } from '@playwright/test';
test('AI Arena navigation, manifest, timed previews and reports', async ({ page, request }) => {
  test.setTimeout(120000);
  const manifest = await request.get('/api/ai-arena/manifest');
  expect(manifest.status()).toBe(200);
  const data = await manifest.json();
  expect(data.problems).toHaveLength(10);
  expect(data.verifiedJudge).toBe(false);
  expect(JSON.stringify(data)).not.toContain('referenceSolution');
  await page.goto('/ai-arena/runs');
  await expect(page.getByRole('heading', { name: 'Sign in to start a run' })).toBeVisible();
  const base = new URL(page.url()).origin;
  await page.request.post('/api/auth/local', { headers: { Origin: base }, data: { id: 'alice' } });
  await page.reload();
  await page.getByLabel('Model and tool configuration').fill('Manual integration test');
  await page.getByLabel('Time budget').selectOption('10');
  await page.getByRole('button', { name: 'Start preview', exact: true }).click();
  await expect(page.getByRole('timer')).toBeVisible();
  await expect(page.getByText('0 / 1,000 sample points')).toBeVisible();
  const editor = page.getByRole('textbox', { name: 'Python solution editor' });
  await editor.focus();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.insertText(
    "def solve(data): return [__import__('math').prod(data[:i] + data[i+1:]) for i in range(len(data))]",
  );
  await page.getByRole('button', { name: 'Check public examples', exact: true }).click();
  await expect(page.getByText('100 / 1,000 sample points', { exact: true })).toBeVisible({
    timeout: 90000,
  });
  await page.getByRole('button', { name: /2\. / }).click();
  await expect(page.locator('.ai-workbench section h2')).toHaveText(data.problems[1].title);
  await expect(page.getByText('100 / 1,000 sample points', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Finish run', exact: true }).click();
  await expect(page.getByText(/Manual integration test.*100\/1,000/)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/Manual integration test.*100\/1,000/)).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download reports' }).click();
  expect((await downloadPromise).suggestedFilename()).toBe('codeclash-ai-preview.json');
  const consent = page.getByRole('button', { name: 'Essential only', exact: true });
  if (await consent.isVisible()) await consent.click();
  await page.getByRole('link', { name: 'Leaderboard', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No verified runs yet' })).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('.ai-main')).toHaveCSS('opacity', '1');
  await page.screenshot({
    path: 'work/ai-arena-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
});
