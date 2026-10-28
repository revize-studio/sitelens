import { analyseBrand, type RawBrand } from '@sitelens/brand';
import { describe, expect, it } from 'vitest';
import { rawButton, rawPage } from '../../brand/test/raw-page';
import { brandbookPackage, interactiveBrandbookScript, renderBrandbook, renderInteractiveBrandbook } from '../src';

const page = rawPage({
  meta: { ...rawPage().meta, title: '<script>alert(1)</script> | Firma' },
  tokens: [
    { name: '--c-paper', value: '#ffffff', source: 'css' },
    { name: '--c-ink', value: '#111111', source: 'css' },
    { name: '--c-brand', value: '#2b5cf0', source: 'css' },
  ],
  usage: { ...rawPage().usage, background: { base: 1 }, text: { 'rgb(17, 17, 17)': 10 }, font: { 'Inter, sans-serif': 10 } },
  textStyles: {
    h1: {
      text: 'Meble na wymiar',
      box: [0, 0, 400, 60],
      fontFamily: 'Inter, sans-serif',
      fontSize: '56px',
      fontWeight: '700',
      lineHeight: '60px',
      letterSpacing: 'normal',
      color: 'rgb(17, 17, 17)',
      textTransform: 'none',
    },
  },
  buttons: [rawButton('Umów pomiar')],
  texts: { headings: [{ level: 1, text: 'Meble na wymiar', transform: 'none' }], paragraphs: ['Robimy meble dla Ciebie od lat.'] },
});
const raw: RawBrand = {
  url: 'https://firma.pl/',
  mode: 'cli',
  startedAt: '2026-10-27T10:00:00.000Z',
  home: { light: page, dark: null, mobile: null },
  pages: [],
  network: { fonts: [], stylesheets: [] },
  assets: [],
  manifest: null,
  versions: {},
};
const assets = { fontSans: 'geist.woff2', fontMono: 'geist-mono.woff2', brandFonts: [], images: {} };

const book = analyseBrand(raw, { lang: 'pl', generatedAt: '2026-10-27T10:00:00.000Z' });

