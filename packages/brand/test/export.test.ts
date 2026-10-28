import { describe, expect, it } from 'vitest';
import { analyseBrand } from '../src/analyse';
import { brandPrefix, toCss, toDtcg, toTailwind } from '../src/export';
import type { RawBrand } from '../src/raw';
import { rawPage } from './raw-page';

const light = rawPage({
  url: 'https://www.meble-dab.pl/',
  tokens: [
    { name: '--dab-paper', value: '#f7f3ec', source: 'css' },
    { name: '--dab-ink', value: '#2b2118', source: 'css' },
    { name: '--dab-oak', value: '#9c6b3c', source: 'css' },
  ],
  usage: {
    background: { base: 90, 'rgb(156, 107, 60)': 10 },
    text: { 'rgb(43, 33, 24)': 100 },
    border: {},
    radius: { '8px': 4, '50%': 1 },
    shadow: {},
    font: { 'Lora, serif': 100 },
    size: { '18px': 100 },
    weight: { '400': 100 },
  },
  base: { htmlBackground: 'rgba(0, 0, 0, 0)', bodyBackground: 'rgb(247, 243, 236)', color: 'rgb(43, 33, 24)', colorScheme: 'normal' },
  textStyles: {
    h1: {
      text: 'Meble na wymiar',
      box: [0, 0, 600, 60],
      fontFamily: 'Lora, serif',
      fontSize: '56px',
      fontWeight: '700',
      lineHeight: '61.6px',
      letterSpacing: '-1.12px',
      color: 'rgb(43, 33, 24)',
      textTransform: 'none',
    },
  },
});
const dark = { ...light, scheme: 'dark' as const, tokens: light.tokens.map((t) => (t.name === '--dab-paper' ? { ...t, value: '#1d1814' } : t)) };
const raw: RawBrand = {
  url: 'https://www.meble-dab.pl/',
  mode: 'cli',
  startedAt: '2026-10-27T10:00:00.000Z',
  home: { light, dark, mobile: null },
  pages: [],
  network: { fonts: [], stylesheets: [] },
  assets: [],
  manifest: null,
  versions: {},
};
const book = analyseBrand(raw, { lang: 'pl', generatedAt: '2026-10-27T10:00:00.000Z' });

describe('token export', () => {
  it('names CSS variables after the domain', () => {
    expect(brandPrefix(book)).toBe('meble-dab');
  });

  it('writes DTCG colours with the dark value in an extension', () => {
    const tokens = toDtcg(book) as { color: Record<string, Record<string, { $type: string; $value: { hex: string }; $extensions: Record<string, unknown> }>> };
    const paper = tokens.color.background!.paper!;
    expect(paper.$type).toBe('color');
    expect(paper.$value.hex).toBe('#F7F3EC');
    expect(paper.$extensions['pl.sitelens.modes']).toEqual({ dark: expect.objectContaining({ hex: '#1D1814' }) });
  });

  it('writes type styles that point at the font tokens', () => {
    const tokens = toDtcg(book) as { typography: { h1: { $value: Record<string, unknown> } }; font: Record<string, unknown> };
    expect(tokens.font.heading).toEqual({ $type: 'fontFamily', $value: ['Lora', 'system-ui', 'sans-serif'] });
    expect(tokens.typography.h1.$value).toMatchObject({
      fontFamily: '{font.heading}',
      fontSize: { value: 56, unit: 'px' },
      fontWeight: 700,
      lineHeight: 1.1,
      letterSpacing: { value: -1.1, unit: 'px' },
    });
  });

  it('writes CSS variables with the dark theme for the system setting and data-theme', () => {
    const css = toCss(book);
    expect(css).toContain('--meble-dab-paper: #f7f3ec;');
    expect(css).toContain('--meble-dab-font-heading: "Lora", system-ui, sans-serif;');
    expect(css).toContain('--meble-dab-radius-1: 8px;');
    expect(css).toMatch(/@media \(prefers-color-scheme: dark\) \{\n {2}:root \{\n {4}--meble-dab-paper: #1D1814;/);
    expect(css).toContain(':root[data-theme="dark"] {\n  --meble-dab-paper: #1D1814;');
  });

  it('writes a Tailwind 4 theme with the brand prefix and the dark colours outside it', () => {
    const css = toTailwind(book);
    expect(css).toContain('@theme {\n  --color-meble-dab-paper: #f7f3ec;');
    expect(css).toContain('  --font-meble-dab-heading: "Lora", system-ui, sans-serif;');
    expect(css).toContain('  --text-meble-dab-h1: 56px;\n  --text-meble-dab-h1--line-height: 1.1;\n  --text-meble-dab-h1--letter-spacing: -0.02em;\n  --text-meble-dab-h1--font-weight: 700;');
    expect(css).toContain('  --radius-meble-dab-1: 8px;');
    expect(css).toMatch(/@media \(prefers-color-scheme: dark\) \{\n {2}:root \{\n {4}--color-meble-dab-paper: #1D1814;/);
    expect(css).toContain(':root[data-theme="dark"], .dark {\n  --color-meble-dab-paper: #1D1814;');
  });

  it('keeps a hostile family name inside its CSS string', () => {
    const hostile = { ...book, typography: { ...book.typography, heading: 'Lora";}body{display:none}\n' } };
    for (const css of [toCss(hostile), toTailwind(hostile)]) {
      expect(css).toContain('"Lorabodydisplay:none", system-ui');
      expect(css).not.toContain('body{');
    }
  });
});
