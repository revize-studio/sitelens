import { describe, expect, it } from 'vitest';
import {
  extractFacts,
  fillTemplate,
  isAllowed,
  normalizeUrl,
  parseRobots,
  parseSitemap,
  selectSample,
  fromLhr,
  type Lhr,
} from '../src';

describe('normalizeUrl', () => {
  it('drops fragments, tracking parameters and the trailing slash', () => {
    expect(normalizeUrl('/Oferta/?utm_source=x&id=2#top', 'https://Example.com/')).toBe(
      'https://example.com/Oferta?id=2',
    );
  });
  it('keeps the root slash and rejects other schemes', () => {
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com/');
    expect(normalizeUrl('mailto:a@b.pl')).toBeNull();
  });
});

describe('robots.txt', () => {
  const robots = parseRobots(`
User-agent: *
Disallow: /admin
Allow: /admin/public
Disallow: /*.pdf$

User-agent: Googlebot
Disallow: /tylko-dla-google
Sitemap: https://example.com/sitemap.xml
Crawl-delay: 5
oops this line is broken
`);

  it('lets the longest matching rule win, with Allow on a tie', () => {
    expect(isAllowed(robots, 'https://example.com/admin/panel', 'sitelens')).toBe(false);
    expect(isAllowed(robots, 'https://example.com/admin/public/x', 'sitelens')).toBe(true);
  });
  it('supports * and $ in rules', () => {
    expect(isAllowed(robots, 'https://example.com/plik.pdf', 'sitelens')).toBe(false);
    expect(isAllowed(robots, 'https://example.com/plik.pdf?x=1', 'sitelens')).toBe(true);
  });
  it('uses the group of the most specific user agent', () => {
    expect(isAllowed(robots, 'https://example.com/admin', 'Googlebot')).toBe(true);
    expect(isAllowed(robots, 'https://example.com/tylko-dla-google', 'Googlebot')).toBe(false);
  });
  it('collects sitemaps and lines it does not understand', () => {
    expect(robots.sitemaps).toEqual(['https://example.com/sitemap.xml']);
    expect(robots.invalidLines).toHaveLength(1);
  });
  it('matches a pattern full of wildcards without hanging', () => {
    const tricky = parseRobots('User-agent: *\nDisallow: /a*a*a*a*a*a*a*a*a*a*a*a*b');
    const started = performance.now();
    expect(isAllowed(tricky, `https://example.com/${'a'.repeat(400)}`, 'sitelens')).toBe(true);
    expect(performance.now() - started).toBeLessThan(200);
  });
  it('follows only groups that name sitelens exactly, and ignores an empty User-agent line', () => {
    const others = parseRobots('User-agent: *\nDisallow: /\n\nUser-agent: lens\nAllow: /\n\nUser-agent:\nAllow: /');
    expect(isAllowed(others, 'https://example.com/', 'sitelens')).toBe(false);
  });
  it('combines every group that names sitelens', () => {
    const split = parseRobots('User-agent: sitelens\nDisallow: /a\n\nUser-agent: sitelens\nDisallow: /b');
    expect(isAllowed(split, 'https://example.com/b', 'sitelens')).toBe(false);
  });
  it('matches rules written with or without percent-encoding', () => {
    expect(
      isAllowed(parseRobots('User-agent: *\nDisallow: /%C5%BCycie/'), 'https://example.com/życie/a', 'sitelens'),
    ).toBe(false);
    expect(
      isAllowed(parseRobots('User-agent: *\nDisallow: /życie/'), 'https://example.com/%C5%BCycie/a', 'sitelens'),
    ).toBe(false);
  });
});

describe('parseSitemap', () => {
  it('reads url sets and sitemap indexes', () => {
    expect(parseSitemap('<urlset><url><loc> https://a.pl/x </loc></url></urlset>')).toEqual({
      kind: 'urlset',
      urls: ['https://a.pl/x'],
    });
    expect(parseSitemap('<sitemapindex><sitemap><loc>https://a.pl/s1.xml</loc></sitemap></sitemapindex>').kind).toBe(
      'index',
    );
  });
  it('calls anything else invalid', () => {
    expect(parseSitemap('<html><body>404</body></html>').kind).toBe('invalid');
  });
});

describe('extractFacts', () => {
  const facts = extractFacts(
    `<html lang="pl"><head><title> Strona  główna </title><base href="/blog/"><meta name="description" content="Opis">
     <meta name="robots" content="noindex, follow"><meta property="og:image" content="/og.png"><link rel="icon" href="/fav.svg"></head>
     <body><h1>Witaj</h1><h3>Za głęboko</h3><img src="a.jpg"><img src="b.jpg" alt=""><a href="wpis#x">Wpis</a>
     <a href="tel:600700800">Zadzwoń</a><script src="http://cdn.example.com/x.js"></script>
     <form action="http://example.com/send"><input type="password"></form><p>Napisz: biuro@example.com lub 22 123 45 67</p></body></html>`,
    'https://example.com/',
  );

  it('reads the head', () => {
    expect(facts.title).toBe('Strona główna');
    expect(facts.description).toBe('Opis');
    expect(facts.robots).toContain('noindex');
    expect(facts.icons).toEqual(['https://example.com/fav.svg']);
  });
  it('resolves links against <base> and counts phone links', () => {
    expect(facts.links.map((l) => l.href)).toContain('https://example.com/blog/wpis');
    expect(facts.telLinks).toBe(1);
  });
  it('tells decorative images from images missing alt', () => {
    expect(facts.images.map((i) => [i.alt, i.decorative])).toEqual([
      [null, false],
      ['', true],
    ]);
  });
  it('finds insecure resources, forms and plain contact details', () => {
    expect(facts.insecureResources).toEqual(['http://cdn.example.com/x.js']);
    expect(facts.forms[0]).toMatchObject({ action: 'http://example.com/send', hasPassword: true });
    expect(facts.plainEmails).toBe(1);
    expect(facts.plainPhones).toBe(1);
  });
});

