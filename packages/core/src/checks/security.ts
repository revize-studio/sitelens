import { thresholds } from '../config/scoring';
import type { PageSnapshot } from '../model';
import { type Check, examples, finding, header, homepage, htmlPages, pass, siteWide, withFacts } from './helpers';

const DAY = 86_400_000;

function httpsPages(pages: PageSnapshot[]) {
  return pages.filter((page) => page.finalUrl.startsWith('https:'));
}

/** Pages of an https site that lack a header; reported once for the site when every page lacks it. */
function missingHeader(pages: PageSnapshot[], test: (page: PageSnapshot) => boolean): string[] {
  return pages.filter((page) => !test(page)).map((page) => page.url);
}

const https: Check = {
  id: 'sec/https',
  category: 'security',
  stage: 'mvp',
  requires: ['hosts'],
  run(site) {
    if (!site.site.finalUrl.startsWith('https:'))
      return [finding(site, this, { variant: 'no-https', severity: 'critical', details: site.site.finalUrl })];
    const plain = site.site.hosts.filter((probe) => probe.url.startsWith('http:') && !probe.error);
    const stuck = plain.filter((probe) => probe.finalUrl?.startsWith('http:'));
    if (stuck.length)
      return [
        finding(site, this, {
          variant: 'no-redirect',
          severity: 'critical',
          details: examples(stuck.map((p) => `${p.url} → ${p.status}`)),
        }),
      ];
    const temporary = plain.filter(
      (probe) => probe.redirects[0] && [302, 303, 307].includes(probe.redirects[0].status),
    );
    if (temporary.length)
      return [
        finding(site, this, {
          variant: 'temporary-redirect',
          severity: 'important',
          details: examples(temporary.map((p) => `${p.url} → ${p.redirects[0]!.status} ${p.redirects[0]!.to}`)),
        }),
      ];
    return [pass(site, this)];
  },
};

const certificate: Check = {
  id: 'sec/certificate',
  category: 'security',
  stage: 'mvp',
  requires: ['tls'],
  run(site) {
    const tls = site.site.tls;
    if (!tls) return [];
    if (!tls.authorized)
      return [
        finding(site, this, {
          variant: 'invalid',
          severity: 'critical',
          evidence: { reason: tls.error ?? '' },
          details: [tls.error, tls.issuer].filter(Boolean).join('; '),
        }),
      ];
    if (tls.validTo) {
      const days = Math.floor((Date.parse(tls.validTo) - Date.parse(site.startedAt)) / DAY);
      if (days < thresholds.certificateWarningDays)
        return [
          finding(site, this, {
            variant: 'expiring',
            severity: 'important',
            evidence: { days, expires: tls.validTo },
            details: [tls.validTo, tls.issuer].filter(Boolean).join('; '),
          }),
        ];
      return [pass(site, this, { expires: tls.validTo })];
    }
    return [pass(site, this)];
  },
};

const mixedContent: Check = {
  id: 'sec/mixed-content',
  category: 'security',
  stage: 'mvp',
  requires: ['rawHtml'],
  run(site) {
    const affected = withFacts(site)
      .filter(({ page }) => page.finalUrl.startsWith('https:'))
      .map(({ page, facts }) => {
        const loaded = (page.rendered?.network ?? []).filter((r) => r.url.startsWith('http:')).map((r) => r.url);
        return { page, urls: [...new Set([...facts.insecureResources, ...loaded])] };
      })
      .filter(({ urls }) => urls.length);
    if (!affected.length) return [pass(site, this)];
    const urls = [...new Set(affected.flatMap(({ urls }) => urls))];
    return [
      finding(site, this, {
        severity: 'important',
        pages: affected.map(({ page }) => page.url),
        evidence: { count: urls.length },
        details: examples(urls),
      }),
    ];
  },
};

const insecureForms: Check = {
  id: 'sec/insecure-forms',
  category: 'security',
  stage: 'mvp',
  requires: ['rawHtml'],
  run(site) {
    const affected = withFacts(site).filter(({ page, facts }) =>
      facts.forms.some(
        (form) => form.action.startsWith('http:') || (form.hasPassword && page.finalUrl.startsWith('http:')),
      ),
    );
    if (!affected.length) return [pass(site, this)];
    return [
      finding(site, this, {
        severity: 'critical',
        pages: affected.map(({ page }) => page.url),
        evidence: { count: affected.length },
        details: examples(
          affected.flatMap(({ facts }) =>
            facts.forms.filter((f) => f.action.startsWith('http:')).map((f) => `action=${f.action}`),
          ),
        ),
      }),
    ];
  },
};

