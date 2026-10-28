import { analyseBrand, extractPage, logoRules, themeToggles, uiRules, type Brandbook, type RawBrand } from '@sitelens/brand';
import type { Browser, Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { collectBrand, findBrowser, launchBrowser } from '../src';
import { serveFixture } from './server';

const browserInfo = findBrowser();
const OPTIONS = {
  logoHint: logoRules.hint,
  consent: uiRules.consent,
  skipLink: uiRules.skipLink,
  maxHeight: 4000,
  sampleStep: 24,
  scheme: 'light' as const,
  pageUrl: 'https://firma.pl/',
};

describe('themeToggles', () => {
  it('turns theme selectors into attribute changes on <html>', () => {
    expect(themeToggles([':root[data-theme="dark"]', 'html.dark', '.theme-dark, :root'])).toEqual([
      { attribute: 'data-theme', value: 'dark' },
      { attribute: 'class', value: 'dark' },
      { attribute: 'class', value: 'theme-dark' },
    ]);
  });
});

describe.skipIf(!browserInfo)('extractPage', () => {
  let browser: Browser;
  let page: Page;
  beforeAll(async () => {
    browser = await launchBrowser(browserInfo!.path);
    page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  });
  afterAll(() => browser?.close());

  const read = async (body: string, head = '') => {
    await page.setContent(`<!doctype html><html lang="pl"><head>${head}</head><body>${body}</body></html>`);
    return page.evaluate(extractPage, OPTIONS);
  };
  const svg = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40"><rect width="120" height="40" fill="#0b2545"/></svg>')}`;

  it('finds a logo image in the home link even without the word logo', async () => {
    const raw = await read(`<header><a href="/"><img src="${svg}" alt="Firma" width="120" height="40"></a></header>`);
    expect(raw.logos).toHaveLength(1);
    expect(raw.logos[0]).toMatchObject({ kind: 'img', area: 'header', inHomeLink: true });
    // Browsers give an SVG without width and height a default size; only its proportions count
    const [width, height] = raw.logos[0]!.natural!;
    expect(width / height).toBeCloseTo(3, 1);
  });

  it('reads an inline SVG logo with its colours and the symbols it uses', async () => {
    const raw = await read(
      '<svg style="display:none"><symbol id="mark" viewBox="0 0 10 10"><rect width="10" height="10" fill="#9c6b3c"/></symbol></svg>' +
        '<header><a href="/" aria-label="Firma, strona główna"><svg class="logo" viewBox="0 0 100 30" width="100" height="30"><use href="#mark"/><mask id="m"><rect width="100" height="30" fill="#fff"/></mask><rect x="40" width="60" height="30" fill="#2b2118"/></svg></a></header>',
    );
    const logo = raw.logos.find((l) => l.kind === 'svg')!;
    expect(logo.hint).toBe(true);
    expect(logo.svg).toContain('<symbol id="mark"');
    expect(Object.keys(logo.fills)).toContain('rgb(43, 33, 24)');
    expect(Object.keys(logo.fills)).not.toContain('rgb(255, 255, 255)');
  });

  it('keeps scripts and event handlers out of the copied logo', async () => {
    const raw = await read(
      '<header><a href="/"><svg class="logo" viewBox="0 0 10 10" width="100" height="100" onclick="alert(1)">' +
        '<script>alert(2)</script><a href="java&#9;script:alert(3)"><rect width="10" height="10" fill="#000"/></a>' +
        '<set attributeName="href" to="javascript:alert(4)"/><animate attributeName="href" values="javascript:alert(5)"/>' +
        '<image href="https://tracker.example/x.png" width="1" height="1"/><use href="#mark"/><foreignObject><div>x</div></foreignObject></svg></a></header>',
    );
    const svg = raw.logos.find((l) => l.kind === 'svg')!.svg!;
    expect(svg).not.toMatch(/onclick|<script|script:|<set|<animate|<foreignObject|tracker\.example|<a /i);
    expect(svg).toContain('<rect');
    expect(svg).toContain('href="#mark"');
  });

  it('reads a logo that only the structured data names', async () => {
    const raw = await read(
      '<h1>Firma</h1>',
      '<script type="application/ld+json">{"@graph":[{"@type":"WebSite"},{"@type":"Organization","name":"Firma","logo":{"@type":"ImageObject","url":"/img/logo.png"}}]}</script>',
    );
    expect(raw.logos).toHaveLength(0);
    expect(raw.meta.organization).toEqual({ name: 'Firma', logo: 'https://firma.pl/img/logo.png' });
  });

  it('leaves out skip links and cookie banners from the buttons', async () => {
    const raw = await read(
      '<a href="#main" style="position:absolute;background:#fff;padding:8px;clip-path:inset(50%)">Przejdź do treści</a>' +
        '<a href="/kontakt" style="display:inline-block;background:#2b5cf0;color:#fff;padding:12px 24px">Umów pomiar</a>' +
        '<div id="cookie-banner"><button style="background:#4caf50;color:#fff;padding:10px 18px">Akceptuję</button></div>',
    );
    expect(raw.buttons.map((b) => [b.text, b.inConsent])).toEqual([
      ['Umów pomiar', false],
      ['Akceptuję', true],
    ]);
  });

  it('reads tokens from stylesheets and the theme selectors that change them', async () => {
    const raw = await read(
      '<p>Tekst</p>',
      '<style>:root{--brand:#2b5cf0;--ink:#111}:root[data-theme="dark"]{--ink:#eee}@media (prefers-color-scheme:dark){:root{--paper:#000}}</style>',
    );
    expect(raw.tokens.map((t) => [t.name, t.value])).toEqual([
      ['--brand', '#2b5cf0'],
      ['--ink', '#111'],
    ]);
    expect(raw.themeSelectors).toEqual([':root[data-theme="dark"]']);
    expect(raw.darkMedia).toBe(true);
  });
});

describe.skipIf(!browserInfo)('collectBrand and analyseBrand on a fixture site', () => {
  let site: Awaited<ReturnType<typeof serveFixture>>;
  let browser: Browser;
  let raw: RawBrand;
  let book: Brandbook;

  beforeAll(async () => {
    site = await serveFixture('brand');
    browser = await launchBrowser(browserInfo!.path);
    ({ raw } = await collectBrand({ url: site.url, browser, pages: 2, sitelensVersion: 'test' }));
    book = analyseBrand(raw, { lang: 'pl', generatedAt: '2026-10-27T00:00:00.000Z' });
  }, 120_000);
  afterAll(async () => {
    await browser?.close();
    await site?.close();
  });

  it('groups the brand colours and leaves out framework and chart tokens', () => {
    expect(book.colors.groups.background?.[0]?.name).toBe('paper');
    expect(book.colors.groups.text?.map((s) => s.name)).toEqual(['ink-2']);
    // The text colour also paints the dark band, which covers more than its letters do
    expect(book.colors.groups.background?.map((s) => s.name)).toEqual(['paper', 'ink']);
    expect(book.colors.groups.accent?.[0]?.name).toBe('oak');
    expect(book.colors.groups.state?.map((s) => s.name)).toEqual(['danger']);
    const names = Object.values(book.colors.groups).flatMap((list) => list.map((s) => s.name));
    expect(names).not.toContain('chart-1');
    expect(names.some((n) => n.includes('zinc'))).toBe(false);
  });

  it('reads the dark theme the system setting switches on', () => {
    expect(book.dark?.trigger).toBe('system');
    expect(book.dark?.base).toBe('#1D1814');
    expect(book.colors.groups.background?.[0]?.dark).toBe('#1D1814');
  });

  it('finds the logo in the header and the colours of the mark', () => {
    expect(book.logo.found).toBe(true);
    expect(book.logo.variants[0]).toMatchObject({ kind: 'lockup', src: `${site.url}logo.svg` });
    expect(book.logo.colors.map((c) => c.hex)).toEqual(expect.arrayContaining(['#9C6B3C', '#2B2118']));
    expect(book.logo.proposals?.proposal).toBe(true);
    expect(book.name).toBe('Stolarnia Dąb');
  });

  it('describes the type styles', () => {
    const h1 = book.typography.styles.find((s) => s.key === 'h1');
    expect(h1).toMatchObject({ family: 'Georgia', weight: 700, sizePx: 56, lineHeight: 1.1, letterSpacing: -2 });
    expect(book.typography.styles.find((s) => s.key === 'h3')?.sizePx).toBe(24);
  });

  it('takes the coloured link as the main button, not the cookie banner or the skip link', () => {
    expect(book.ui.buttons.map((b) => `${b.kind}:${b.text}`)).toEqual(['primary:Umów pomiar', 'secondary:Zobacz realizacje']);
    expect(book.tone.ctas).toEqual(['Umów pomiar', 'Zobacz realizacje']);
  });

  it('reads the tone of voice', () => {
    expect(book.tone).toMatchObject({ language: 'pl', address: 'informal', headingCase: 'sentence' });
  });

  it('compares the key pages with the homepage', () => {
    expect(book.pages).toEqual([site.url, `${site.url}realizacje`, `${site.url}kontakt`]);
    expect(book.consistency).toContainEqual({
      kind: 'pages-differ',
      page: `${site.url}kontakt`,
      fonts: [],
      buttons: ['#9C6B3C', '#C0392B'],
    });
  });
});
