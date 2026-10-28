import { createServer, type Server } from 'node:http';
import { runChecks, type SiteSnapshot } from '@sitelens/core';
import type { Browser } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { collectSite, fetchPage, findBrowser, launchBrowser, parseTarget, PreflightError } from '../src';
import { renderPage } from '../src/render';
import { serveFixture } from './server';

const browserInfo = findBrowser();

describe('parseTarget', () => {
  it('accepts an address typed without https', () => {
    expect(parseTarget('example.com/oferta').toString()).toBe('https://example.com/oferta');
  });
  it('rejects things that are not website addresses', () => {
    expect(() => parseTarget('ftp://example.com')).toThrow(PreflightError);
    expect(() => parseTarget('nie adres')).toThrow(PreflightError);
  });
});

describe('fetchPage', () => {
  let site: Awaited<ReturnType<typeof serveFixture>>;
  beforeAll(async () => {
    site = await serveFixture('broken');
  });
  afterAll(() => site.close());

  it('reads a page with its status and headers', async () => {
    const page = await fetchPage(`${site.url}oferta`);
    expect(page.status).toBe(200);
    expect(page.body).toContain('<h1>Oferta</h1>');
    expect(page.headers['content-type']).toContain('text/html');
  });
});

describe.skipIf(!browserInfo)('collectSite on a site with deliberate problems', () => {
  let site: Awaited<ReturnType<typeof serveFixture>>;
  let snapshot: SiteSnapshot;

  beforeAll(async () => {
    site = await serveFixture('broken');
    const browser = await launchBrowser(browserInfo!.path);
    try {
      snapshot = await collectSite({
        input: { url: site.url, pages: 5, lang: 'pl' },
        browser,
        browserPath: browserInfo!.path,
        sitelensVersion: 'test',
        lighthouse: false,
      });
    } finally {
      await browser.close();
    }
  }, 120_000);
  afterAll(() => site?.close());

  it('finds the pages through links and checks link targets', () => {
    expect(snapshot.pages.map((p) => new URL(p.url).pathname).sort()).toEqual(['/', '/kontakt', '/oferta']);
    expect(snapshot.links.find((l) => l.url.endsWith('/stara-strona'))?.status).toBe(404);
  });

  it('records the browser view: network, axe and the broken image', () => {
    const home = snapshot.pages.find((p) => new URL(p.url).pathname === '/')!;
    expect(home.rendered?.axe?.violations.map((v) => v.id)).toContain('color-contrast');
    expect(home.rendered?.network.some((r) => r.url.endsWith('/brak-zdjecia.jpg') && r.status === 404)).toBe(true);
  });

  it('turns the deliberate problems into findings', () => {
    const found = new Set(
      runChecks(snapshot)
        .findings.filter((f) => f.severity !== 'pass')
        .map((f) => `${f.checkId}:${f.variant}`),
    );
    for (const expected of [
      'seo/meta-description:missing',
      'seo/title:duplicate',
      'seo/headings:multiple',
      'seo/image-alt:default',
      'seo/broken-links:default',
      'seo/sitemap:missing',
      'mobile/viewport:default',
      'a11y/contrast:default',
      'sec/insecure-forms:default',
      'sec/info-disclosure:default',
      'content/contact:not-clickable',
      'content/broken-media:default',
      'privacy/policy-link:missing',
    ])
      expect(found, expected).toContain(expected);
  });
});

describe.skipIf(!browserInfo)('renderPage', () => {
  let browser: Browser;
  let server: Server;
  let url: string;
  let refuseChrome = false;

  beforeAll(async () => {
    server = createServer((req, res) => {
      const agent = req.headers['user-agent'] ?? '';
      const refused = agent.includes('HeadlessChrome') || (refuseChrome && agent.includes('Chrome/'));
      res.writeHead(refused ? 400 : 200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(refused ? '<h1>400 Bad Request</h1>' : `<!doctype html><html lang="pl"><title>Ok</title><p>${agent}</p>`);
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    url = `http://localhost:${(server.address() as { port: number }).port}/`;
    browser = await launchBrowser(browserInfo!.path);
  }, 60_000);
  afterAll(async () => {
    await browser?.close();
    await new Promise((resolve) => server.close(resolve));
  });

  it('presents itself as regular Chrome and says it is sitelens', async () => {
    const { html } = await renderPage(browser, url);
    expect(html).toContain('sitelens (+https://github.com/revize-studio/sitelens)');
    expect(html).not.toContain('HeadlessChrome');
  });
  it('refuses to audit an error page that only the browser was shown', async () => {
    refuseChrome = true;
    await expect(renderPage(browser, url)).rejects.toThrow('HTTP 400');
  });
});
