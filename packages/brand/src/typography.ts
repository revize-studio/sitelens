import hosts from '../data/font-hosts.json';
import names from '../data/font-names.json';
import openFonts from '../data/open-fonts.json';
import { parseColor, toHex } from './color';
import type { FontFamily, TextStyle, TypographySection } from './model';
import type { RawPage, RawTextStyle } from './raw';

const NEXT_FONT = new RegExp(names.nextFont);
const STRIP = names.strip.map((s) => new RegExp(s));
const FALLBACK = new RegExp(names.fallback, 'i');
const GENERIC = new Set(names.generic.map((g) => g.toLowerCase()));
const ICON_FONT = new RegExp(hosts.iconFonts, 'i');
const HOSTS = hosts.hosts as Record<string, string>;
const OPEN = new Set(openFonts.families.map((f) => f.toLowerCase()));

/** True for typefaces under an open licence (the Google Fonts catalogue and a few more), which may be embedded. */
export const isOpenFont = (family: string) => OPEN.has(family.toLowerCase());

/** The first family of a font stack, without quotes, build hashes and "Variable" suffixes. */
export function familyName(stack: string): string {
  const first = (stack.split(',')[0] ?? '').trim().replace(/^["']|["']$/g, '');
  const next = NEXT_FONT.exec(first);
  let name = next ? next[1]!.replace(/_/g, ' ') : first;
  // "Geist Variable-23c1dfab" needs the hash off before " Variable" can go
  for (let before = ''; before !== name; ) {
    before = name;
    for (const re of STRIP) name = name.replace(re, '').trim();
  }
  // Sites that declare "inter" or "outfitOutline" still mean Inter and Outfit Outline
  if (/^\p{Ll}/u.test(name) && !GENERIC.has(name.toLowerCase()))
    name = name.replace(/(\p{Ll})(\p{Lu})/gu, '$1 $2').replace(/(^|\s)\p{Ll}/gu, (m) => m.toUpperCase());
  return name;
}

const isFallback = (name: string) => FALLBACK.test(name) || /_Fallback_/.test(name);
export const isIconFont = (name: string) => ICON_FONT.test(name);

function sourceOf(url: string, siteHost: string): { source: FontFamily['source']; host: string } {
  const host = new URL(url).hostname;
  const known = HOSTS[host];
  if (known === 'google' || known === 'adobe' || known === 'bunny') return { source: known, host };
  if (host === siteHost || host.endsWith(`.${siteHost.replace(/^www\./, '')}`)) return { source: 'self', host };
  return { source: 'other', host };
}

/** Families named in Google Fonts and Bunny Fonts stylesheet addresses (family=Inter:wght@400;700). */
function familiesInCssUrls(stylesheets: string[]): Map<string, 'google' | 'bunny'> {
  const found = new Map<string, 'google' | 'bunny'>();
  for (const href of stylesheets) {
    let url: URL;
    try {
      url = new URL(href);
    } catch {
      continue;
    }
    const service = HOSTS[url.hostname];
    if (service !== 'google' && service !== 'bunny') continue;
    for (const value of url.searchParams.getAll('family'))
      for (const part of value.split('|')) found.set(part.split(':')[0]!.replace(/\+/g, ' ').trim().toLowerCase(), service);
  }
  return found;
}

const px = (value: string) => Number.parseFloat(value);
const round = (value: number, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits;

function textStyle(key: TextStyle['key'], raw: RawTextStyle | undefined): TextStyle | null {
  if (!raw) return null;
  const size = px(raw.fontSize);
  const color = parseColor(raw.color);
  return {
    key,
    family: familyName(raw.fontFamily),
    weight: Number(raw.fontWeight) || 400,
    sizePx: round(size),
    lineHeight: raw.lineHeight.endsWith('px') ? round(px(raw.lineHeight) / size) : null,
    letterSpacing: raw.letterSpacing.endsWith('px') ? round((px(raw.letterSpacing) / size) * 100, 1) : null,
    transform: raw.textTransform,
    color: color ? toHex(color) : raw.color,
    sample: raw.text,
  };
}

export function analyseTypography(
  page: RawPage,
  network: { fonts: string[]; stylesheets: string[] },
  siteHost: string,
): TypographySection {
  const used = new Map<string, number>();
  for (const [stack, weight] of Object.entries(page.usage.font)) {
    const name = familyName(stack);
    if (!name || isIconFont(name)) continue;
    used.set(name, (used.get(name) ?? 0) + weight);
  }
  const total = [...used.values()].reduce((a, b) => a + b, 0) || 1;

  const cssFamilies = familiesInCssUrls(network.stylesheets);
  const networkSources = network.fonts.map((url) => sourceOf(url, siteHost));
  const families: FontFamily[] = [...used.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, weight]) => {
      const faces = page.fontFaces.filter((f) => familyName(f.family) === name);
      const files = [...new Set(faces.flatMap((f) => f.sources))];
      const sources = files.map((url) => sourceOf(url, siteHost));
      let source: FontFamily['source'] = sources[0]?.source ?? 'unknown';
      const listed = cssFamilies.get(name.toLowerCase());
      if (listed) source = listed;
      else if (source === 'unknown' && GENERIC.has(name.toLowerCase())) source = 'unknown';
      else if (source === 'unknown' && networkSources.length) {
        // A stylesheet from another origin hides which file is which family; one shared source still tells
        const kinds = new Set(networkSources.map((s) => s.source));
        if (kinds.size === 1) source = [...kinds][0]!;
      }
      return {
        name,
        share: round(weight / total, 4),
        source,
        hosts: [...new Set((sources.length ? sources : networkSources).map((s) => s.host))],
        loaded: faces.some((f) => f.status === 'loaded'),
        openLicence: source === 'google' || source === 'bunny' || isOpenFont(name),
        files,
      };
    });

  const styles = (['h1', 'h2', 'h3', 'p', 'a'] as const)
    .map((key) => textStyle(key, page.textStyles[key]))
    .filter((s): s is TextStyle => s !== null);

  const usedNames = new Set(used.keys());
  const unused = [
    ...new Set(
      page.fontFaces
        .filter((f) => f.status !== 'loaded')
        .map((f) => familyName(f.family))
        .filter((name) => name && !usedNames.has(name) && !isFallback(name) && !isIconFont(name)),
    ),
  ].filter((name) => !page.fontFaces.some((f) => familyName(f.family) === name && f.status === 'loaded'));

  const weights = Object.entries(page.usage.weight)
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => Number(w))
    .filter((w) => Number.isFinite(w));
  const sizes = [...new Set(Object.keys(page.usage.size).map((s) => Math.round(px(s))))]
    .filter((s) => Number.isFinite(s) && s > 0)
    .sort((a, b) => a - b);

  return {
    heading: styles.find((s) => s.key === 'h1')?.family ?? styles.find((s) => s.key === 'h2')?.family ?? null,
    body: styles.find((s) => s.key === 'p')?.family ?? families[0]?.name ?? null,
    families,
    styles,
    weights: weights.slice(0, 6),
    sizes,
    unused,
  };
}