describe('renderBrandbook', () => {

  it('lays out the seven sections as landscape A4 pages', () => {
    const html = renderBrandbook(book, assets, 'pl');
    expect(html).toContain('@page { size: A4 landscape; margin: 0; }');
    expect(html.match(/<section class="sheet/g)).toHaveLength(7);
    for (const title of ['Logo', 'Kolory', 'Kolory w praktyce', 'Typografia', 'Interfejs i wygląd', 'Ton komunikacji i spójność'])
      expect(html).toContain(`<h2 data-title="${title}">`);
  });

  it('marks proposals and says who owns the logo', () => {
    const html = renderBrandbook(book, assets, 'pl');
    expect(html).toContain('<em class="tag">propozycja</em>');
    expect(html).toContain('Logo i znaki należą do właściciela marki');
    expect(html).toContain('w terminalu');
  });

  it('embeds a brand typeface only when it is given one, and Geist otherwise', () => {
    expect(renderBrandbook(book, assets, 'pl')).not.toContain("font-family: 'bb-inter'");
    const embedded = renderBrandbook(
      book,
      { ...assets, brandFonts: [{ family: 'Inter', weight: '100 900', style: 'normal', unicodeRange: null, src: 'inter.woff2' }] },
      'pl',
    );
    expect(embedded).toContain("@font-face { font-family: 'bb-inter'; src: url(\"inter.woff2\")");
  });

  it('writes English when asked', () => {
    const html = renderBrandbook(analyseBrand(raw, { lang: 'en' }), assets, 'en');
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('Colours in use');
    expect(html).toContain('<em class="tag">proposal</em>');
  });

  it('escapes what the site wrote', () => {
    const named = { ...book, name: '<script>alert(1)</script>' };
    expect(renderBrandbook(named, assets, 'pl')).not.toContain('<script>alert(1)</script>');
  });
});

describe('values from a hostile site', () => {
  it('cannot break out of styles or attributes', () => {
    const book = analyseBrand(raw, { lang: 'pl', generatedAt: '2026-10-27T10:00:00.000Z' });
    const hostile = {
      ...book,
      ui: {
        ...book.ui,
        radii: ['0px"><script>alert(1)</script>'],
        buttons: [{ ...book.ui.buttons[0]!, radius: '9px;}</style><script>alert(2)</script>', transform: 'x"onload="alert(3)' }],
      },
    };
    const html = renderBrandbook(
      hostile,
      {
        ...assets,
        brandFonts: [{ family: 'Inter', weight: '400;}</style><script>alert(4)</script>', style: 'normal', unicodeRange: 'U+0000-00FF', src: 'data:font/woff2;base64,AAAA' }],
        images: { 'button-0': 'data:image/png;base64,AAAA" onerror="alert(5)' },
      },
      'pl',
    );
    expect(html).not.toMatch(/<script>alert/);
    expect(html).not.toContain('onload="alert');
    expect(html).not.toContain('" onerror="');
    expect(html).toContain("font-weight: 400; font-style: normal; unicode-range: U+0000-00FF;");
  });
});

describe('the dark theme page', () => {
  const dark = { ...page, scheme: 'dark' as const, tokens: page.tokens.map((t) => (t.name === '--c-paper' ? { ...t, value: '#101217' } : t)) };
  const withDark = analyseBrand({ ...raw, home: { ...raw.home, dark } }, { lang: 'pl', generatedAt: '2026-10-27T10:00:00.000Z' });

  it('adds a page with both values of each token only when the site has a dark theme', () => {
    expect(renderBrandbook(book, assets, 'pl')).not.toContain('Ciemny motyw</h2>');
    const html = renderBrandbook(withDark, { ...assets, images: { dark: 'data:image/jpeg;base64,AAAA' } }, 'pl');
    expect(html.match(/<section class="sheet/g)).toHaveLength(8);
    expect(html).toContain('<h2 data-title="Ciemny motyw">');
    expect(html).toMatch(/<th>paper<\/th><td><i style="background:#FFFFFF"><\/i>#FFFFFF<\/td><td><i style="background:#101217"><\/i>#101217<\/td>/);
    expect(html).toContain('src="data:image/jpeg;base64,AAAA"');
  });

  it('says online that the dark theme has no screenshot', () => {
    const online = { ...withDark, mode: 'online' as const, approximate: ['screenshots', 'buttons', 'dark'] };
    const html = renderBrandbook(online, assets, 'pl');
    expect(html).toContain('Online pokazujemy kolory ciemnego motywu bez zrzutu');
    expect(html).toContain('Online przyciski są odtworzone ze stylów strony');
    expect(html).toContain('<em class="tag">przybliżone</em>');
  });
});

describe('renderInteractiveBrandbook', () => {
  it('has every section, a link to each and the token files', () => {
    const html = renderInteractiveBrandbook(book, assets, 'pl');
    for (const id of ['logo', 'colors', 'practice', 'type', 'ui', 'tone', 'tokens']) {
      expect(html).toContain(`<section class="sec" id="${id}"`);
      expect(html).toContain(`<a href="#${id}">`);
    }
    expect(html).not.toContain('id="dark"');
    expect(html).toContain('data-download="tokens.css"');
    expect(html).toContain('data-download="tailwind.css"');
    expect(html).toContain('@theme {');
  });

  it('lets each colour copy its value as HEX, RGB or CMYK', () => {
    const html = renderInteractiveBrandbook(book, assets, 'pl');
    expect(html).toContain('data-swatch data-hex="#2B5CF0" data-rgb="rgb(43, 92, 240)" data-cmyk="C82 M62 Y0 K6"');
    expect(html).toContain('data-copy="&quot;Inter&quot;, system-ui, sans-serif"');
  });

  it('runs only its own script, which a strict CSP can allow by hash', () => {
    const html = renderInteractiveBrandbook(book, assets, 'pl');
    expect(html.match(/<script>/g)).toHaveLength(1);
    expect(html).toContain(`<script>${interactiveBrandbookScript()}</script>`);
    expect(html).not.toMatch(/\son[a-z]+=/);
  });

  it('loads nothing from the network and embeds no brand fonts', () => {
    const html = renderInteractiveBrandbook(book, assets, 'pl');
    expect(html).not.toMatch(/(src|href)="https?:/);
    expect(html).not.toContain("'bb-");
  });

  it('escapes what the site wrote', () => {
    const hostile = { ...book, name: '<script>alert(1)</script>', tone: { ...book.tone, ctas: ['<img src=x onerror=alert(2)>'] } };
    const html = renderInteractiveBrandbook(hostile, assets, 'pl');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('<img src=x');
  });
});

describe('brandbookPackage', () => {
  it('names a logo served through an image service after the original file', () => {
    const url = 'https://firma.pl/_next/image?url=%2Fzdjecia%2FLogo-Firma.png&w=64&q=75';
    const withLogo = { ...book, logo: { ...book.logo, files: [{ url, what: 'logo' as const }] } };
    const entries = brandbookPackage(withLogo, { files: new Map([[url, new Uint8Array([1, 2, 3])]]), types: new Map(), shots: new Map() }, 'pl', {
      pdf: false,
      html: false,
      tokens: false,
      json: false,
    });
    expect(entries.map((e) => e.path)).toContain('logo/Logo-Firma.png');
  });

  it('lists that logo by the original file name in the brandbook', () => {
    const url = 'https://firma.pl/_next/image?url=%2Fzdjecia%2FLogo-Firma.png&w=64&q=75';
    const withLogo = { ...book, logo: { ...book.logo, files: [{ url, what: 'logo' as const }] } };
    expect(renderInteractiveBrandbook(withLogo, assets, 'pl')).toContain('<li class="mono">/zdjecia/Logo-Firma.png</li>');
  });
});
