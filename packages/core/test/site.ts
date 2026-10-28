import type { PageSnapshot, SiteSnapshot } from '../src';

const ORIGIN = 'https://example.com';

export function page(path: string, html: string, overrides: Partial<PageSnapshot> = {}): PageSnapshot {
  const url = new URL(path, ORIGIN).toString().replace(/\/$/, path === '/' ? '/' : '');
  return {
    url,
    finalUrl: url,
    status: 200,
    redirects: [],
    headers: { 'content-type': 'text/html; charset=utf-8', 'content-encoding': 'br' },
    contentType: 'text/html; charset=utf-8',
    rawHtml: html,
    templateId: path === '/' ? '/' : `/${path.split('/')[1]}`,
    depth: path === '/' ? 0 : 1,
    ...overrides,
  };
}

/** A small, healthy https site; tests change the part they are about. */
export function site(pages: PageSnapshot[], overrides: Partial<SiteSnapshot> = {}): SiteSnapshot {
  return {
    input: { url: ORIGIN, pages: 10, lang: 'pl' },
    mode: 'cli',
    startedAt: '2026-10-24T10:00:00.000Z',
    versions: { sitelens: '0.0.0' },
    available: ['rawHtml', 'hosts', 'robots', 'sitemap', 'favicon', 'tls'],
    site: {
      origin: ORIGIN,
      finalUrl: `${ORIGIN}/`,
      hosts: [],
      robotsTxt: {
        url: `${ORIGIN}/robots.txt`,
        status: 200,
        body: `User-agent: *\nDisallow:\nSitemap: ${ORIGIN}/sitemap.xml`,
      },
      sitemaps: [{ url: `${ORIGIN}/sitemap.xml`, status: 200, body: '', urls: pages.map((p) => p.url) }],
      favicon: { url: `${ORIGIN}/favicon.ico`, status: 200 },
      tls: { authorized: true, altNames: ['example.com'], validTo: '2027-03-14T00:00:00.000Z', issuer: 'R11' },
    },
    templates: [],
    pages,
    links: [],
    discovered: pages.length,
    ...overrides,
  };
}

export function html(head: string, body = '<h1>Oferta</h1><p>Treść</p>'): string {
  return `<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${head}</head><body>${body}<footer><a href="/polityka-prywatnosci">Polityka prywatności</a> <a href="tel:+48600700800">+48 600 700 800</a></footer></body></html>`;
}

export const goodHead = (
  title = 'Oferta usług budowlanych | Przykładowa Firma',
  description = 'Remonty i wykończenia wnętrz w Warszawie.',
) =>
  `<title>${title}</title><meta name="description" content="${description}"><link rel="canonical" href="https://example.com/">` +
  '<meta property="og:title" content="Firma"><meta property="og:description" content="Opis"><meta property="og:image" content="https://example.com/og.png">';
