import config from '../data/logo.json';
import proposals from '../data/proposals.json';
import { chroma, composite, deltaE, luminance, parseColor, toCmyk, toHex, toRgb255, type Color } from './color';
import type { LogoFile, LogoSection, LogoVariant, Swatch } from './model';
import { colorName } from './names';
import type { RawBrand, RawLogo, RawPage } from './raw';

const LIGHT_VERSION = new RegExp(config.lightVersion, 'i');
const DARK_VERSION = new RegExp(config.darkVersion, 'i');
const S = config.scores;

const fileOf = (src: string | null) => (src ? (new URL(src).pathname.split('/').pop() ?? '') : '');
const isSvgFile = (src: string | null) => /\.svg(\?|#|$)/i.test(src ?? '');

/** Points for how likely a candidate is the site's main logo. */
export function scoreLogo(logo: RawLogo): number {
  const [, y, width, height] = logo.box;
  let score = 0;
  if (logo.kind === 'svg') score += S.inlineSvg;
  else if (isSvgFile(logo.src)) score += S.svgFile;
  if (logo.area === 'header') score += S.header;
  else if (logo.area === 'nav') score += S.nav;
  else if (logo.area === 'footer') score += S.footer;
  if (logo.inHomeLink) score += S.homeLink;
  if (logo.hint) score += S.hint;
  if (logo.visible && y < config.nearTopPx) score += S.nearTop;
  if (height >= 12 && height <= 160 && width >= 24 && width <= 600) score += S.sensibleSize;
  if (!logo.visible) score += S.hidden;
  return score;
}

function backgroundOf(logo: RawLogo, base: Color): 'light' | 'dark' {
  const file = fileOf(logo.src);
  if (LIGHT_VERSION.test(file)) return 'dark';
  if (DARK_VERSION.test(file)) return 'light';
  const behind = logo.behind.reduce<Color>((under, value) => {
    const color = parseColor(value);
    return color ? composite(color, under) : under;
  }, base);
  return luminance(behind) < config.darkBackgroundLuminance ? 'dark' : 'light';
}

function kindOf(width: number, height: number): 'lockup' | 'mark' {
  const aspect = height > 0 ? width / height : 1;
  return aspect >= config.markAspect[0]! && aspect <= config.markAspect[1]! ? 'mark' : 'lockup';
}

function viewBoxOf(svg: string | null | undefined): [number, number] | null {
  const box = /viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(svg ?? '');
  return box ? [Number(box[1]), Number(box[2])] : null;
}

const sameLogo = (a: RawLogo, b: RawLogo) => (a.src && a.src === b.src) || (a.svg !== null && a.svg === b.svg);

/** Colours written in SVG source: fill, stroke and gradient stops, in attributes, styles and <style>. */
export function svgSourceColors(svg: string): Record<string, number> {
  const found: Record<string, number> = {};
  // Masks and clip paths are black and white cut-outs, not colours of the logo
  svg = svg.replace(/<(mask|clipPath)\b[\s\S]*?<\/\1>/gi, '');
  const pattern = /(?:fill|stroke|stop-color)\s*[:=]\s*["']?\s*(#[0-9a-f]{3,8}\b|(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color)\([^)]*\)|[a-z]+)/gi;
  for (const match of svg.matchAll(pattern)) {
    const value = match[1]!.toLowerCase();
    if (['none', 'currentcolor', 'transparent', 'inherit', 'url'].includes(value)) continue;
    found[value] = (found[value] ?? 0) + 1;
  }
  // Shapes without any fill are drawn black by default
  if (!Object.keys(found).length && /<(path|rect|circle|polygon|ellipse)\b/i.test(svg)) found['#000000'] = 1;
  return found;
}

function logoColors(weights: Record<string, number>, lang: 'pl' | 'en'): Swatch[] {
  const clusters: { color: Color; weight: number }[] = [];
  for (const [value, weight] of Object.entries(weights).sort((a, b) => b[1] - a[1])) {
    const color = parseColor(value);
    if (!color || color.alpha === 0) continue;
    const opaque = { ...color, alpha: 1 };
    // 2.3 is about the smallest difference people notice
    const hit = clusters.find((c) => deltaE(c.color, opaque) < 2.3);
    if (hit) hit.weight += weight;
    else clusters.push({ color: opaque, weight });
  }
  const total = clusters.reduce((sum, c) => sum + c.weight, 0) || 1;
  return clusters.slice(0, 6).map(({ color, weight }) => ({
    name: colorName(color, lang),
    token: null,
    hex: toHex(color),
    rgb: toRgb255(color),
    cmyk: toCmyk(color),
    role: chroma(color) >= 12 ? 'accent' : 'neutral',
    share: Math.round((weight / total) * 1000) / 1000,
    use: 0,
    dark: null,
    nameSource: 'palette',
  }));
}

const sizeOf = (sizes: string | null) => {
  const match = /(\d+)x(\d+)/.exec(sizes ?? '');
  return match ? Number(match[1]) : 0;
};

/** The site's main logo: the best-scoring visible candidate, or the best hidden one when none shows. */
export function chooseLogo(page: RawPage): RawLogo | null {
  const ranked = [...page.logos].map((logo) => ({ logo, score: scoreLogo(logo) })).sort((a, b) => b.score - a.score);
  return ranked.find((r) => r.logo.visible)?.logo ?? ranked[0]?.logo ?? null;
}

export function analyseLogo(raw: RawBrand, base: Color, lang: 'pl' | 'en'): { section: LogoSection; chosen: RawLogo | null } {
  const page = raw.home.light;
  const candidates = [...page.logos, ...(raw.home.dark?.logos ?? [])];
  const chosen = chooseLogo(page);

  const variants: LogoVariant[] = [];
  const kept: RawLogo[] = [];
  // Logos built from files stacked in one box (a mark and a wordmark) are one logo
  const sameBox = (a: RawLogo, b: RawLogo) => a.area === b.area && a.box.every((v, i) => Math.abs(v - b.box[i]!) <= 1);
  const addLogo = (logo: RawLogo) => {
    if (kept.some((k) => sameLogo(k, logo) || (k.src && logo.src && sameBox(k, logo)))) return;
    kept.push(logo);
    const layers = candidates.filter((c) => c !== logo && c.src && c.src !== logo.src && logo.src && sameBox(c, logo)).map((c) => c.src!);
    const [, , width, height] = logo.box;
    const [naturalWidth, naturalHeight] = logo.natural ?? viewBoxOf(raw.assets.find((a) => a.url === logo.src)?.text) ?? [width, height];
    variants.push({
      kind: kindOf(naturalWidth, naturalHeight),
      src: logo.src,
      layers: [...new Set(layers)],
      svg: logo.svg,
      background: backgroundOf(logo, base),
      width: Math.round(width),
      height: Math.round(height),
      label: logo.alt || logo.label,
    });
  };
  if (chosen) {
    addLogo(chosen);
    const bar = scoreLogo(chosen) - 4;
    // A tiny icon in a home link (a house, a globe) is not another version of the logo
    const bigEnough = (logo: RawLogo) => logo.box[2] >= 24 || (logo.natural?.[0] ?? 0) >= 48;
    for (const logo of candidates)
      if (
        (logo.hint || logo.inHomeLink) &&
        logo.area !== 'main' &&
        logo.area !== 'other' &&
        bigEnough(logo) &&
        scoreLogo(logo) >= bar &&
        variants.length < 3
      )
        addLogo(logo);
  }

  const icons = page.meta.icons;
  const appleIcon = icons.filter((i) => /apple-touch-icon/i.test(i.rel)).sort((a, b) => sizeOf(b.sizes) - sizeOf(a.sizes))[0];
  const manifestIcon = [...(raw.manifest?.icons ?? [])]
    .filter((i) => !i.purpose || /any/.test(i.purpose))
    .sort((a, b) => sizeOf(b.sizes) - sizeOf(a.sizes))[0];
  const svgIcon = icons.find((i) => /svg/i.test(i.type ?? '') || isSvgFile(i.href));
  // An SVG favicon is nearly always the mark on its own, the version a brandbook shows next to the logo
  if (svgIcon && !variants.some((v) => v.kind === 'mark'))
    variants.push({ kind: 'mark', src: svgIcon.href, layers: [], svg: null, background: 'light', width: 0, height: 0, label: null });
  const icon = appleIcon?.href ?? manifestIcon?.src ?? (svgIcon ? null : (icons[0]?.href ?? null));
  if (icon)
    variants.push({ kind: 'icon', src: icon, layers: [], svg: null, background: 'light', width: sizeOf(appleIcon?.sizes ?? manifestIcon?.sizes ?? null), height: 0, label: null });
  if (page.meta.ogImage)
    variants.push({ kind: 'share', src: page.meta.ogImage, layers: [], svg: null, background: 'light', width: 0, height: 0, label: null });

  const files: LogoFile[] = [];
  // The same file is often linked twice, once with a cache-busting query
  const fileKey = (url: string) => {
    const parsed = new URL(url);
    return parsed.origin + parsed.pathname;
  };
  const addFile = (url: string | null, what: LogoFile['what']) => {
    if (url && files.some((f) => f.url && fileKey(f.url) === fileKey(url))) return;
    if (!url && (what !== 'inline-svg' || files.some((f) => f.what === 'inline-svg'))) return;
    files.push({ url, what });
  };
  for (const variant of variants.filter((v) => v.kind === 'lockup' || v.kind === 'mark'))
    for (const src of [variant.src, ...variant.layers]) addFile(src, src ? 'logo' : 'inline-svg');
  for (const i of icons.filter((i) => /(^|\s)icon/i.test(i.rel) && !/apple/i.test(i.rel))) addFile(i.href, 'favicon');
  if (appleIcon) addFile(appleIcon.href, 'apple-touch-icon');
  if (manifestIcon) addFile(manifestIcon.src, 'manifest-icon');
  addFile(page.meta.ogImage, 'share-image');
  addFile(page.meta.organization?.logo ?? null, 'organization-logo');

  let fills: Record<string, number> = chosen?.fills ?? {};
  if (chosen && !Object.keys(fills).length) {
    const source = chosen.svg ?? raw.assets.find((a) => a.url === chosen.src)?.text ?? null;
    if (source) fills = svgSourceColors(source);
  }

  const height = chosen && chosen.box[3] > 0 ? chosen.box[3] : 32;
  const width = chosen && chosen.box[2] > 0 ? chosen.box[2] : height * 3;
  const step = proposals.roundToPx;
  const minWidth = Math.max(
    proposals.lockupMinWidthFloorPx,
    Math.ceil(((proposals.lockupMinHeightPx * width) / height) / step) * step,
  );

  return {
    chosen,
    section: {
      found: Boolean(chosen),
      variants,
      files,
      colors: logoColors(fills, lang),
      proposals: chosen
        ? {
            proposal: true,
            clearSpaceRatio: proposals.clearSpaceRatio,
            clearSpacePx: Math.round(height * proposals.clearSpaceRatio),
            minWidthPx: minWidth,
            markMinPx: proposals.markMinPx,
            prohibitions: proposals.prohibitions,
          }
        : null,
    },
  };
}
