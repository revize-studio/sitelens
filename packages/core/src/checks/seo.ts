import { thresholds } from '../config/scoring';
import { factsOf } from '../extract';
import type { Finding, SitemapResource } from '../model';
import { isAllowed, parseRobots } from '../robots';
import { isHomepage, isSameSite, pathOf } from '../url';
import {
  type Check,
  examples,
  finding,
  header,
  homepage,
  htmlPages,
  pass,
  short,
  siteWide,
  withFacts,
} from './helpers';

const GOOGLEBOT = 'Googlebot';

/** Groups pages by a value (title, description) and keeps the values more than one page shares. */
function duplicates(entries: { url: string; value: string | null }[]): { value: string; urls: string[] }[] {
  const byValue = new Map<string, string[]>();
  for (const { url, value } of entries) {
    if (!value) continue;
    byValue.set(value, [...(byValue.get(value) ?? []), url]);
  }
  return [...byValue].filter(([, urls]) => urls.length > 1).map(([value, urls]) => ({ value, urls }));
}

const title: Check = {
  id: 'seo/title',
  category: 'seo',
  stage: 'mvp',
  requires: ['rawHtml'],
  run(site) {
    const pages = withFacts(site);
    const out: Finding[] = [];
    const missing = pages.filter(({ facts }) => !facts.title).map(({ page }) => page.url);
    if (missing.length)
      out.push(
        finding(site, this, {
          variant: 'missing',
          severity: 'important',
          pages: missing,
          evidence: { count: missing.length, total: pages.length },
          details: examples(missing.map(pathOf), 5),
        }),
      );
    const badLength = pages.filter(({ facts }) => {
      const length = facts.title?.length ?? 0;
      return length > 0 && (length < thresholds.title.min || length > thresholds.title.max);
    });
    if (badLength.length)
      out.push(
        finding(site, this, {
          variant: 'length',
          severity: 'minor',
          pages: badLength.map(({ page }) => page.url),
          evidence: {
            count: badLength.length,
            total: pages.length,
            min: thresholds.title.min,
            max: thresholds.title.max,
          },
          details: examples(badLength.map(({ facts }) => `"${facts.title}" (${facts.title?.length})`)),
        }),
      );
    for (const group of duplicates(pages.map(({ page, facts }) => ({ url: page.url, value: facts.title })))) {
      out.push(
        finding(site, this, {
          variant: 'duplicate',
          severity: 'minor',
          pages: group.urls,
          evidence: { count: group.urls.length, title: group.value },
          details: `"${group.value}": ${examples(group.urls.map(pathOf))}`,
        }),
      );
    }
    return out.length ? out : [pass(site, this)];
  },
};

const metaDescription: Check = {
  id: 'seo/meta-description',
  category: 'seo',
  stage: 'mvp',
  requires: ['rawHtml'],
  run(site) {
    const pages = withFacts(site);
    const out: Finding[] = [];
    const missing = pages.filter(({ facts }) => !facts.description).map(({ page }) => page.url);
    if (missing.length)
      out.push(
        finding(site, this, {
          variant: 'missing',
          severity: 'important',
          pages: missing,
          evidence: { count: missing.length, total: pages.length },
          details: examples(missing.map(pathOf), 5),
        }),
      );
    const long = pages.filter(({ facts }) => (facts.description?.length ?? 0) > thresholds.description.max);
    if (long.length)
      out.push(
        finding(site, this, {
          variant: 'length',
          severity: 'minor',
          pages: long.map(({ page }) => page.url),
          evidence: { count: long.length, max: thresholds.description.max },
          details: examples(long.map(({ page, facts }) => `${pathOf(page.url)} (${facts.description?.length})`)),
        }),
      );
    for (const group of duplicates(pages.map(({ page, facts }) => ({ url: page.url, value: facts.description })))) {
      out.push(
        finding(site, this, {
          variant: 'duplicate',
          severity: 'minor',
          pages: group.urls,
          evidence: { count: group.urls.length },
          details: examples(group.urls.map(pathOf)),
        }),
      );
    }
    return out.length ? out : [pass(site, this)];
  },
};

