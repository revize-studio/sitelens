import { describe, expect, it } from 'vitest';
import { crawlSite, FetchError, parseTarget, preflight, PreflightError, type Fetcher, type FetchResult } from '../src';

type Answer = Partial<FetchResult> & { status: number };

/** A pretend site: each address answers with what the map says, anything else is a 404. */
function site(pages: Record<string, Answer | FetchError>): Fetcher & { calls: string[]; heads: string[] } {
  const calls: string[] = [];
  const heads: string[] = [];
  const fetcher: Fetcher = async (url, options) => {
    calls.push(url);
    if (options?.method === 'HEAD') heads.push(url);
    const answer = pages[url] ?? { status: 404 };
    if (answer instanceof FetchError) throw answer;
    return {
      url,
      finalUrl: answer.finalUrl ?? url,
      status: answer.status,
      redirects: answer.redirects ?? [],
      headers: answer.headers ?? {},
      contentType: answer.contentType ?? (answer.body !== undefined ? 'text/html' : undefined),
      body: answer.body ?? '',
      truncated: false,
    };
  };
  return Object.assign(fetcher, { calls, heads });
}

const html = (body: string) =>
  `<!doctype html><html lang="pl"><head><title>Firma</title></head><body>${body}</body></html>`;

describe('parseTarget', () => {
  it('adds https to an address typed without it', () => {
    expect(parseTarget('example.com/oferta').toString()).toBe('https://example.com/oferta');
  });
  it('refuses anything that is not a website address', () => {
    expect(() => parseTarget('ftp://example.com')).toThrow(PreflightError);
    expect(() => parseTarget('nie adres')).toThrow(PreflightError);
  });
});

describe('preflight', () => {
  it('reports a name that does not resolve as a DNS problem', async () => {
    const fetcher = site({ 'https://nieistnieje.pl/': new FetchError('dns', 'https://nieistnieje.pl/', 'ENOTFOUND') });
    await expect(preflight('nieistnieje.pl', { fetcher })).rejects.toMatchObject({ code: 'dns' });
  });
  it('tells apart a site the proxy is not allowed to read', async () => {
    const fetcher = site({ 'https://example.com/': new FetchError('blocked', 'https://example.com/', 'robots.txt') });
    await expect(preflight('example.com', { fetcher })).rejects.toMatchObject({ code: 'blocked' });
  });
  it('falls back to http when https does not answer for an address typed without a scheme', async () => {
    const fetcher = site({
      'https://example.com/': new FetchError('refused', 'https://example.com/', 'ECONNREFUSED'),
      'http://example.com/': { status: 200, body: html('') },
    });
    expect((await preflight('example.com', { fetcher })).origin).toBe('http://example.com');
  });
  it('probes the http and www variants of the final address', async () => {
    const fetcher = site({ 'https://example.com/': { status: 200, body: html('') } });
    const { hosts } = await preflight('example.com', { fetcher });
    expect(hosts.map((h) => h.url)).toEqual([
      'http://example.com/',
      'http://www.example.com/',
      'https://example.com/',
      'https://www.example.com/',
    ]);
  });
});

describe('crawlSite', () => {
  it('follows links, obeys robots.txt and checks the links it did not open', async () => {
    const fetcher = site({
      'https://example.com/': { status: 200, body: html('<a href="/oferta">Oferta</a> <a href="/admin">Panel</a>') },
      'https://example.com/robots.txt': {
        status: 200,
        contentType: 'text/plain',
        body: 'User-agent: *\nDisallow: /admin',
      },
      'https://example.com/oferta': { status: 200, body: html('<a href="/stara-strona">Stara</a>') },
    });
    const crawl = await crawlSite({ url: 'example.com', pages: 5, lang: 'pl' }, { fetcher });
    expect(crawl.pages.map((p) => new URL(p.url).pathname)).toEqual(['/', '/oferta']);
    expect(fetcher.calls).not.toContain('https://example.com/admin');
    expect(crawl.discovery.links.find((l) => l.url.endsWith('/stara-strona'))).toMatchObject({ status: 404 });
  });
  it('checks no more link targets than it is allowed to', async () => {
    // More links than the crawl budget of 30 pages, so some targets are left for the link check
    const links = Array.from({ length: 45 }, (_, i) => `<a href="/p${i}">${i}</a>`).join(' ');
    const fetcher = site({ 'https://example.com/': { status: 200, body: html(links) } });
    await crawlSite({ url: 'example.com', pages: 1, lang: 'pl' }, { fetcher, linkChecks: 3 });
    expect(fetcher.heads).toHaveLength(3);
  });
});

describe('files the online proxy may not read', () => {
  it('are left out instead of being reported as a broken sitemap or a missing icon', async () => {
    const fetcher = site({
      'https://example.com/': {
        status: 200,
        body: html('<link rel="icon" href="https://cdn.example.net/icon.png">'),
      },
      'https://example.com/robots.txt': {
        status: 200,
        contentType: 'text/plain',
        body: 'User-agent: *\nDisallow:\nSitemap: https://cdn.example.net/sitemap.xml',
      },
      'https://cdn.example.net/sitemap.xml': new FetchError(
        'blocked',
        'https://cdn.example.net/sitemap.xml',
        'other site',
      ),
      'https://cdn.example.net/icon.png': new FetchError('blocked', 'https://cdn.example.net/icon.png', 'other site'),
    });
    const crawl = await crawlSite({ url: 'example.com', pages: 1, lang: 'pl' }, { fetcher });
    expect(crawl.discovery.sitemaps).toEqual([]);
    expect(crawl.favicon).toBeUndefined();
  });
});

describe('errors that are not about one page', () => {
  it('end the audit instead of skipping the page', async () => {
    class LimitReached extends Error {}
    const fetcher: Fetcher = async (url) => {
      if (url.endsWith('/oferta')) throw new LimitReached('daily limit');
      return {
        url,
        finalUrl: url,
        status: 200,
        redirects: [],
        headers: {},
        contentType: 'text/html',
        body: html('<a href="/oferta">Oferta</a>'),
        truncated: false,
      };
    };
    await expect(crawlSite({ url: 'example.com', pages: 5, lang: 'pl' }, { fetcher })).rejects.toBeInstanceOf(
      LimitReached,
    );
  });
});