describe('phone numbers in plain text', () => {
  it('does not count company numbers such as NIP as phone numbers', () => {
    const facts = extractFacts(
      '<html><body><p>Firma sp. z o.o., NIP 123-456-78-90, REGON 123456785. Zadzwoń: 600 100 200 albo +48 22 123 45 67</p></body></html>',
      'https://example.com/',
    );
    expect(facts.plainPhones).toBe(2);
  });
});

describe('fillTemplate', () => {
  it('formats numbers, units and dates for the reader', () => {
    expect(
      fillTemplate(
        '{lcp:s} / {bytes:size} / {t:ms} / {cls:decimal}',
        { lcp: 4130, bytes: 6_840_000, t: 180, cls: 0.04 },
        'pl',
      ),
    ).toBe('4,1 s / 6,8 MB / 180 ms / 0,04');
    expect(fillTemplate('{d:date}', { d: '2027-03-14T00:00:00.000Z' }, 'pl')).toBe('14 marca 2027');
  });
  it('picks the Polish plural form', () => {
    const t = '{n} {n|zdjęcie|zdjęcia|zdjęć}';
    expect([1, 2, 5, 22, 25].map((n) => fillTemplate(t, { n }, 'pl'))).toEqual([
      '1 zdjęcie',
      '2 zdjęcia',
      '5 zdjęć',
      '22 zdjęcia',
      '25 zdjęć',
    ]);
    expect(fillTemplate('{n} {n|image|images}', { n: 1 }, 'en')).toBe('1 image');
  });
  it('leaves unknown placeholders visible', () => {
    expect(fillTemplate('{missing}', {}, 'pl')).toBe('{missing}');
  });
});

describe('selectSample', () => {
  it('starts with the homepage and key pages, then spreads over templates', () => {
    const found = [
      { url: 'https://a.pl/', depth: 0, linkTexts: [] },
      ...Array.from({ length: 8 }, (_, i) => ({ url: `https://a.pl/blog/wpis-${i}`, depth: 1, linkTexts: [] })),
      { url: 'https://a.pl/kontakt', depth: 1, linkTexts: ['Kontakt'] },
      { url: 'https://a.pl/sklep/produkt', depth: 2, linkTexts: [] },
    ];
    const urls = selectSample(found, 5).map((p) => p.url);
    expect(urls.slice(0, 2)).toEqual(['https://a.pl/', 'https://a.pl/kontakt']);
    expect(urls).toContain('https://a.pl/sklep/produkt');
    expect(urls.filter((u) => u.includes('/blog/')).length).toBeLessThanOrEqual(2);
  });
});

describe('fromLhr', () => {
  const lhr = (audits: Lhr['audits']): Lhr => ({
    lighthouseVersion: '13.5.0',
    configSettings: { formFactor: 'mobile' },
    categories: { performance: { score: 0.5 } },
    audits,
  });
  const reason = {
    resize:
      'This image file is larger than it needs to be (800x800) for its displayed dimensions (372x372). Use responsive images to reduce the image download size.',
    format:
      "Using a modern image format (WebP, AVIF) or increasing the image compression could improve this image's download size.",
  };

  it('splits Lighthouse 13 image advice into resizing and format savings', () => {
    const result = fromLhr(
      lhr({
        'image-delivery-insight': {
          details: {
            items: [
              {
                url: 'https://example.com/a.jpg',
                totalBytes: 900_000,
                wastedBytes: 700_000,
                subItems: {
                  items: [
                    { reason: reason.format, wastedBytes: 500_000 },
                    { reason: reason.resize, wastedBytes: 400_000 },
                  ],
                },
              },
              {
                url: 'https://example.com/b.png',
                totalBytes: 200_000,
                wastedBytes: 150_000,
                subItems: { items: [{ reason: reason.format, wastedBytes: 150_000 }] },
              },
            ],
          },
        },
      }),
    );
    expect(result.oversizedImages).toEqual([
      { url: 'https://example.com/a.jpg', totalBytes: 900_000, wastedBytes: 400_000 },
    ]);
    expect(result.legacyFormatImages.map((i) => [i.url, i.wastedBytes])).toEqual([
      ['https://example.com/a.jpg', 500_000],
      ['https://example.com/b.png', 150_000],
    ]);
  });

  it('reads render-blocking files and the LCP element from Lighthouse 13 insights', () => {
    const result = fromLhr(
      lhr({
        'render-blocking-insight': {
          details: { items: [{ url: 'https://example.com/style.css', totalBytes: 40_000, wastedMs: 900 }] },
        },
        'lcp-breakdown-insight': {
          details: {
            items: [{ type: 'table' }, { type: 'node', selector: 'div.hero > img', snippet: '<img class="hero">' }],
          },
        },
      }),
    );
    expect(result.renderBlocking).toEqual([
      { url: 'https://example.com/style.css', totalBytes: 40_000, wastedBytes: undefined, wastedMs: 900 },
    ]);
    expect(result.lcpElement).toBe('<img class="hero">');
  });
});