const headings: Check = {
  id: 'seo/headings',
  category: 'seo',
  stage: 'mvp',
  requires: ['rawHtml'],
  run(site) {
    const pages = withFacts(site, 'visible');
    const out: Finding[] = [];
    const noH1 = pages.filter(({ facts }) => !facts.headings.some((h) => h.level === 1)).map(({ page }) => page.url);
    const manyH1 = pages
      .filter(({ facts }) => facts.headings.filter((h) => h.level === 1).length > 1)
      .map(({ page }) => page.url);
    const skipped = pages
      .filter(({ facts }) => facts.headings.some((h, i) => i > 0 && h.level - facts.headings[i - 1]!.level > 1))
      .map(({ page }) => page.url);
    if (noH1.length)
      out.push(
        finding(site, this, { variant: 'missing', severity: 'minor', pages: noH1, evidence: { count: noH1.length } }),
      );
    if (manyH1.length)
      out.push(
        finding(site, this, {
          variant: 'multiple',
          severity: 'minor',
          pages: manyH1,
          evidence: { count: manyH1.length },
        }),
      );
    if (skipped.length)
      out.push(
        finding(site, this, {
          variant: 'order',
          severity: 'minor',
          pages: skipped,
          evidence: { count: skipped.length },
        }),
      );
    return out.length ? out : [pass(site, this)];
  },
};

const imageAlt: Check = {
  id: 'seo/image-alt',
  category: 'seo',
  stage: 'mvp',
  requires: ['rawHtml'],
  run(site) {
    const affected = withFacts(site, 'visible')
      .map(({ page, facts }) => ({ page, images: facts.images.filter((img) => img.alt === null && !img.decorative) }))
      .filter(({ images }) => images.length);
    if (!affected.length) return [pass(site, this)];
    const count = affected.reduce((sum, { images }) => sum + images.length, 0);
    return [
      finding(site, this, {
        severity: 'minor',
        pages: affected.map(({ page }) => page.url),
        evidence: { count },
        details: examples(
          affected.flatMap(({ images }) => images.map((i) => short(i.src || site.site.origin, site.site.origin))),
        ),
      }),
    ];
  },
};

const indexability: Check = {
  id: 'seo/indexability',
  category: 'seo',
  stage: 'mvp',
  requires: ['rawHtml'],
  run(site) {
    const robots = site.site.robotsTxt?.status === 200 ? parseRobots(site.site.robotsTxt.body) : null;
    const blocked = htmlPages(site)
      .map((page) => {
        const reasons: string[] = [];
        if (robots && !isAllowed(robots, page.finalUrl, GOOGLEBOT)) reasons.push('robots.txt');
        if (/\b(noindex|none)\b/.test(factsOf(page).robots)) reasons.push('meta robots noindex');
        if (/\bnoindex\b/i.test(header(page, 'x-robots-tag') ?? '')) reasons.push('X-Robots-Tag noindex');
        return { page, reasons };
      })
      .filter(({ reasons }) => reasons.length);
    if (!blocked.length) return [pass(site, this)];
    const home = blocked.some(({ page }) => isHomepage(page.finalUrl));
    return [
      finding(site, this, {
        variant: home ? 'homepage' : 'pages',
        severity: home ? 'critical' : 'important',
        pages: blocked.map(({ page }) => page.url),
        evidence: { count: blocked.length },
        details: examples(blocked.map(({ page, reasons }) => `${pathOf(page.finalUrl)}: ${reasons.join(', ')}`)),
      }),
    ];
  },
};

const statusCodes: Check = {
  id: 'seo/status-codes',
  category: 'seo',
  stage: 'mvp',
  requires: ['rawHtml'],
  run(site) {
    const failing = site.pages.filter((page) => page.status >= 400);
    if (!failing.length) return [pass(site, this)];
    return [
      finding(site, this, {
        severity: failing.some((p) => p.status >= 500) ? 'critical' : 'important',
        pages: failing.map((p) => p.url),
        evidence: { count: failing.length },
        details: examples(failing.map((p) => `${pathOf(p.url)} → ${p.status}`)),
      }),
    ];
  },
};

