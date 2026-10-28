import { describe, expect, it } from 'vitest';
import { analyseColors } from '../src/colors';
import { scoreLogo, svgSourceColors } from '../src/logo';
import type { RawLogo } from '../src/raw';
import { brandName, hostLabel, isBotCheck, keyPages } from '../src/site';
import { analyseTone } from '../src/tone';
import { colorTokens, commonPrefix, displayName, tokenKind } from '../src/tokens';
import { familyName } from '../src/typography';
import { analyseUi, pickButtons } from '../src/ui';
import { parseColor } from '../src/color';
import { rawButton, rawPage } from './raw-page';

describe('token filters', () => {
  it('leaves out framework palettes, library internals and decoration', () => {
    expect(tokenKind('--color-zinc-500')).toBe('framework');
    expect(tokenKind('--bs-gray-300')).toBe('framework');
    expect(tokenKind('--wp--preset--color--vivid-red')).toBe('framework');
    expect(tokenKind('--tw-ring-color')).toBe('internal');
    expect(tokenKind('--cc-btn-primary-bg')).toBe('internal');
    expect(tokenKind('--brand-chart-3')).toBe('decorative');
    expect(tokenKind('--sl-icon-plate-hi')).toBe('decorative');
  });

  it('keeps the brand colours and marks the states', () => {
    expect(tokenKind('--wp--preset--color--primary')).toBe('brand');
    expect(tokenKind('--color-void')).toBe('brand');
    expect(tokenKind('--sl-critical')).toBe('semantic');
  });

  it('drops translucent overlays but keeps translucent states', () => {
    const tokens = colorTokens([
      { name: '--overlay', value: 'rgb(0 0 0 / 40%)', source: 'css' },
      { name: '--error-bg', value: 'rgb(200 0 0 / 10%)', source: 'css' },
      { name: '--space', value: '12px', source: 'css' },
      { name: '--brand', value: 'oklch(62.8% 0.2577 29.23)', source: 'computed' },
    ]);
    expect(tokens.map((t) => t.name)).toEqual(['--error-bg', '--brand']);
  });

  it('finds the prefix most tokens share and leaves it out of names', () => {
    const prefix = commonPrefix(['--sl-bg', '--sl-text', '--sl-accent', '--other']);
    expect(prefix).toBe('--sl-');
    expect(displayName('--sl-accent', prefix)).toBe('accent');
    expect(displayName('--other', prefix)).toBe('other');
    expect(commonPrefix(['--wp--preset--color--a', '--wp--preset--color--b'])).toBe('--wp--preset--color--');
  });
});

describe('font names', () => {
  it('cleans the names sites and frameworks give their fonts', () => {
    expect(familyName('"Geist Variable-23c1dfab5fb74d31", "Geist Variable-23c1dfab fallback: Arial", sans-serif')).toBe('Geist');
    expect(familyName('__Inter_a64ecd, __Inter_Fallback_a64ecd')).toBe('Inter');
    expect(familyName('__Space_Grotesk_3f1d2a')).toBe('Space Grotesk');
    expect(familyName('outfitOutline, sans-serif')).toBe('Outfit Outline');
    expect(familyName('inter')).toBe('Inter');
    expect(familyName('system-ui, sans-serif')).toBe('system-ui');
    expect(familyName('"IBM Plex Sans", Arial')).toBe('IBM Plex Sans');
  });
});

