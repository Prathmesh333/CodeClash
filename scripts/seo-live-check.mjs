import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { publicSeo } from '../packages/seo.ts';
const origin = 'https://code-clash.com';
const results = await Promise.all(
  Object.entries(publicSeo).map(async ([path, info]) => {
    const response = await fetch(origin + path, { redirect: 'manual' });
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert(html.includes(`<title>${info.title}</title>`), path + ' title');
    assert(html.includes(`href="${origin + path}"`), path + ' canonical');
    assert.match(html, /<h1[^>]*>[^<]/, path + ' content');
    assert.equal(html.match(/name="description"/g)?.length, 1, path + ' description');
    assert(
      html.includes(`content="${info.index ? 'index,follow' : 'noindex,follow'}"`),
      path + ' indexing',
    );
    return { path, status: response.status, indexable: info.index, contentInInitialHtml: true };
  }),
);
const sitemap = await fetch(origin + '/sitemap.xml');
assert.equal(sitemap.status, 200);
assert(sitemap.headers.get('content-type').includes('xml'));
assert.equal(
  (await sitemap.text()).match(/<loc>/g).length,
  Object.values(publicSeo).filter((info) => info.index).length,
);
const robots = await fetch(origin + '/robots.txt');
assert.equal(robots.status, 200);
assert((await robots.text()).includes('Sitemap: ' + origin + '/sitemap.xml'));
const image = await fetch(origin + '/social/codeclash.png');
assert.equal(image.status, 200);
assert.equal(image.headers.get('content-type'), 'image/png');
assert.equal((await fetch(origin + '/app', { redirect: 'manual' })).status, 302);
assert.equal((await fetch(origin + '/api/practice')).status, 401);
await mkdir('artifacts', { recursive: true });
await writeFile(
  'artifacts/seo-live-check.json',
  JSON.stringify(
    {
      origin,
      checkedAt: new Date().toISOString(),
      results,
      sitemapPages: Object.values(publicSeo).filter((info) => info.index).length,
      privateAccessProtected: true,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  'PASS: all registered public routes, generated sitemap, robots, social card, and private access',
);

