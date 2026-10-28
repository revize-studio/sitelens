import { runChecks, scoreAudit, type Lhr } from '@sitelens/core';
import { FetchError } from '@sitelens/crawl';
import { describe, expect, it } from 'vitest';
import { axeFromLhr, collectOnline, networkFromLhr, ProxyError, proxyFetcher, PsiError, runPagespeed } from '../src';

function lhr(formFactor: 'mobile' | 'desktop'): Lhr {
  return {
    lighthouseVersion: '12.8.2',
    configSettings: { formFactor },
    categories: {
      performance: { score: formFactor === 'mobile' ? 0.58 : 0.9 },
      ...(formFactor === 'mobile'
        ? {
            accessibility: {
              auditRefs: [{ id: 'color-contrast' }, { id: 'heading-order' }, { id: 'image-alt' }, { id: 'label' }],
            },
          }
        : {}),
    },
    audits: {
      'largest-contentful-paint': { numericValue: 4100 },
      'cumulative-layout-shift': { numericValue: 0.02 },
      'total-blocking-time': { numericValue: 120 },
      'server-response-time': { numericValue: 300 },
      'network-requests': {
        details: {
          items: [
            {
              url: 'https://example.com/',
              statusCode: 200,
              resourceType: 'Document',
              transferSize: 9000,
              mimeType: 'text/html',
            },
            { url: 'https://example.com/brak.jpg', statusCode: 404, resourceType: 'Image', transferSize: 300 },
            { url: 'http://cdn.example.com/stary.js', statusCode: 200, resourceType: 'Script' },
            { url: 'https://example.com/przerwane.mp4', statusCode: -1, resourceType: 'Media' },
          ],
        },
      },
      'color-contrast': {
        score: 0,
        scoreDisplayMode: 'binary',
        title: 'Background and foreground colors do not have a sufficient contrast ratio.',
        details: {
          items: [
            {
              node: {
                selector: 'footer p',
                snippet: '<p>Kontakt</p>',
                explanation:
                  'Fix any of the following:\n  Element has insufficient color contrast of 3.38 (foreground color: #c6dfee, background color: #0079bf, font size: 12.0pt (16px), font weight: normal). Expected contrast ratio of 4.5:1',
              },
            },
          ],
          debugData: { impact: 'serious', tags: ['cat.color', 'wcag2aa'] },
        },
      },
      'heading-order': {
        score: 0,
        scoreDisplayMode: 'binary',
        details: { items: [{ node: { selector: 'h4' } }], debugData: { impact: 'moderate', tags: ['best-practice'] } },
      },
      'image-alt': { score: 1, scoreDisplayMode: 'binary' },
      label: { score: null, scoreDisplayMode: 'notApplicable' },
    },
  } as unknown as Lhr;
}

describe('reading a PageSpeed Insights result', () => {
  it('keeps the WCAG axe rules Lighthouse ran, with their impact and measured contrast', () => {
    const axe = axeFromLhr(lhr('mobile'))!;
    expect(axe.violations.map((v) => v.id)).toEqual(['color-contrast']);
    expect(axe.violations[0]).toMatchObject({ impact: 'serious', count: 1 });
    expect(axe.violations[0]!.nodes[0]!.contrast).toEqual({ ratio: 3.38, fg: '#c6dfee', bg: '#0079bf', expected: 4.5 });
    expect(axe.passes).toEqual(['image-alt']);
  });
  it('lists the files the page loaded, without guessing why a request did not finish', () => {
    const network = networkFromLhr(lhr('mobile'));
    expect(network.find((r) => r.url.endsWith('brak.jpg'))).toMatchObject({ type: 'image', status: 404 });
    expect(network.find((r) => r.url.endsWith('.mp4'))).toMatchObject({ type: 'media', status: 0 });
    expect(network.find((r) => r.url.endsWith('.mp4'))?.failed).toBeUndefined();
  });
});