const redirects: Check = {
  id: 'seo/redirects',
  category: 'seo',
  stage: 'mvp',
  requires: ['rawHtml'],
  run(site) {
    const chains = site.pages.filter((page) => page.redirects.length > 1);
    if (!chains.length) return [pass(site, this)];
    return [
      finding(site, this, {
        severity: 'minor',
        pages: chains.map((p) => p.url),
        evidence: { count: chains.length, hops: Math.max(...chains.map((p) => p.redirects.length)) },
        details: examples(
          chains.map((p) =>
            [pathOf(p.url), ...p.redirects.map((r) => `${r.status} ${short(r.to, site.site.origin)}`)].join(' → '),
          ),
        ),
      }),
    ];
  },
};

const hostConsistency: Check = {
  id: 'seo/host-consistency',
  category: 'seo',
  stage: 'mvp',
  requires: ['hosts'],
  run(site) {
    const target = new URL(site.site.finalUrl).origin;
    const stray = site.site.hosts.filter(
      (probe) => !probe.error && probe.finalUrl && new URL(probe.finalUrl).origin !== target,
    );
    if (!stray.length) return [pass(site, this)];
    return [
      finding(site, this, {
        severity: 'important',
        evidence: { count: stray.length, origin: target },
        details: examples(
          stray.map((p) => `${p.url} → ${p.finalUrl} (${p.status})`),
          4,
        ),
      }),
    ];
  },
};

const canonical: Check = {
  id: 'seo/canonical',
  category: 'seo',
  stage: 'mvp',
  requires: ['rawHtml'],
  run(site) {
    const pages = withFacts(site);
    const out: Finding[] = [];
    const missing = pages.filter(({ facts }) => !facts.canonical).map(({ page }) => page.url);
    const foreign = pages.filter(({ facts }) => facts.canonical && !isSameSite(facts.canonical, site.site.origin));
    const broken = pages.filter(({ facts }) => {
      const target = site.pages.find((p) => p.url === facts.canonical || p.finalUrl === facts.canonical);
      return target !== undefined && target.status >= 400;
    });
    if (foreign.length)
      out.push(
        finding(site, this, {
          variant: 'other-site',
          severity: 'important',
          pages: foreign.map(({ page }) => page.url),
          evidence: { count: foreign.length },
          details: examples(foreign.map(({ page, facts }) => `${pathOf(page.url)} → ${facts.canonical}`)),
        }),
      );
    if (broken.length)
      out.push(
        finding(site, this, {
          variant: 'broken',
          severity: 'important',
          pages: broken.map(({ page }) => page.url),
          evidence: { count: broken.length },
        }),
      );
    // Canonical problems are important in general, but a missing tag alone is common and
    // harmless on simple sites, so it counts as minor (owner's call, 25.10.2026).
    if (missing.length)
      out.push(
        finding(site, this, {
          variant: 'missing',
          severity: 'minor',
          pages: siteWide(site, missing),
          evidence: { count: missing.length, total: pages.length },
        }),
      );
    return out.length ? out : [pass(site, this)];
  },
};

const sitemap: Check = {
  id: 'seo/sitemap',
  category: 'seo',
  stage: 'mvp',
  requires: ['sitemap'],
  run(site) {
    const maps = site.site.sitemaps;
    const tried = examples(maps.map((m) => `${m.url} → ${m.status}`));
    // Sites that answer every path with their homepage serve HTML at /sitemap.xml; that is no sitemap at all
    const absent = (m: SitemapResource) => m.status === 404 || (m.status === 200 && /html/i.test(m.contentType ?? ''));
    if (maps.every(absent)) return [finding(site, this, { variant: 'missing', severity: 'minor', details: tried })];
    // An index lists other sitemap files, not pages
    const files = new Set(maps.map((m) => m.url));
    const listed = new Set(
      maps
        .filter((m) => m.status === 200)
        .flatMap((m) => m.urls)
        .filter((url) => !files.has(url)),
    );
    if (!listed.size)
      return [
        finding(site, this, {
          variant: 'invalid',
          severity: 'important',
          evidence: { url: maps[0]!.url },
          details: tried,
        }),
      ];
    const bad = site.pages.filter((p) => (listed.has(p.url) || listed.has(p.finalUrl)) && p.status >= 400);
    if (bad.length)
      return [
        finding(site, this, {
          variant: 'errors',
          severity: 'minor',
          pages: bad.map((p) => p.url),
          evidence: { count: bad.length },
          details: examples(bad.map((p) => `${pathOf(p.url)} → ${p.status}`)),
        }),
      ];
    return [pass(site, this, { count: listed.size })];
  },
};

