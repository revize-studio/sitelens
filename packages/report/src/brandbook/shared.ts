import type { Brandbook, ColorRole, LogoVariant } from '@sitelens/brand';
import type { BrandbookStrings } from './i18n';

export const ROLES: ColorRole[] = ['background', 'text', 'accent', 'line', 'state', 'neutral'];

/** Swatches whose token has another value in the dark theme. */
export const darkPairs = (book: Brandbook) => ROLES.flatMap((role) => book.colors.groups[role] ?? []).filter((s) => s.dark);

export const esc = (value: string | number) =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const slug = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-');

const hexLuminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  ) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const isDarkHex = (hex: string) => hexLuminance(hex) < 0.2;
const svgUri = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

// Values read from a site end up in style attributes and the <style> block; anything that does not look
// exactly like the expected CSS value is dropped, so a hostile page cannot break out of them
const LENGTH = /^-?\d+(\.\d+)?(px|%|em|rem)?( -?\d+(\.\d+)?(px|%|em|rem)?){0,3}$/;
export const safe = {
  color: (value: string | null | undefined, fallback = 'transparent') =>
    value && /^#[0-9a-f]{3,8}$/i.test(value) ? value : fallback,
  length: (value: string) => (LENGTH.test(value) ? value : '0'),
  transform: (value: string) => (['none', 'uppercase', 'lowercase', 'capitalize'].includes(value) ? value : 'none'),
  border: (value: string | null) =>
    value && /^\d+(\.\d+)?px (solid|dashed|dotted|double) #[0-9a-f]{6}$/i.test(value) ? `border:${value};` : 'border:0;',
  weight: (value: string | number) => (/^\d{1,3}( \d{1,3})?$|^(normal|bold)$/.test(String(value)) ? String(value) : '400'),
  fontStyle: (value: string) => (/^(normal|italic|oblique( -?\d+deg){0,2})$/.test(value) ? value : 'normal'),
  unicodeRange: (value: string | null) =>
    value && /^u\+[0-9a-f?]+(-[0-9a-f]+)?(,\s*u\+[0-9a-f?]+(-[0-9a-f]+)?)*$/i.test(value) ? value : null,
  dataUri: (value: string) => (/^data:[a-z]+\/[a-z0-9.+-]+(;charset=utf-8)?(;base64)?,[a-z0-9+/=%._~!*'()-]*$/i.test(value) ? value : ''),
};

export function variantImage(images: Record<string, string>, variant: LogoVariant): string | null {
  if (variant.src && images[variant.src]) return images[variant.src]!;
  if (variant.svg) return svgUri(variant.svg);
  return null;
}

/** The logo as pictures: its file and any layers the site stacks on top of it in the same box. */
export function logoPicture(images: Record<string, string>, variant: LogoVariant, className: string, alt = ''): string | null {
  const base = variantImage(images, variant);
  if (!base) return null;
  const layers = variant.layers.map((src) => images[src]).filter((src): src is string => Boolean(src));
  if (!layers.length) return `<img class="${className}" src="${esc(base)}" alt="${esc(alt)}">`;
  return `<span class="layers ${className}"><img src="${esc(base)}" alt="${esc(alt)}">${layers.map((src) => `<img src="${esc(src)}" alt="">`).join('')}</span>`;
}

/** A logo file's address as the brandbook lists it: the path on the brand's own host, the host otherwise. */
export function fileLabel(url: string, host: string): string {
  const parsed = new URL(url);
  // Image services such as Next.js (/_next/image?url=/logo.png) name the original in a parameter
  const original = parsed.searchParams.get('url');
  const path = original?.startsWith('/') ? original : parsed.pathname;
  return parsed.host.replace(/^www\./, '') === host ? path : `${parsed.host}${path}`;
}

/** The logo for the cover: a version made for the cover's background where the site has one. */
export function coverLogo(book: Brandbook, images: Record<string, string>, className: string): string | null {
  const dark = isDarkHex(book.colors.base);
  const variants = book.logo.variants.filter((v) => v.kind === 'lockup' || v.kind === 'mark');
  const fitting =
    variants.find((v) => v.kind === 'lockup' && v.background === (dark ? 'dark' : 'light')) ??
    variants.find((v) => v.background === (dark ? 'dark' : 'light')) ??
    variants[0];
  const picture = fitting ? logoPicture(images, fitting, className, book.name) : null;
  return picture ?? (images.logo ? `<img class="${className}" src="${esc(images.logo)}" alt="${esc(book.name)}">` : null);
}

export interface LogoTile {
  picture: string;
  background: string;
  caption: string;
  kind: '' | 'icon' | 'share';
}

/** Up to four pictures of the logo, each on the background it was made for. */
export function logoTiles(
  book: Brandbook,
  images: Record<string, string>,
  captions: BrandbookStrings['logo']['variant'],
  surfaces: { page: string; surface: string },
): LogoTile[] {
  const base = book.colors.base;
  const tiles: LogoTile[] = [];
  const img = (src: string) => `<img src="${esc(src)}" alt="">`;
  const onBackground = (background: 'light' | 'dark') =>
    background === 'dark' ? (isDarkHex(base) ? base : '#0B0C0F') : isDarkHex(base) ? surfaces.surface : base;
  if (images.logo) tiles.push({ picture: img(images.logo), background: base, caption: captions.header, kind: '' });
  const shown = new Set<string>();
  for (const variant of book.logo.variants.filter((v) => v.kind === 'lockup' || v.kind === 'mark')) {
    const picture = logoPicture(images, variant, '');
    const key = `${variant.kind}-${variant.background}`;
    if (!picture || shown.has(key) || tiles.length >= 3) continue;
    shown.add(key);
    // The header picture already shows the logo on the page background; another tile adds the other background
    if (images.logo && tiles.length === 1 && variant.background === (isDarkHex(base) ? 'dark' : 'light') && variant.kind === 'lockup')
      continue;
    tiles.push({
      picture,
      background: onBackground(variant.background),
      caption: variant.kind === 'mark' ? captions.mark : variant.background === 'dark' ? captions.dark : captions.light,
      kind: '',
    });
  }
  for (const kind of ['icon', 'share'] as const) {
    const variant = book.logo.variants.find((v) => v.kind === kind);
    const src = variant && variantImage(images, variant);
    if (src && tiles.length < 4)
      tiles.push({ picture: img(src), background: kind === 'share' ? surfaces.surface : surfaces.page, caption: captions[kind], kind });
  }
  return tiles;
}