describe('runPagespeed', () => {
  const answer = (status: number, body: unknown) => async () => Response.json(body, { status });
  const quota = (limit: string) => ({
    error: {
      message: `Quota exceeded for quota metric 'Queries' and limit '${limit}'`,
      errors: [{ reason: 'rateLimitExceeded' }],
      details: [{ metadata: { quota_limit: limit } }],
    },
  });
  it('says when the daily quota is used up, so the page can ask for a key of the visitor', async () => {
    const fetch = answer(429, quota('defaultPerDayPerProject'));
    await expect(runPagespeed('https://example.com/', 'mobile', { lang: 'pl', fetch })).rejects.toMatchObject({
      problem: 'quota',
    });
  });
  it('waits and tries again when only the per-minute quota is used up', async () => {
    let calls = 0;
    const waits: number[] = [];
    const fetch = async () =>
      ++calls === 1
        ? Response.json(quota('defaultPerMinutePerProject'), { status: 429 })
        : Response.json({ lighthouseResult: lhr('mobile') });
    const result = await runPagespeed('https://example.com/', 'mobile', {
      lang: 'pl',
      fetch,
      wait: async (ms) => void waits.push(ms),
    });
    expect(result.lighthouseVersion).toBe('12.8.2');
    expect(waits).toEqual([30_000]);
  });
  it('sends the key in a header, not in the address', async () => {
    let seen: { url: string; key: string | null } | undefined;
    const fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      seen = { url: String(input), key: new Headers(init?.headers).get('x-goog-api-key') };
      return Response.json({ lighthouseResult: lhr('mobile') });
    };
    await runPagespeed('https://example.com/', 'mobile', { lang: 'pl', key: 'secret-key', fetch });
    expect(seen?.key).toBe('secret-key');
    expect(seen?.url).not.toContain('secret-key');
  });
  it("treats a Lighthouse run that failed on Google's side as a problem of that page", async () => {
    const failed = {
      ...lhr('mobile'),
      runtimeError: { code: 'NO_FCP', message: 'The page did not paint any content.' },
    };
    const fetch = async () => Response.json({ lighthouseResult: failed });
    await expect(runPagespeed('https://example.com/', 'mobile', { lang: 'pl', fetch })).rejects.toMatchObject({
      problem: 'page',
    });
  });
  it('says when the key is wrong or not allowed on this site', async () => {
    const fetch = answer(400, { error: { message: 'API key not valid', errors: [{ reason: 'keyInvalid' }] } });
    await expect(runPagespeed('https://example.com/', 'mobile', { lang: 'pl', key: 'x', fetch })).rejects.toMatchObject(
      { problem: 'key' },
    );
  });
  it('recognises the answer Google really gives for a wrong key', async () => {
    const fetch = answer(400, {
      error: {
        code: 400,
        message: 'API key not valid. Please pass a valid API key.',
        status: 'INVALID_ARGUMENT',
        errors: [{ reason: 'badRequest' }],
        details: [{ reason: 'API_KEY_INVALID' }],
      },
    });
    await expect(runPagespeed('https://example.com/', 'mobile', { lang: 'pl', key: 'x', fetch })).rejects.toMatchObject(
      {
        problem: 'key',
      },
    );
  });
  it('tries once more after a server error', async () => {
    let calls = 0;
    const fetch = async () =>
      ++calls === 1 ? Response.json({}, { status: 500 }) : Response.json({ lighthouseResult: lhr('mobile') });
    expect((await runPagespeed('https://example.com/', 'mobile', { lang: 'pl', fetch })).lighthouseVersion).toBe(
      '12.8.2',
    );
  });
  it('reports a page Lighthouse could not load as a problem of that page', async () => {
    const fetch = answer(400, { error: { message: 'Lighthouse returned error: FAILED_DOCUMENT_REQUEST' } });
    const error = await runPagespeed('https://example.com/x', 'mobile', { lang: 'pl', fetch }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PsiError);
    expect((error as PsiError).problem).toBe('page');
  });
});