const hsts: Check = {
  id: 'sec/hsts',
  category: 'security',
  stage: 'mvp',
  requires: ['rawHtml'],
  run(site) {
    const pages = httpsPages(htmlPages(site));
    if (!pages.length) return [];
    const missing = missingHeader(pages, (page) => Boolean(header(page, 'strict-transport-security')));
    if (missing.length)
      return [
        finding(site, this, {
          variant: 'missing',
          severity: 'important',
          pages: siteWide(site, missing),
        }),
      ];
    const maxAges = pages.map((page) =>
      Number(/max-age=(\d+)/i.exec(header(page, 'strict-transport-security') ?? '')?.[1] ?? 0),
    );
    const shortest = Math.min(...maxAges);
    if (shortest < thresholds.hstsMinMaxAge)
      return [
        finding(site, this, {
          variant: 'short',
          severity: 'minor',
          evidence: { days: Math.floor(shortest / 86_400) },
          details: `max-age=${shortest}`,
        }),
      ];
    return [pass(site, this)];
  },
};

function cspOf(page: PageSnapshot): string {
  return header(page, 'content-security-policy') ?? '';
}

const csp: Check = {
  id: 'sec/csp',
  category: 'security',
  stage: 'mvp',
  requires: ['rawHtml'],
  run(site) {
    const pages = htmlPages(site);
    const missing = missingHeader(pages, (page) => Boolean(cspOf(page)));
    if (missing.length)
      return [
        finding(site, this, {
          variant: 'missing',
          severity: 'minor',
          pages: siteWide(site, missing),
        }),
      ];
    const weak = pages
      .map((page) => {
        const policy = cspOf(page);
        const scripts = /script-src([^;]*)/i.exec(policy)?.[1] ?? /default-src([^;]*)/i.exec(policy)?.[1] ?? '';
        // 'unsafe-inline' is ignored by browsers when a nonce or hash is present
        const inline = /'unsafe-inline'/.test(scripts) && !/'(nonce-|sha(256|384|512)-)/.test(scripts);
        const problems = [
          inline && "'unsafe-inline'",
          /'unsafe-eval'/.test(scripts) && "'unsafe-eval'",
          /(^|\s)\*(\s|$)/.test(scripts) && '*',
        ].filter((p): p is string => Boolean(p));
        return { page, problems };
      })
      .filter(({ problems }) => problems.length);
    if (weak.length)
      return [
        finding(site, this, {
          variant: 'weak',
          severity: 'minor',
          pages: siteWide(
            site,
            weak.map(({ page }) => page.url),
          ),
          evidence: { problems: [...new Set(weak.flatMap(({ problems }) => problems))].join(', ') },
          details: `script-src ${[...new Set(weak.flatMap(({ problems }) => problems))].join(' ')}`,
        }),
      ];
    return [pass(site, this)];
  },
};

const clickjacking: Check = {
  id: 'sec/clickjacking',
  category: 'security',
  stage: 'mvp',
  requires: ['rawHtml'],
  run(site) {
    const missing = missingHeader(
      htmlPages(site),
      (page) =>
        /^(deny|sameorigin)$/i.test((header(page, 'x-frame-options') ?? '').trim()) ||
        /frame-ancestors/i.test(cspOf(page)),
    );
    if (!missing.length) return [pass(site, this)];
    return [
      finding(site, this, {
        severity: 'minor',
        pages: siteWide(site, missing),
      }),
    ];
  },
};

const otherHeaders: Check = {
  id: 'sec/headers-other',
  category: 'security',
  stage: 'mvp',
  requires: ['rawHtml'],
  run(site) {
    const home = homepage(site);
    if (!home || home.status >= 400) return [];
    const missing = [
      ['X-Content-Type-Options', /nosniff/i.test(header(home, 'x-content-type-options') ?? '')],
      ['Referrer-Policy', Boolean(header(home, 'referrer-policy'))],
      ['Permissions-Policy', Boolean(header(home, 'permissions-policy'))],
    ]
      .filter(([, present]) => !present)
      .map(([name]) => name as string);
    if (!missing.length) return [pass(site, this)];
    return [
      finding(site, this, {
        severity: 'minor',
        evidence: { count: missing.length, headers: missing.join(', ') },
        details: missing.join(', '),
      }),
    ];
  },
};

const infoDisclosure: Check = {
  id: 'sec/info-disclosure',
  category: 'security',
  stage: 'mvp',
  requires: ['rawHtml'],
  run(site) {
    const home = homepage(site);
    if (!home || home.status >= 400) return [];
    const found: string[] = [];
    const server = header(home, 'server');
    if (server && /\d/.test(server)) found.push(`Server: ${server}`);
    const poweredBy = header(home, 'x-powered-by');
    if (poweredBy) found.push(`X-Powered-By: ${poweredBy}`);
    const generator = withFacts(site).find(({ page }) => page === home)?.facts.generator;
    if (generator && /\d/.test(generator)) found.push(`<meta name="generator" content="${generator}">`);
    if (!found.length) return [pass(site, this)];
    return [
      finding(site, this, {
        severity: 'minor',
        evidence: { count: found.length, items: found.join('; ') },
        details: found.join('; '),
      }),
    ];
  },
};

export const securityChecks: Check[] = [
  https,
  certificate,
  mixedContent,
  insecureForms,
  hsts,
  csp,
  clickjacking,
  otherHeaders,
  infoDisclosure,
];
