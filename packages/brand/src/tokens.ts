import filters from '../data/token-filters.json';
import { parseColor, type Color } from './color';
import type { RawToken } from './raw';

const compile = (sources: string[]) => sources.map((source) => new RegExp(source, 'i'));
const FRAMEWORK = compile(filters.framework);
const INTERNAL = compile(filters.internal);
const DECORATIVE = new RegExp(filters.decorative, 'i');
const SEMANTIC = new RegExp(filters.semantic, 'i');
const BRANDISH = new RegExp(filters.brandish, 'i');
export const STATE_VARIANT = new RegExp(filters.stateVariant, 'i');

export type TokenKind = 'framework' | 'internal' | 'decorative' | 'semantic' | 'brand';

/** Why a custom property is or is not one of the brand's own colours. */
export function tokenKind(name: string): TokenKind {
  if (FRAMEWORK.some((re) => re.test(name))) return 'framework';
  if (INTERNAL.some((re) => re.test(name))) return 'internal';
  if (DECORATIVE.test(name)) return 'decorative';
  if (SEMANTIC.test(name)) return 'semantic';
  return 'brand';
}

export interface ColorToken {
  name: string;
  color: Color;
  semantic: boolean;
  brandish: boolean;
}

/** The brand's colour tokens: framework palettes, library internals and decoration left out. */
export function colorTokens(tokens: RawToken[]): ColorToken[] {
  const out: ColorToken[] = [];
  for (const { name, value } of tokens) {
    const kind = tokenKind(name);
    if (kind === 'framework' || kind === 'internal' || kind === 'decorative') continue;
    const color = parseColor(value);
    // Translucent tokens are overlays and hover tints, except the states that are meant to be see-through
    if (!color || (color.alpha < 1 && kind !== 'semantic')) continue;
    if (out.some((t) => t.name === name)) continue;
    out.push({ name, color, semantic: kind === 'semantic', brandish: BRANDISH.test(name) });
  }
  return out;
}

/**
 * The prefix most token names share (`--color-`, `--sl-`, `--wp--preset--color--`), which the
 * brandbook leaves out of display names.
 */
export function commonPrefix(names: string[]): string {
  if (names.length < 2) return '--';
  const counts = new Map<string, number>();
  for (const name of names) {
    const parts = name.slice(2).split(/(?<=-)/);
    let prefix = '--';
    for (const part of parts.slice(0, -1)) {
      prefix += part;
      counts.set(prefix, (counts.get(prefix) ?? 0) + 1);
    }
  }
  let best = '--';
  for (const [prefix, count] of counts)
    if (count >= names.length * 0.6 && prefix.length > best.length) best = prefix;
  return best;
}

export const displayName = (name: string, prefix: string) =>
  (name.startsWith(prefix) && name.length > prefix.length ? name.slice(prefix.length) : name.replace(/^--/, '')).replace(
    /^-+/,
    '',
  );
