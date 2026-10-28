import settings from '../data/analysis.json';
import {
  chroma,
  composite,
  contrastRatio,
  deltaE,
  luminance,
  parseColor,
  toCmyk,
  toHex,
  toRgb255,
  type Color,
} from './color';
import type { ColorRole, ColorSection, Swatch } from './model';
import { colorName } from './names';
import type { RawPage } from './raw';
import { colorTokens, commonPrefix, displayName, STATE_VARIANT } from './tokens';

type Kind = 'background' | 'text' | 'border';
const KINDS: Kind[] = ['background', 'text', 'border'];
const KIND_WEIGHT_TOTAL = KINDS.reduce((sum, kind) => sum + settings.kindWeights[kind], 0);

interface Sample {
  color: Color;
  weight: number;
  kind: Kind;
}

interface Candidate {
  name: string;
  token: string | null;
  color: Color;
  semantic: boolean;
  brandish: boolean;
  shares: Record<Kind, number>;
  use: number;
  nameSource: 'token' | 'palette';
  order: number;
}

const WHITE = parseColor(settings.lightBase)!;
const DARK_CANVAS = parseColor(settings.darkBase)!;

/** The colour of the page itself: body over html over the browser's canvas. */
export function baseColor(page: RawPage): Color {
  const canvas = /dark/.test(page.base.colorScheme) && !/light/.test(page.base.colorScheme) ? DARK_CANVAS : WHITE;
  let base = canvas;
  for (const value of [page.base.htmlBackground, page.base.bodyBackground]) {
    const color = parseColor(value);
    if (color && color.alpha > 0) base = composite(color, base);
  }
  return base;
}

/** Background, text and line colours weighted by how much of the page they cover, each kind adding up to 1. */
export function usageSamples(page: RawPage, base: Color): Sample[] {
  const samples: Sample[] = [];
  const add = (kind: Kind, entries: [Color, number][]) => {
    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    if (total > 0) for (const [color, w] of entries) samples.push({ color, weight: w / total, kind });
  };
  const layered = (stack: string) =>
    stack === 'base'
      ? base
      : stack.split('|').reduce<Color>((under, value) => {
          const color = parseColor(value);
          return color ? composite(color, under) : under;
        }, base);
  add(
    'background',
    Object.entries(page.usage.background).map(([stack, w]) => [layered(stack), w]),
  );
  for (const kind of ['text', 'border'] as const)
    add(
      kind,
      Object.entries(page.usage[kind]).flatMap(([value, w]) => {
        const color = parseColor(value);
        return color && color.alpha > 0 ? [[composite(color, base), w] as [Color, number]] : [];
      }),
    );
  return samples;
}

function nearest<T extends { color: Color }>(items: T[], color: Color): [T | undefined, number] {
  let best: T | undefined;
  let distance = Infinity;
  for (const item of items) {
    const d = deltaE(item.color, color);
    if (d < distance) {
      best = item;
      distance = d;
    }
  }
  return [best, distance];
}

/** Merges colours closer than the threshold, keeping the heaviest as the representative. */
function cluster(samples: Sample[], threshold: number): { color: Color; shares: Record<Kind, number> }[] {
  const clusters: { color: Color; shares: Record<Kind, number>; weight: number }[] = [];
  for (const sample of [...samples].sort((a, b) => b.weight - a.weight)) {
    const [hit, distance] = nearest(clusters, sample.color);
    if (hit && distance < threshold) {
      hit.shares[sample.kind] += sample.weight;
      hit.weight += sample.weight;
    } else
      clusters.push({
        color: sample.color,
        shares: { background: 0, text: 0, border: 0, [sample.kind]: sample.weight },
        weight: sample.weight,
      });
  }
  return clusters;
}

const useOf = (shares: Record<Kind, number>) =>
  KINDS.reduce((sum, kind) => sum + shares[kind] * settings.kindWeights[kind], 0) / KIND_WEIGHT_TOTAL;

function roleOf(c: Candidate): ColorRole | null {
  if (c.semantic) return 'state';
  if (chroma(c.color) >= settings.chromaAccent) return 'accent';
  // A neutral token nobody uses is usually left over from an earlier design
  if (c.use === 0) return null;
  if (c.shares.text > c.shares.background && c.shares.text > settings.textMinShare) return 'text';
  if (c.shares.background > settings.roleMinShare) return 'background';
  if (c.shares.border > 0) return 'line';
  return 'neutral';
}

function swatch(c: Candidate, role: ColorRole, dark: Map<string, Color>): Swatch {
  const share = role === 'background' ? c.shares.background : role === 'text' ? c.shares.text : role === 'line' ? c.shares.border : c.use;
  const darkColor = c.token ? dark.get(c.token) : undefined;
  return {
    name: c.name,
    token: c.token,
    hex: toHex(c.color),
    rgb: toRgb255(c.color),
    cmyk: toCmyk(c.color),
    role,
    share: round(share),
    use: round(c.use),
    dark: darkColor && deltaE(darkColor, c.color) > settings.aliasDeltaE ? toHex(darkColor) : null,
    nameSource: c.nameSource,
  };
}

const round = (value: number, digits = 4) => Math.round(value * 10 ** digits) / 10 ** digits;

export interface ColorAnalysis {
  section: ColorSection;
  base: Color;
  stray: { hex: string; share: number }[];
  nearPairs: { a: string; b: string; deltaE: number }[];
  swatches: Swatch[];
}

