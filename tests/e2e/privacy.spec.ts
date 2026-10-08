import { test, expect } from '@playwright/test';
test('policies are public, optional storage is controlled, and privacy records belong to the signed-in user', async ({
  page,
  request,
}) => {
  const external: string[] = [];
  page.on('request', (r) => {
    if (!new URL(r.url()).hostname.match(/^(127\.0\.0\.1|localhost)$/)) external.push(r.url());
  });
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: 'Privacy notice', exact: true })).toBeVisible();
  await expect(page.getByText(/Prathamesh Nikam in India/)).toBeVisible();
  await page.getByRole('button', { name: 'Essential only', exact: true }).click();
  for (const path of ['/cookies', '/terms', '/contact', '/safety']) {
    const r = await request.get(path);
    expect(r.status()).toBe(200);
    expect(r.headers()['x-content-type-options']).toBe('nosniff');
  }
  expect((await request.get('/api/privacy/export')).status()).toBe(401);
  await page.goto('/app');
  await page.getByRole('button', { name: 'Change theme' }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Midnight Mint/ })
    .click();
  await page.getByRole('dialog').getByRole('button', { name: 'Done', exact: true }).click();
  expect(await page.evaluate(() => localStorage.getItem('codeclash:theme'))).toBeNull();
  await page.reload();
  expect(await page.locator('html').getAttribute('data-theme')).toBe('codeclash-light');
  await page.getByRole('button', { name: 'Cookie settings', exact: true }).click();
  await page.getByRole('button', { name: 'Allow saved preferences', exact: true }).click();
  await page.getByRole('button', { name: /AdaByte/ }).click();
  await expect(page.getByRole('button', { name: /AdaByte Sign out/ })).toBeVisible();
  const response = await page.request.post('/api/privacy/requests', {
    headers: { Origin: new URL(page.url()).origin },
    data: { kind: 'erasure', message: 'Please review my account data.', user_id: 'bob' },
  });
  expect(response.status()).toBe(201);
  const first = await response.json();
  const duplicate = await page.request.post('/api/privacy/requests', {
    headers: { Origin: new URL(page.url()).origin },
    data: { kind: 'erasure', message: 'Repeat' },
  });
  expect((await duplicate.json()).request.id).toBe(first.request.id);
  const exported = await (await page.request.get('/api/privacy/export')).json();
  expect(exported.profile.id).toBe('alice');
  expect(exported.collections.requests).toHaveLength(1);
  expect(JSON.stringify(exported)).not.toContain('token_hash');
  expect(JSON.stringify(exported)).not.toContain('browser_hash');
  await page.goto('/contact');
  await expect(page.getByText(/erasure: pending/)).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download my data' }).click();
  expect((await downloadPromise).suggestedFilename()).toBe('codeclash-account-data.json');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'artifacts/privacy-mobile.png', fullPage: true });
  await page.request.post('/api/auth/logout', {
    headers: { Origin: new URL(page.url()).origin },
    data: {},
  });
  await page.request.post('/api/auth/local', {
    headers: { Origin: new URL(page.url()).origin },
    data: { id: 'bob' },
  });
  const other = await (await page.request.get('/api/privacy/export')).json();
  expect(other.profile.id).toBe('bob');
  expect(other.collections.requests).toHaveLength(0);
  expect(external).toEqual([]);
});
