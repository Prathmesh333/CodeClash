# Search discovery and growth

Updated 12 October 2026. Based on the [claude-seo technical workflow](https://github.com/AgriciDaniel/claude-seo/tree/main/skills/seo-technical) and [Google's JavaScript SEO guidance](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics).

## What changed

| Observation | Implementation | How to detect failure | Leading indicator |
| --- | --- | --- | --- |
| Public HTML was an empty React root; bots needed JavaScript to discover content. | Pre-render the same public React components during the Vite build. Serve static HTML through the existing Worker. No bot-specific content or per-request React rendering. | Disable JavaScript: headings, product explanations, policies and links must remain visible. | Search Console URL Inspection reports the expected rendered content. |
| All routes shared generic metadata. | Unique titles/descriptions, self-referencing canonical links, Open Graph and Twitter previews in initial HTML. | Fetch each route: exactly one description, correct canonical, correct title. | Impressions and click-through rate for relevant queries after indexing. |
| No crawl discovery files were present. | Robots policy and sitemap listing seven indexable public URLs. Keep JS/assets available. | Sitemap entries must respond 200 and have indexable canonical HTML. | Search Console accepts sitemap and reports indexed public URLs. |
| Login and account routes could produce duplicate search results. | Login/register noindex; app/API noindex headers; app authentication remains mandatory. | Anonymous app request redirects; private API returns 401; signed-in app HTML has noindex and no public landing markup. | Excluded account URLs in Search Console. |
| Search and share previews lacked a product summary. | WebSite/WebApplication JSON-LD and a 1200×630 PNG social card. | Parse JSON-LD, fetch the PNG, inspect a shared link. | Branded previews resolve and Search Console reports no structured-data parsing errors. |
| Product mechanics and beta limitations were not explained on a dedicated public URL. | Publish `/how-it-works`, linked from the homepage and footer. | Guide remains readable without JavaScript and describes real features and casual limitations. | Relevant guide impressions, visits and subsequent sign-ins. |

The renderer uses shared components, not a separately maintained crawler page. Authenticated workspaces remain client-rendered. Provider availability is checked by the live app after loading; the public static sign-in markup includes the currently configured GitHub and Google providers.

## Verification

```powershell
pnpm check
pnpm exec playwright test tests/e2e/seo.spec.ts
pnpm exec playwright test tests/e2e/auth-page.spec.ts
node --experimental-strip-types scripts/seo-live-check.mjs
```

The SEO browser test checks raw HTML across all nine public routes, canonical/description uniqueness, JSON-LD, sitemap coverage, image delivery, a browser with JavaScript disabled, and protection of the private workspace. There are no invented star ratings, testimonials, search volumes, or ranked-play claims. WebApplication markup does not guarantee Google's software-app rich results.

## Next steps to bring useful traffic

1. **Verify the domain in Search Console.** Use Google's generated DNS TXT record in Cloudflare. Do not fabricate the verification token. Submit `https://code-clash.com/sitemap.xml`; inspect `/` and `/how-it-works`.
2. **Measure a baseline after indexing.** Record branded/non-branded impressions, clicks, indexed URLs, and the queries driving visits. Search Console normally has a reporting delay; deployment is not proof of indexing.
3. **Publish a small number of useful guides.** Start with original examples of Python dictionary lookups, sliding windows, and interpreting browser execution errors. Review examples and explanations independently. Link relevant guides to the product; don't generate thin pages for all 153 problems.
4. **Share an accurate product demo.** Show a real casual duel and untimed practice to relevant programming communities. Follow each community's rules. No posts, emails, or outreach have been sent as part of this implementation.
5. **Check the results after four weeks.** Improve pages receiving relevant impressions but few clicks. Prioritize sign-ins and completed practice/duels over raw visitor counts.

## Not measured yet

- Search Console index coverage, impressions and keyword positions.
- CrUX field Core Web Vitals and real-user performance trends.
- Backlink quality, search volume and competitor ranking data.
- Social platform cache refresh times or guaranteed preview rendering.

No overall SEO score is assigned without those measurements. A sitemap and metadata improve discoverability; popularity still depends on useful content, reliable gameplay, distribution and retention.

## Search Console submission

On 12 October 2026 the user verified the `code-clash.com` domain property. The sitemap was submitted through that property and Search Console reported **Sitemap processed successfully**, with **7 discovered pages**. Discovery is not proof that those pages have been indexed or ranked. Submission evidence is saved locally at `work/seo-search-console.png` and is not committed to the public repository.

## Installed skill

The linked hub and technical leaf were installed as `claude-seo` and `claude-seo-technical` in the user's Codex skills directory. They are available on subsequent turns. The implementation adapts their technical workflow to this React/Workers repository; it does not claim to have run the Claude-specific runtime, Google credential-dependent tools, or a full parallel multi-agent audit.