describe('proxyFetcher', () => {
  const settings = (response: () => Response) => ({
    endpoint: 'https://proxy.example',
    pass: 'p',
    fetch: async () => response(),
  });
  it('turns a site error into the same FetchError the CLI throws', async () => {
    const fetch = proxyFetcher(
      settings(() => Response.json({ ok: false, error: { code: 'blocked', message: 'robots.txt' } })),
    );
    await expect(fetch('https://example.com/x')).rejects.toBeInstanceOf(FetchError);
  });
  it('stops the audit when the pass expired or the proxy is used up for the day', async () => {
    await expect(
      proxyFetcher(settings(() => new Response(null, { status: 401 })))('https://example.com/'),
    ).rejects.toMatchObject({ problem: 'pass' });
    await expect(
      proxyFetcher(settings(() => new Response('<html>Error 1027</html>', { status: 429 })))('https://example.com/'),
    ).rejects.toBeInstanceOf(ProxyError);
  });
});

describe('collectOnline', () => {
  it('collects a whole audit through the proxy and PageSpeed Insights, ready for the checks', async () => {
    const page = (body: string) => ({
      ok: true,
      result: {
        status: 200,
        redirects: [],
        headers: { 'content-type': 'text/html' },
        contentType: 'text/html',
        body,
        truncated: false,
      },
    });
    const sitePages: Record<string, string> = {
      'https://example.com/':
        '<html lang="pl"><head><title>Firma remontowa z Warszawy | Przykład</title></head><body><h1>Firma</h1><a href="/oferta">Oferta</a></body></html>',
      'https://example.com/oferta':
        '<html lang="pl"><head><title>Oferta remontów łazienek i kuchni | Przykład</title></head><body><h1>Oferta</h1></body></html>',
    };
    const fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith('https://www.googleapis.com/'))
        return Response.json({
          lighthouseResult: lhr(new URL(url).searchParams.get('strategy') === 'DESKTOP' ? 'desktop' : 'mobile'),
        });
      const { url: target } = JSON.parse(String(init!.body)) as { url: string };
      const body = sitePages[target];
      if (!body)
        return Response.json({
          ok: true,
          result: {
            status: 404,
            redirects: [],
            headers: {},
            body: '',
            truncated: false,
            url: target,
            finalUrl: target,
          },
        });
      return Response.json({ ...page(body), result: { ...page(body).result, url: target, finalUrl: target } });
    };
    const { snapshot, pagespeedProblem } = await collectOnline({
      input: { url: 'example.com', pages: 5, lang: 'pl' },
      proxy: { endpoint: 'https://proxy.example', pass: 'p', fetch: fetch as typeof globalThis.fetch },
      psi: { fetch: fetch as typeof globalThis.fetch },
      sitelensVersion: 'test',
    });
    expect(pagespeedProblem).toBeUndefined();
    expect(snapshot.mode).toBe('online');
    expect(snapshot.pages.map((p) => new URL(p.url).pathname)).toEqual(['/', '/oferta']);
    expect(snapshot.available).toEqual(expect.arrayContaining(['lighthouse', 'network', 'axe']));
    expect(snapshot.available).not.toContain('tls');
    const outcome = runChecks(snapshot);
    expect(outcome.skipped.map((s) => s.checkId)).toContain('sec/certificate');
    expect(outcome.findings.some((f) => f.checkId === 'a11y/contrast' && f.severity === 'important')).toBe(true);
    expect(outcome.findings.some((f) => f.checkId === 'content/broken-media' && f.severity !== 'pass')).toBe(true);
    // Homepage 58 × 0.7 + 90 × 0.3 = 67.6, the other page 58 on a phone only: (67.6 + 58) / 2 ≈ 63
    expect(scoreAudit(snapshot, outcome).categories.find((c) => c.category === 'performance')?.score).toBe(63);
  });
});
