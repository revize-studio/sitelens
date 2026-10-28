import { parseColor, toRgb255 } from './color';
import type { Brandbook, ColorRole, Swatch } from './model';
import { hostLabel } from './site';

const ROLES: ColorRole[] = ['background', 'text', 'accent', 'line', 'state', 'neutral'];

const slug = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/ł/g, 'l')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** The prefix of the exported CSS variables: the brand's domain name, e.g. `--revize-void`. */
export const brandPrefix = (book: Brandbook) => slug(hostLabel(book.host)) || 'brand';

/** Every swatch once, with a unique key for file formats that need one. */
function keyed(book: Brandbook): { key: string; role: ColorRole | 'logo'; swatch: Swatch }[] {
  const out: { key: string; role: ColorRole | 'logo'; swatch: Swatch }[] = [];
  const used = new Set<string>();
  const take = (role: ColorRole | 'logo', swatch: Swatch) => {
    const base = slug(role === 'logo' ? `logo-${swatch.name}` : swatch.name) || role;
    let key = base;
    for (let n = 2; used.has(key); n++) key = `${base}-${n}`;
    used.add(key);
    out.push({ key, role, swatch });
  };
  for (const role of ROLES) for (const swatch of book.colors.groups[role] ?? []) take(role, swatch);
  for (const swatch of book.logo.colors) take('logo', swatch);
  return out;
}

const dtcgColor = (hex: string) => {
  const [r, g, b] = toRgb255(parseColor(hex)!);
  return { colorSpace: 'srgb', components: [r / 255, g / 255, b / 255].map((c) => Math.round(c * 10000) / 10000), hex };
};

const stack = (family: string) => [family, 'system-ui', 'sans-serif'];
// A family name comes from the site; quotes, backslashes and line breaks would end the CSS string early
const familyStack = (family: string) =>
  `"${[...family].filter((ch) => ch.charCodeAt(0) >= 32 && !'"\\{};'.includes(ch)).join('')}", system-ui, sans-serif`;
const PLAIN_RADIUS = /^\d+(\.\d+)?(px|%)$/;

/**
 * Design Tokens (DTCG 2025.10): colours by role, font families, type styles and corner radii. Dark
 * theme values sit in `$extensions["pl.sitelens.modes"].dark`, since the format has no modes yet.
 */
export function toDtcg(book: Brandbook): Record<string, unknown> {
  const color: Record<string, Record<string, unknown>> = {};
  for (const { key, role, swatch } of keyed(book)) {
    color[role] ??= {};
    color[role][key] = {
      $type: 'color',
      $value: dtcgColor(swatch.hex),
      $extensions: {
        'pl.sitelens': { token: swatch.token, share: swatch.share },
        ...(swatch.dark ? { 'pl.sitelens.modes': { dark: dtcgColor(swatch.dark) } } : {}),
      },
    };
  }

  const font: Record<string, unknown> = {};
  if (book.typography.heading) font.heading = { $type: 'fontFamily', $value: stack(book.typography.heading) };
  if (book.typography.body) font.body = { $type: 'fontFamily', $value: stack(book.typography.body) };
  const role = (family: string) =>
    family === book.typography.heading ? '{font.heading}' : family === book.typography.body ? '{font.body}' : stack(family);

  const typography: Record<string, unknown> = {};
  for (const style of book.typography.styles)
    typography[style.key] = {
      $type: 'typography',
      $value: {
        fontFamily: role(style.family),
        fontSize: { value: style.sizePx, unit: 'px' },
        fontWeight: style.weight,
        lineHeight: style.lineHeight ?? 1.2,
        letterSpacing: { value: Math.round(((style.letterSpacing ?? 0) * style.sizePx) / 10) / 10, unit: 'px' },
      },
    };

  const radius: Record<string, unknown> = {};
  book.ui.radii
    .filter((r) => /^\d+(\.\d+)?px$/.test(r))
    .forEach((r, i) => (radius[String(i + 1)] = { $type: 'dimension', $value: { value: parseFloat(r), unit: 'px' } }));

  return {
    $description: `${book.name}: tokens read from ${book.host} by sitelens (${book.mode}), ${book.generatedAt.slice(0, 10)}`,
    color,
    ...(Object.keys(font).length ? { font } : {}),
    ...(Object.keys(typography).length ? { typography } : {}),
    ...(Object.keys(radius).length ? { radius } : {}),
  };
}