/** Groups the site's colours by what they are used for, from tokens when the site has them. */
export function analyseColors(page: RawPage, darkPage: RawPage | null, lang: 'pl' | 'en'): ColorAnalysis {
  const base = baseColor(page);
  const samples = usageSamples(page, base);
  const tokens = colorTokens(page.tokens);
  const hasTokens = tokens.length >= 3;
  const prefix = commonPrefix(tokens.map((t) => t.name));
  const stray: Sample[] = [];
  let candidates: Candidate[];

  if (hasTokens) {
    candidates = tokens.map((t, order) => ({
      order,
      name: displayName(t.name, prefix),
      token: t.name,
      color: t.color,
      semantic: t.semantic,
      brandish: t.brandish,
      shares: { background: 0, text: 0, border: 0 },
      use: 0,
      nameSource: 'token' as const,
    }));
    const opaque = candidates.filter((c) => c.color.alpha >= 1);
    for (const sample of samples) {
      const [hit, distance] = nearest(opaque, sample.color);
      if (hit && distance < settings.matchDeltaE) hit.shares[sample.kind] += sample.weight;
      else stray.push(sample);
    }
  } else {
    candidates = cluster(samples, settings.strayClusterDeltaE).map((c, order) => ({
      order,
      name: colorName(c.color, lang),
      token: null,
      color: c.color,
      semantic: false,
      brandish: false,
      shares: c.shares,
      use: 0,
      nameSource: 'palette' as const,
    }));
  }
  for (const c of candidates) c.use = useOf(c.shares);

  const darkValues = new Map<string, Color>();
  for (const t of darkPage ? colorTokens(darkPage.tokens) : []) darkValues.set(t.name, t.color);

  const groups: ColorSection['groups'] = {};
  const swatches: Swatch[] = [];
  const order: ColorRole[] = ['background', 'text', 'accent', 'line', 'state', 'neutral'];
  // Used colours by share, base tokens before their hover and focus variants; unused ones keep stylesheet order
  const byUse = (a: Candidate, b: Candidate) =>
    Number(a.use === 0) - Number(b.use === 0) ||
    Number(STATE_VARIANT.test(a.name)) - Number(STATE_VARIANT.test(b.name)) ||
    b.use - a.use ||
    Number(b.brandish) - Number(a.brandish) ||
    a.order - b.order;
  for (const role of order) {
    const kept: Candidate[] = [];
    let unusedAccents = 0;
    for (const c of candidates.filter((x) => roleOf(x) === role).sort(byUse)) {
      if (role === 'accent' && c.use === 0 && ++unusedAccents > settings.maxUnusedAccents) continue;
      // Identical values under two names are usually deliberate aliases; one swatch is enough
      if (kept.some((k) => deltaE(k.color, c.color) < settings.aliasDeltaE)) continue;
      // Without tokens, a sliver of colour on the page is noise rather than part of the palette
      if (!hasTokens && c.use < settings.roleMinShare) continue;
      kept.push(c);
    }
    const list = kept.slice(0, settings.maxSwatchesPerGroup).map((c) => swatch(c, role, darkValues));
    if (list.length) groups[role] = list;
    swatches.push(...list);
  }

  const proportions = candidates
    .filter((c) => c.use >= settings.proportionMinShare)
    .sort((a, b) => b.use - a.use)
    .map((c) => ({ name: c.name, hex: toHex(c.color), use: round(c.use) }));

  const textSwatches = (groups.text ?? []).filter((s) => s.share > 0).slice(0, 4);
  const accent = (groups.accent ?? [])[0];
  const texts = accent ? [...textSwatches, accent] : textSwatches;
  const backgrounds = (groups.background ?? []).filter((s) => s.share > 0).slice(0, 4);
  const cells = texts.flatMap((t) =>
    backgrounds.map((b) => {
      const ratio = contrastRatio(parseColor(t.hex)!, parseColor(b.hex)!);
      return {
        text: t.name,
        background: b.name,
        textHex: t.hex,
        backgroundHex: b.hex,
        ratio: Math.round(ratio * 10) / 10,
        level: (ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA-large' : 'fail') as 'AA' | 'AA-large' | 'fail',
      };
    }),
  );

  const strayClusters = cluster(stray, settings.strayClusterDeltaE)
    .map((c) => ({ hex: toHex(c.color), share: round(useOf(c.shares)) }))
    .filter((c) => c.share >= settings.strayMinShare);

  const neutralRoles: ColorRole[] = ['background', 'text', 'neutral', 'line'];
  const used = swatches.filter((s) => s.use > 0 && neutralRoles.includes(s.role));
  const nearPairs: ColorAnalysis['nearPairs'] = [];
  for (let i = 0; i < used.length; i++)
    for (const other of used.slice(i + 1)) {
      const d = deltaE(parseColor(used[i]!.hex)!, parseColor(other.hex)!);
      if (d > settings.aliasDeltaE && d <= settings.nearDeltaE)
        nearPairs.push({ a: used[i]!.token ?? used[i]!.name, b: other.token ?? other.name, deltaE: Math.round(d * 10) / 10 });
    }
  nearPairs.sort((a, b) => a.deltaE - b.deltaE);

  return {
    base,
    stray: strayClusters,
    nearPairs: nearPairs.slice(0, 6),
    swatches,
    section: {
      base: toHex(base),
      hasTokens,
      groups,
      proportions,
      contrast: { texts: texts.map((t) => t.name), backgrounds: backgrounds.map((b) => b.name), cells },
    },
  };
}

export const isDark = (color: Color) => luminance(color) < 0.2;
