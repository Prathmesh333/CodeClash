import problems from './public-problems.json' with { type: 'json' };
export const publicSeo: Record<string, { title: string; description: string; index: boolean }> = {
  '/': {
    title: 'Python coding duels and DSA practice | CodeClash',
    description:
      'Compete in live 1v1 Python coding duels or practice DSA at your own pace. Run code in your browser, save progress, and revisit your matches.',
    index: true,
  },
  '/how-it-works': {
    title: 'How Python coding duels work | CodeClash',
    description:
      'Learn how CodeClash matches players, runs Python in your browser, and saves solo DSA practice. Explore the rules and limits of our casual beta.',
    index: true,
  },
  '/contact': {
    title: 'Contact and privacy requests | CodeClash',
    description:
      'Contact CodeClash for support, privacy requests, account questions, and accessibility feedback.',
    index: true,
  },
  '/privacy': {
    title: 'Privacy notice | CodeClash',
    description:
      'How CodeClash handles account information, coding attempts, match history, analytics, and requests to export or delete your data.',
    index: true,
  },
  '/terms': {
    title: 'Terms of use | CodeClash',
    description:
      'Read the terms for using CodeClash, including account responsibilities, Python coding duels, and the limits of casual beta results.',
    index: true,
  },
  '/cookies': {
    title: 'Cookies and device storage | CodeClash',
    description:
      'Understand CodeClash session cookies, theme preferences, code drafts, browser caching, and your device storage choices.',
    index: true,
  },
  '/safety': {
    title: 'Safety and fair play | CodeClash',
    description:
      'Read CodeClash fair-play rules, browser execution limitations, account safety guidance, and how to report a problem.',
    index: true,
  },
  '/login': {
    title: 'Sign in | CodeClash',
    description:
      'Sign in to CodeClash with Google or GitHub to play Python coding duels and save your practice progress.',
    index: false,
  },
  '/register': {
    title: 'Join | CodeClash',
    description:
      'Create a CodeClash account to choose your username, compete in casual Python coding duels, and practice DSA.',
    index: false,
  },
};

for (const [path, title, description] of [
  [
    '/problems',
    'Original Python DSA problems',
    'Preview original arrays, strings and graph problems with examples and constraints. Sign in to solve and save progress.',
  ],
  [
    '/topics',
    'DSA topics',
    'Explore arrays, strings and graphs through original Python practice problems.',
  ],
  [
    '/learn',
    'Python problem-solving guides',
    'Practical Python guides to dictionary lookup, sliding windows and runtime errors.',
  ],
  [
    '/about',
    'About CodeClash',
    'Meet the independent project behind CodeClash and learn how its Python practice and coding duels work.',
  ],
  [
    '/ai-arena',
    'AI coding benchmark workspace',
    'Explore ten-question Python benchmark previews, timed local runs, downloadable reports and the requirements for verified agent rankings.',
  ],
])
  publicSeo[path] = { title: title + ' | CodeClash', description, index: true };
for (const problem of problems)
  publicSeo['/problems/' + problem.id] = {
    title: problem.title + ' Python problem | CodeClash',
    description: problem.statement.slice(0, 155),
    index: true,
  };
for (const topic of ['arrays', 'strings', 'graphs'])
  publicSeo['/topics/' + topic] = {
    title: topic[0].toUpperCase() + topic.slice(1) + ' Python practice | CodeClash',
    description: 'Explore original ' + topic + ' problems, examples and related Python guides.',
    index: true,
  };
for (const guide of ['dictionary-lookup', 'sliding-windows', 'python-errors'])
  publicSeo['/learn/' + guide] = {
    title: guide.replaceAll('-', ' ') + ' | CodeClash',
    description:
      'Learn ' +
      guide.replaceAll('-', ' ') +
      ' with a working Python example and practical limits.',
    index: true,
  };

for (const [slug, title] of [
  ['benchmarks', 'AI benchmark suites'],
  ['runs', 'AI Arena local runs'],
  ['leaderboard', 'AI Arena verified leaderboard'],
  ['docs', 'AI Arena developer documentation'],
]) {
  publicSeo['/ai-arena/' + slug] = {
    title: title + ' | CodeClash',
    description:
      'Explore CodeClash AI Arena: versioned Python suites, local previews and the requirements for verified agent evaluation.',
    index: slug !== 'runs',
  };
}

const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
export function seoHead(path: string, origin: string) {
  const info = publicSeo[path] ?? {
    title: 'CodeClash',
    description: 'Your CodeClash coding workspace.',
    index: false,
  };
  const url = origin + path;
  const meta = (name: string, content: string, property = false) =>
    `<meta ${property ? 'property' : 'name'}="${name}" content="${escape(content)}">`;
  let html = `<title>${escape(info.title)}</title>${meta('description', info.description)}${meta('robots', info.index ? 'index,follow' : 'noindex,follow')}<link rel="canonical" href="${escape(url)}">`;
  html +=
    meta('og:type', 'website', true) +
    meta('og:site_name', 'CodeClash', true) +
    meta('og:title', info.title, true) +
    meta('og:description', info.description, true) +
    meta('og:url', url, true) +
    meta('og:image', origin + '/social/codeclash.png', true) +
    meta('og:image:width', '1200', true) +
    meta('og:image:height', '630', true) +
    meta('og:image:alt', 'CodeClash: live Python coding duels and DSA practice', true) +
    meta('twitter:card', 'summary_large_image') +
    meta('twitter:title', info.title) +
    meta('twitter:description', info.description) +
    meta('twitter:image', origin + '/social/codeclash.png');
  if (path === '/') {
    const schema = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          '@id': origin + '/#website',
          name: 'CodeClash',
          url: origin + '/',
          description: info.description,
        },
        {
          '@type': 'WebApplication',
          '@id': origin + '/#app',
          name: 'CodeClash',
          url: origin + '/',
          description: info.description,
          applicationCategory: 'EducationalApplication',
          operatingSystem: 'Web browser',
          browserRequirements: 'JavaScript and WebAssembly support',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        },
      ],
    };
    html += `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>`;
  }
  return html;
}
export const prerenderFile = (path: string) =>
  `/prerender/${path === '/' ? 'home' : path.slice(1)}/`;