const header = (book: Brandbook) =>
  `/* ${book.name.replace(/\*\//g, '')}: tokens read from ${book.host} by sitelens (${book.mode}), ${book.generatedAt.slice(0, 10)} */`;

const darkBlocks = (lines: string[], switched: string) =>
  lines.length
    ? `\n@media (prefers-color-scheme: dark) {\n  :root {\n${lines.map((l) => `  ${l}`).join('\n')}\n  }\n}\n\n${switched} {\n${lines.join('\n')}\n}\n`
    : '';

/** CSS variables with the brand prefix, the dark theme both for the system setting and for `data-theme`. */
export function toCss(book: Brandbook): string {
  const prefix = brandPrefix(book);
  const swatches = keyed(book);
  const lines = (dark: boolean) =>
    swatches
      .filter(({ swatch }) => !dark || swatch.dark)
      .map(({ key, swatch }) => `  --${prefix}-${key}: ${dark ? swatch.dark : swatch.hex.toLowerCase()};`);

  const light = lines(false);
  if (book.typography.heading) light.push(`  --${prefix}-font-heading: ${familyStack(book.typography.heading)};`);
  if (book.typography.body) light.push(`  --${prefix}-font-body: ${familyStack(book.typography.body)};`);
  book.ui.radii.filter((r) => PLAIN_RADIUS.test(r)).forEach((r, i) => light.push(`  --${prefix}-radius-${i + 1}: ${r};`));

  return `${header(book)}\n:root {\n${light.join('\n')}\n}\n${darkBlocks(lines(true), ':root[data-theme="dark"]')}`;
}

/**
 * A Tailwind CSS 4 theme: colours, typefaces, text styles and radii as `@theme` variables with the
 * brand prefix (`bg-revize-void`, `font-revize-heading`, `text-revize-h1`). The dark theme swaps the
 * colour variables themselves, so the utilities follow it without `dark:` variants.
 */
export function toTailwind(book: Brandbook): string {
  const prefix = brandPrefix(book);
  const swatches = keyed(book);
  const theme = swatches.map(({ key, swatch }) => `  --color-${prefix}-${key}: ${swatch.hex.toLowerCase()};`);
  if (book.typography.heading) theme.push(`  --font-${prefix}-heading: ${familyStack(book.typography.heading)};`);
  if (book.typography.body) theme.push(`  --font-${prefix}-body: ${familyStack(book.typography.body)};`);
  for (const style of book.typography.styles) {
    const name = `--text-${prefix}-${style.key}`;
    theme.push(`  ${name}: ${Math.round(style.sizePx * 100) / 100}px;`);
    if (style.lineHeight !== null) theme.push(`  ${name}--line-height: ${Math.round(style.lineHeight * 100) / 100};`);
    if (style.letterSpacing) theme.push(`  ${name}--letter-spacing: ${Math.round(style.letterSpacing * 10) / 1000}em;`);
    theme.push(`  ${name}--font-weight: ${Math.round(style.weight)};`);
  }
  book.ui.radii.filter((r) => PLAIN_RADIUS.test(r)).forEach((r, i) => theme.push(`  --radius-${prefix}-${i + 1}: ${r};`));

  const dark = swatches.filter(({ swatch }) => swatch.dark).map(({ key, swatch }) => `  --color-${prefix}-${key}: ${swatch.dark};`);
  return `${header(book)}\n/* Tailwind CSS 4: @import "tailwindcss"; then @import "./tailwind.css"; */\n@theme {\n${theme.join('\n')}\n}\n${darkBlocks(dark, ':root[data-theme="dark"], .dark')}`;
}
