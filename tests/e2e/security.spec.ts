import { test, expect } from '@playwright/test';
test('CSP blocks injected scripts and session responses cannot be cached', async ({
  page,
  request,
}) => {
  const response = await page.goto('/login');
  expect(response?.headers()['cache-control']).toBe('no-store');
  expect(response?.headers()['content-security-policy']).toContain("script-src-attr 'none'");
  await page.evaluate(() => {
    const script = document.createElement('script');
    script.textContent = 'window.injected = true';
    (document.body as unknown as HTMLElement).appendChild(script);
    const button = document.createElement('button');
    button.setAttribute('onclick', 'window.injectedHandler = true');
    (document.body as unknown as HTMLElement).appendChild(button);
    button.click();
    script.remove();
    button.remove();
  });
  expect(await page.evaluate(() => 'injected' in window || 'injectedHandler' in window)).toBe(
    false,
  );
  const me = await request.get('/api/me');
  expect(me.headers()['cache-control']).toBe('no-store');
  const redirect = await request.get('/top', { maxRedirects: 0 });
  expect(redirect.status()).toBe(302);
  expect(redirect.headers()['cache-control']).toBe('no-store');
});
