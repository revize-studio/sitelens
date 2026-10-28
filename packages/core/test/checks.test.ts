import { describe, expect, it } from 'vitest';
import {
  allChecks,
  cards,
  fillTemplate,
  runChecks,
  scoreAudit,
  topFindings,
  type Finding,
  type LighthouseResult,
  type SiteSnapshot,
} from '../src';
import { goodHead, html, page, site } from './site';

const problems = (s: SiteSnapshot, id?: string): Finding[] =>
  runChecks(s).findings.filter((f) => f.severity !== 'pass' && (!id || f.checkId === id));

const headers = {
  'content-type': 'text/html',
  'content-encoding': 'br',
  'strict-transport-security': 'max-age=31536000',
  'content-security-policy': "default-src 'self'; frame-ancestors 'self'",
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=()',
};

function healthy() {
  return site([
    page('/', html(goodHead()), { headers }),
    page('/oferta', html(goodHead('Oferta: remonty mieszkań w Warszawie | Firma', 'Remonty łazienek i kuchni.')), {
      headers,
    }),
  ]);
}

function lighthouse(metrics: LighthouseResult['metrics'], extra: Partial<LighthouseResult> = {}): LighthouseResult {
  return {
    formFactor: 'mobile',
    lighthouseVersion: '13.5.0',
    performance: 58,
    metrics,
    resourceSummary: [],
    oversizedImages: [],
    legacyFormatImages: [],
    renderBlocking: [],
    uncompressed: [],
    ...extra,
  };
}

describe('a healthy site', () => {
  it('has no problems in the checks that can run', () => {
    expect(problems(healthy()).map((f) => `${f.checkId}:${f.variant}`)).toEqual([]);
  });
  it('lists passes for "what works well"', () => {
    const passes = runChecks(healthy()).findings.filter((f) => f.severity === 'pass');
    expect(passes.map((f) => f.checkId)).toContain('sec/certificate');
    expect(
      fillTemplate(
        cards['sec/certificate']!.passed!.pl,
        passes.find((f) => f.checkId === 'sec/certificate')!.evidence,
        'pl',
      ),
    ).toBe('Certyfikat bezpieczeństwa jest ważny do 14 marca 2027.');
  });
});

describe('SEO checks', () => {
  it('flags pages without a meta description, with the count for the card', () => {
    const s = healthy();
    s.pages.push(page('/o-nas', html('<title>O nas – Przykładowa Firma, remonty od 2010 roku</title>'), { headers }));
    const [missing] = problems(s, 'seo/meta-description');
    expect(missing).toMatchObject({ variant: 'missing', severity: 'important', evidence: { count: 1, total: 3 } });
    expect(fillTemplate(cards['seo/meta-description']!.variants.missing!.pl.title, missing!.evidence, 'pl')).toBe(
      '1 z 3 podstron nie ma opisu dla Google',
    );
  });
  it('reports pages sharing a title once, with both pages', () => {
    const s = healthy();
    s.pages[1]!.rawHtml = html(goodHead());
    const duplicate = problems(s, 'seo/title').find((f) => f.variant === 'duplicate');
    expect(duplicate?.pages).toHaveLength(2);
  });
  it('treats a noindex homepage as critical', () => {
    const s = healthy();
    s.pages[0]!.rawHtml = html(goodHead() + '<meta name="robots" content="noindex">');
    expect(problems(s, 'seo/indexability')[0]).toMatchObject({ variant: 'homepage', severity: 'critical' });
  });
  it('notices a missing sitemap and a robots.txt that blocks Google', () => {
    const s = healthy();
    s.site.sitemaps = [{ url: 'https://example.com/sitemap.xml', status: 404, body: '', urls: [] }];
    s.site.robotsTxt = { url: 'https://example.com/robots.txt', status: 200, body: 'User-agent: *\nDisallow: /oferta' };
    expect(problems(s, 'seo/sitemap')[0]?.variant).toBe('missing');
    expect(problems(s, 'seo/indexability')[0]).toMatchObject({ variant: 'pages', severity: 'important' });
  });
  it('treats a homepage served at /sitemap.xml as no sitemap', () => {
    const s = healthy();
    s.site.sitemaps = [
      {
        url: 'https://example.com/sitemap.xml',
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: '',
        urls: [],
      },
    ];
    expect(problems(s, 'seo/sitemap')[0]?.variant).toBe('missing');
  });
  it('counts the pages in a sitemap index, not the files it points to', () => {
    const s = healthy();
    s.site.sitemaps = [
      {
        url: 'https://example.com/sitemap_index.xml',
        status: 200,
        body: '',
        urls: ['https://example.com/page-sitemap.xml'],
      },
      { url: 'https://example.com/page-sitemap.xml', status: 200, body: '', urls: s.pages.map((p) => p.url) },
    ];
    expect(runChecks(s).findings.find((f) => f.checkId === 'seo/sitemap')?.evidence.count).toBe(2);
  });
  it('lists broken internal links with the pages they were found on', () => {
    const s = healthy();
    s.links = [{ url: 'https://example.com/stara-oferta', status: 404, foundOn: ['https://example.com/'] }];
    expect(problems(s, 'seo/broken-links')[0]).toMatchObject({
      evidence: { count: 1 },
      pages: ['https://example.com/'],
    });
  });
});

