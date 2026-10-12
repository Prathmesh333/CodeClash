import { test, expect } from '@playwright/test';
import { publicSeo } from '../../packages/seo';

test('public content and metadata are served without JavaScript; private pages stay protected', async ({
  request,
  browser,
}) => {
  for (const [path, info] of Object.entries(publicSeo)) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain(`<title>${info.title}</title>`);
    expect(html).toContain(`href="https://code-clash.com${path}"`);
    expect(html).toContain(`content="${info.index ? 'index,follow' : 'noindex,follow'}"`);
    expect(html).toMatch(/<h1[^>]*>[^<]/);
    expect(html.match(/name="description"/g)).toHaveLength(1);
    if (path === '/') {
      const schema = JSON.parse(
        html.match(/<script[^>]*type="application\/ld\+json">([\s\S]*?)<\/script>/)![1],
      );
      expect(schema['@graph'].map((item: { '@type': string }) => item['@type'])).toEqual([
        'WebSite',
        'WebApplication',
      ]);
      expect(html).not.toContain('aggregateRating');
    }
  }
  const robots = await request.get('/robots.txt');
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain('Sitemap: https://code-clash.com/sitemap.xml');
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  expect(xml.match(/<loc>/g)).toHaveLength(7);
  expect(xml).not.toContain('/app');
  for (const [path, info] of Object.entries(publicSeo)) {
    if (info.index) expect(xml).toContain(`<loc>https://code-clash.com${path}</loc>`);
  }
  expect((await request.get('/social/codeclash.png')).headers()['content-type']).toContain(
    'image/png',
  );
  expect((await request.get('/app', { maxRedirects: 0 })).status()).toBe(302);
  expect((await request.get('/api/practice')).status()).toBe(401);
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/how-it-works');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Live Python coding duels and DSA practice',
  );
  await expect(page.getByRole('link', { name: 'Join CodeClash' })).toBeVisible();
  await context.close();
  const base = new URL((await request.get('/api/health')).url()).origin;
  expect(
    (
      await request.post('/api/auth/local', { headers: { Origin: base }, data: { id: 'alice' } })
    ).status(),
  ).toBe(200);
  const app = await request.get('/app');
  expect(app.headers()['x-robots-tag']).toBe('noindex, follow');
  const privateHtml = await app.text();
  expect(privateHtml).toContain('content="noindex,follow"');
  expect(privateHtml).toContain('<div id="root"></div>');
  expect(privateHtml).not.toContain('application/ld+json');
});