const robotsTxt: Check = {
  id: 'seo/robots-txt',
  category: 'seo',
  stage: 'mvp',
  requires: ['robots'],
  run(site) {
    const file = site.site.robotsTxt;
    if (!file || file.status !== 200)
      return [
        finding(site, this, { variant: 'missing', severity: 'minor', details: `/robots.txt → ${file?.status ?? '—'}` }),
      ];
    const robots = parseRobots(file.body);
    const out: Finding[] = [];
    const assets = site.pages
      .flatMap((p) => p.rendered?.network ?? [])
      .filter((r) => (r.type === 'script' || r.type === 'stylesheet') && isSameSite(r.url, site.site.origin))
      .filter((r) => !isAllowed(robots, r.url, GOOGLEBOT))
      .map((r) => r.url);
    if (assets.length)
      out.push(
        finding(site, this, {
          variant: 'blocks-assets',
          severity: 'minor',
          evidence: { count: new Set(assets).size },
          details: examples([...new Set(assets)].map(pathOf)),
        }),
      );
    if (robots.invalidLines.length)
      out.push(
        finding(site, this, {
          variant: 'syntax',
          severity: 'minor',
          evidence: { count: robots.invalidLines.length, lines: robots.invalidLines.slice(0, 8).join(', ') },
        }),
      );
    if (!robots.sitemaps.length && site.site.sitemaps.some((m) => m.status === 200))
      out.push(finding(site, this, { variant: 'no-sitemap-line', severity: 'minor' }));
    return out.length ? out : [pass(site, this)];
  },
};

const socialPreview: Check = {
  id: 'seo/social-preview',
  category: 'seo',
  stage: 'mvp',
  requires: ['rawHtml'],
  run(site) {
    const home = homepage(site);
    if (!home || home.status >= 400) return [];
    const meta = factsOf(home).meta;
    const missing = [
      ['og:title', meta['og:title'] ?? meta['twitter:title']],
      ['og:description', meta['og:description'] ?? meta['twitter:description']],
      ['og:image', meta['og:image'] ?? meta['twitter:image']],
    ]
      .filter(([, value]) => !value)
      .map(([name]) => name!);
    if (!missing.length) return [pass(site, this)];
    return [
      finding(site, this, {
        severity: 'minor',
        pages: [home.url],
        evidence: { count: missing.length, fields: missing.join(', ') },
        details: missing.join(', '),
      }),
    ];
  },
};

const favicon: Check = {
  id: 'seo/favicon',
  category: 'seo',
  stage: 'mvp',
  requires: ['favicon'],
  run(site) {
    if (site.site.favicon?.status === 200) return [pass(site, this)];
    return [
      finding(site, this, {
        severity: 'minor',
        details: `${site.site.favicon?.url ?? '/favicon.ico'} → ${site.site.favicon?.status ?? '—'}`,
      }),
    ];
  },
};

const brokenLinks: Check = {
  id: 'seo/broken-links',
  category: 'seo',
  stage: 'mvp',
  requires: ['rawHtml'],
  run(site) {
    const broken = site.links.filter((link) => link.status >= 400 || link.error);
    if (!broken.length) return [pass(site, this, { count: site.links.length })];
    return [
      finding(site, this, {
        severity: 'important',
        pages: [...new Set(broken.flatMap((link) => link.foundOn))],
        evidence: { count: broken.length },
        details: examples(
          broken.map((l) => `${pathOf(l.url)} → ${l.error ?? l.status}`),
          5,
        ),
      }),
    ];
  },
};

export const seoChecks: Check[] = [
  indexability,
  statusCodes,
  redirects,
  hostConsistency,
  canonical,
  sitemap,
  robotsTxt,
  title,
  metaDescription,
  headings,
  imageAlt,
  socialPreview,
  favicon,
  brokenLinks,
];