describe('security checks', () => {
  it('reports a missing header once for the whole site', () => {
    const s = healthy();
    for (const p of s.pages) delete p.headers['strict-transport-security'];
    expect(problems(s, 'sec/hsts')[0]).toMatchObject({ variant: 'missing', severity: 'important', pages: [] });
  });
  it('calls a form posting over http critical', () => {
    const s = healthy();
    s.pages[1]!.rawHtml = html(
      goodHead(),
      '<h1>Kontakt</h1><form action="http://example.com/wyslij"><input name="email"></form>',
    );
    expect(problems(s, 'sec/insecure-forms')[0]?.severity).toBe('critical');
  });
  it("sees 'unsafe-inline' only when no nonce or hash cancels it", () => {
    const s = healthy();
    for (const p of s.pages)
      p.headers['content-security-policy'] = "script-src 'self' 'unsafe-inline'; frame-ancestors 'self'";
    expect(problems(s, 'sec/csp')[0]?.evidence.problems).toBe("'unsafe-inline'");
    for (const p of s.pages)
      p.headers['content-security-policy'] = "script-src 'self' 'unsafe-inline' 'nonce-abc'; frame-ancestors 'self'";
    expect(problems(s, 'sec/csp')).toEqual([]);
  });
  it('warns about a certificate close to expiry', () => {
    const s = healthy();
    s.site.tls = { authorized: true, altNames: [], validTo: '2026-10-30T00:00:00.000Z' };
    expect(problems(s, 'sec/certificate')[0]).toMatchObject({ variant: 'expiring', evidence: { days: 5 } });
  });
});

describe('performance and accessibility checks', () => {
  it('takes LCP severity from the worst page', () => {
    const s = healthy();
    s.available.push('lighthouse');
    s.pages[0]!.lighthouse = { mobile: lighthouse({ lcp: 4100, cls: 0.04, tbt: 180, ttfb: 300 }) };
    s.pages[1]!.lighthouse = { mobile: lighthouse({ lcp: 3000, cls: 0.02, tbt: 90, ttfb: 300 }) };
    const lcp = problems(s, 'perf/lcp')[0]!;
    expect(lcp).toMatchObject({ severity: 'critical', evidence: { value: 4100, count: 2, total: 2 } });
    expect(problems(s, 'perf/cls')).toEqual([]);
  });
  it('groups axe rules and maps their impact to a priority', () => {
    const s = healthy();
    s.available.push('axe');
    s.pages[0]!.rendered = {
      html: '',
      network: [],
      cookies: [],
      console: [],
      axe: {
        passes: [],
        violations: [
          {
            id: 'color-contrast',
            impact: 'serious',
            help: '',
            tags: [],
            nodes: [
              { target: 'footer p', html: '' },
              { target: '.caption', html: '' },
            ],
          },
          { id: 'label', impact: 'critical', help: '', tags: [], nodes: [{ target: '#email', html: '' }] },
        ],
      },
    };
    expect(problems(s, 'a11y/contrast')[0]).toMatchObject({ severity: 'important', evidence: { count: 2 } });
    expect(problems(s, 'a11y/forms')[0]?.severity).toBe('critical');
    expect(problems(s, 'a11y/other')).toEqual([]);
  });
  it('flags a viewport tag that sets neither width nor initial-scale', () => {
    const s = healthy();
    s.pages[1]!.rawHtml = s.pages[1]!.rawHtml.replace(
      /<meta name="viewport"[^>]*>/,
      '<meta name="viewport" content="user-scalable=yes">',
    );
    expect(problems(s, 'mobile/viewport')[0]?.severity).toBe('critical');
  });
  it('flags a page without a viewport as critical', () => {
    const s = healthy();
    s.pages[1]!.rawHtml = s.pages[1]!.rawHtml.replace(/<meta name="viewport"[^>]*>/, '');
    expect(problems(s, 'mobile/viewport')[0]?.severity).toBe('critical');
  });
});