describe('colours', () => {
  const page = rawPage({
    tokens: [
      { name: '--c-paper', value: '#ffffff', source: 'css' },
      { name: '--c-ink', value: '#111111', source: 'css' },
      { name: '--c-ink-2', value: '#555555', source: 'css' },
      { name: '--c-line', value: '#e5e5e5', source: 'css' },
      { name: '--c-brand', value: '#2b5cf0', source: 'css' },
      { name: '--c-brand-hover', value: '#1f48cc', source: 'css' },
      { name: '--c-danger', value: '#c4421a', source: 'css' },
      { name: '--color-zinc-500', value: '#71717a', source: 'css' },
    ],
    usage: {
      background: { base: 80, 'rgb(43, 92, 240)': 5, 'rgb(250, 240, 200)': 15 },
      text: { 'rgb(17, 17, 17)': 600, 'rgb(85, 85, 85)': 300, 'rgb(43, 92, 240)': 100 },
      border: { 'rgb(229, 229, 229)': 1000 },
      radius: {},
      shadow: {},
      font: {},
      size: {},
      weight: {},
    },
  });
  const { section, stray } = analyseColors(page, null, 'pl');

  it('groups tokens by what they are used for', () => {
    expect(section.groups.background?.map((s) => s.name)).toEqual(['paper']);
    expect(section.groups.text?.map((s) => s.name)).toEqual(['ink', 'ink-2']);
    expect(section.groups.accent?.map((s) => s.name)).toEqual(['brand', 'brand-hover']);
    expect(section.groups.line?.map((s) => s.name)).toEqual(['line']);
    expect(section.groups.state?.map((s) => s.name)).toEqual(['danger']);
  });

  it('measures shares within each kind of use', () => {
    expect(section.groups.background![0]!.share).toBeCloseTo(0.8, 2);
    expect(section.groups.text![0]!.share).toBeCloseTo(0.6, 2);
  });

  it('reports a visible colour that no token matches', () => {
    expect(stray.map((s) => s.hex)).toEqual(['#FAF0C8']);
  });

  it('rates text and background pairs by WCAG contrast', () => {
    const ink = section.contrast.cells.find((c) => c.text === 'ink' && c.background === 'paper');
    expect(ink?.level).toBe('AA');
    expect(ink!.ratio).toBeGreaterThan(18);
  });

  it('names colours from the palette when a site has no tokens', () => {
    const plain = analyseColors(
      rawPage({ usage: { ...page.usage, background: { 'rgb(11, 37, 69)': 100 } } }),
      null,
      'pl',
    );
    expect(plain.section.hasTokens).toBe(false);
    expect(plain.swatches.some((s) => s.name === 'Granat' && s.nameSource === 'palette')).toBe(true);
  });
});

describe('tone of voice', () => {
  const tone = (paragraphs: string[], headings: string[] = ['Meble na wymiar']) =>
    analyseTone(
      rawPage({
        texts: { headings: headings.map((text) => ({ level: 2, text, transform: 'none' })), paragraphs },
      }),
      [],
    );

  it('recognises the informal "Ty" from pronouns', () => {
    expect(tone(['Zaprojektujemy kuchnię dla Ciebie. Twój dom zasługuje na więcej niż katalog.']).address).toBe(
      'informal',
    );
  });

  it('recognises the informal "Ty" from verbs alone', () => {
    expect(tone(['Wybierasz drewno, a my dbamy o resztę. Możesz przyjść do pracowni w każdy piątek.']).address).toBe(
      'informal',
    );
  });

  it('does not take "nasz" or "arkusz" for a verb', () => {
    expect(tone(['Nasz zespół przygotuje arkusz z wyceną i harmonogramem prac.']).address).toBe('impersonal');
  });

  it('recognises the formal "Pan/Pani/Państwo"', () => {
    expect(tone(['Zapraszamy Państwa do salonu. Pomożemy Panu wybrać fronty.']).address).toBe('formal');
  });

  it('measures sentences and the case of headings', () => {
    const t = tone(['Robimy meble na wymiar od dwudziestu lat. Każdy projekt zaczynamy od rozmowy z klientem.'], [
      'Meble na wymiar',
      'Jak pracujemy',
    ]);
    expect(t.averageSentenceWords).toBe(7);
    expect(t.headingCase).toBe('sentence');
    expect(tone(['Tekst akapitu ma tu dość słów.'], ['MEBLE NA WYMIAR', 'O NAS']).headingCase).toBe('upper');
  });
});