describe('pages built in the browser', () => {
  it('reads contact details, the privacy link and headings from the rendered page, not the empty shell', () => {
    const s = healthy();
    for (const p of s.pages) {
      p.rendered = { html: p.rawHtml, network: [], cookies: [], console: [] };
      p.rawHtml = p.rawHtml.replace(/<body[\s\S]*<\/body>/, '<body><div id="root"></div></body>');
    }
    expect(problems(s, 'content/contact')).toEqual([]);
    expect(problems(s, 'privacy/policy-link')).toEqual([]);
    expect(problems(s, 'seo/headings')).toEqual([]);
  });
  it('accepts a button that leads to the privacy policy', () => {
    const s = healthy();
    for (const p of s.pages)
      p.rawHtml = p.rawHtml.replace(
        /<a [^>]*>Polityka prywatności<\/a>/,
        '<button type="button">Polityka prywatności</button>',
      );
    expect(s.pages[0]!.rawHtml).not.toContain('href="/polityka-prywatnosci"');
    expect(problems(s, 'privacy/policy-link')).toEqual([]);
  });
});

describe('running and scoring', () => {
  it('skips checks whose data was not collected and says which data was missing', () => {
    const outcome = runChecks(healthy());
    expect(outcome.skipped).toContainEqual({ checkId: 'perf/lcp', category: 'performance', missing: ['lighthouse'] });
  });
  it('scores performance from Lighthouse and the rest by penalties', () => {
    const s = healthy();
    s.available.push('lighthouse');
    s.pages[0]!.lighthouse = {
      mobile: lighthouse({ lcp: 2000 }, { performance: 50 }),
      desktop: lighthouse({}, { performance: 90 }),
    };
    for (const p of s.pages) delete p.headers['strict-transport-security'];
    const scores = scoreAudit(s, runChecks(s));
    const by = Object.fromEntries(scores.categories.map((c) => [c.category, c.score]));
    expect(by.performance).toBe(62);
    expect(by.security).toBe(90);
    expect(by.seo).toBe(100);
  });
  it('lets each problem take a share of what is left, so stacked critical problems never reach zero', () => {
    const s = healthy();
    const critical = (checkId: string): Finding => ({
      checkId,
      variant: 'default',
      category: 'accessibility',
      severity: 'critical',
      confidence: 'certain',
      pages: [],
      templateIds: [],
      evidence: {},
    });
    const outcome = runChecks(s);
    const score = (count: number) =>
      scoreAudit(s, {
        ...outcome,
        findings: Array.from({ length: count }, (_, i) => critical(`a11y/test-${i}`)),
      }).categories.find((c) => c.category === 'accessibility')!.score;
    expect(score(1)).toBe(75);
    expect(score(4)).toBe(32);
    expect(score(5)).toBeLessThan(score(4)!);
  });
  it('puts the costliest problem first in the top five', () => {
    const s = healthy();
    s.pages[1]!.rawHtml = html(goodHead(), '<h1>Kontakt</h1><form action="http://example.com/wyslij"></form>');
    for (const p of s.pages) delete p.headers['x-content-type-options'];
    const top = topFindings(runChecks(s).findings, s);
    expect(top[0]?.checkId).toBe('sec/insecure-forms');
  });
});

describe('advice cards', () => {
  it('exist for every check', () => {
    expect(allChecks.map((c) => c.id).filter((id) => !cards[id])).toEqual([]);
  });
  it('have a text for every finding the checks emit', () => {
    const s = healthy();
    s.pages.push(
      page(
        '/x',
        '<html><head><title>a</title></head><body><img src="x.png"><h1>a</h1><h1>b</h1><h4>c</h4></body></html>',
      ),
    );
    for (const f of runChecks(s).findings) {
      const card = cards[f.checkId]!;
      if (f.severity === 'pass') expect(card.passed, f.checkId).toBeDefined();
      else expect(card.variants[f.variant], `${f.checkId}:${f.variant}`).toBeDefined();
    }
  });
});