describe('buttons', () => {
  it('picks the coloured call to action, not the language switch or the cookie banner', () => {
    const page = rawPage({
      buttons: [
        rawButton('PL', {}, { background: 'rgb(12, 13, 14)' }),
        rawButton('Akceptuję', { inConsent: true }),
        rawButton('Umów pomiar'),
        rawButton('Zobacz realizacje', { emphasis: 3 }, { background: 'rgba(0, 0, 0, 0)', borderWidth: '1px', borderStyle: 'solid' }),
      ],
    });
    const buttons = pickButtons(page, parseColor('#fff')!);
    expect(buttons.map((b) => `${b.kind}:${b.text}`)).toEqual(['primary:Umów pomiar', 'secondary:Zobacz realizacje']);
  });
});

describe('logo', () => {
  const logo = (overrides: Partial<RawLogo>): RawLogo => ({
    kind: 'img',
    src: 'https://firma.pl/logo.png',
    svg: null,
    alt: null,
    label: null,
    hint: false,
    visible: true,
    area: 'other',
    inHomeLink: false,
    box: [24, 20, 140, 40],
    natural: null,
    fills: {},
    behind: [],
    ...overrides,
  });

  it('scores an SVG in the header home link above a picture in the content', () => {
    const header = scoreLogo(logo({ kind: 'svg', src: null, area: 'header', inHomeLink: true, hint: true }));
    const content = scoreLogo(logo({ area: 'main', box: [400, 1800, 140, 40] }));
    expect(header).toBeGreaterThan(content);
  });

  it('reads colours from SVG source, leaving out masks', () => {
    const colors = svgSourceColors(
      '<svg><mask id="m"><rect fill="#fff"/></mask><path fill="#03456F"/><path style="fill:#4E7595"/><stop stop-color="#ACB9C9"/></svg>',
    );
    expect(Object.keys(colors)).toEqual(['#03456f', '#4e7595', '#acb9c9']);
  });
});

describe('site helpers', () => {
  it('names the brand from the site, preferring what matches the domain', () => {
    expect(brandName(rawPage({ meta: { ...rawPage().meta, title: 'Meble na wymiar | Firma' } }), null, null, 'firma.pl')).toBe(
      'Firma',
    );
    expect(hostLabel('www.sklep.com.pl')).toBe('sklep');
  });

  it('recognises bot checks', () => {
    expect(isBotCheck('Just a moment...', '<html>')).toBe(true);
    expect(isBotCheck('Firma', '<script src="/cdn-cgi/challenge-platform/h/b/orchestrate"></script>')).toBe(true);
    expect(isBotCheck('Firma – meble', '<h1>Meble</h1>')).toBe(false);
  });

  it('takes key pages from the navigation, then from other site links', () => {
    const page = rawPage({
      nav: {
        box: [0, 0, 1440, 80],
        links: [
          { text: 'Start', href: 'https://firma.pl/' },
          { text: 'Oferta', href: 'https://firma.pl/#oferta' },
          { text: 'Cennik', href: 'https://firma.pl/cennik.pdf' },
        ],
      },
      siteLinks: ['https://firma.pl/kontakt', 'https://inna.pl/', 'https://firma.pl/o-nas'],
    });
    expect(keyPages(page, 2)).toEqual(['https://firma.pl/kontakt', 'https://firma.pl/o-nas']);
  });
});

describe('corner radii', () => {
  it('shows a full rounding as 9999px however huge the browser writes it', () => {
    const page = rawPage({ usage: { ...rawPage().usage, radius: { '3.35544e+07px': 5, '9999px': 2, '8px': 3 } } });
    const ui = analyseUi(page, analyseColors(page, null, 'pl'), false);
    expect(ui.radii).toEqual(['9999px', '8px']);
  });
});
