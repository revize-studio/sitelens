import settings from '../data/analysis.json';
import { deltaE, parseColor } from './color';
import type { ColorAnalysis } from './colors';
import type { Suggestion, TypographySection } from './model';
import type { RawPage } from './raw';
import { familyName, isIconFont } from './typography';
import { pickButtons } from './ui';

/** Where the site is not consistent with itself; the brandbook offers these as suggestions, not faults. */
export function consistency(
  home: RawPage,
  others: RawPage[],
  colors: ColorAnalysis,
  typography: TypographySection,
): Suggestion[] {
  const out: Suggestion[] = [];
  if (colors.nearPairs.length) out.push({ kind: 'near-colors', pairs: colors.nearPairs.slice(0, 4) });
  if (colors.stray.length) out.push({ kind: 'stray-colors', colors: colors.stray.slice(0, 5) });
  if (typography.unused.length) out.push({ kind: 'unused-fonts', families: typography.unused });
  if (typography.sizes.length > settings.maxTextSizes) out.push({ kind: 'many-sizes', count: typography.sizes.length });
  const radii = Object.keys(home.usage.radius).filter((r) => !r.includes('/'));
  if (radii.length > settings.maxRadii) out.push({ kind: 'many-radii', count: radii.length });

  const themeColor = home.meta.themeColors.find((t) => !t.media || /light/.test(t.media));
  const parsed = themeColor ? parseColor(themeColor.content) : null;
  if (themeColor && parsed) {
    const backgrounds = [colors.base, ...(colors.section.groups.background ?? []).map((s) => parseColor(s.hex)!)];
    if (backgrounds.every((bg) => deltaE(bg, parsed) > settings.themeColorDeltaE))
      out.push({ kind: 'theme-color', themeColor: themeColor.content, base: colors.section.base });
  }

  const homeFamilies = new Set(typography.families.map((f) => f.name));
  const homeButton = pickButtons(home, colors.base)[0];
  for (const page of others) {
    const weights = new Map<string, number>();
    for (const [stack, w] of Object.entries(page.usage.font)) {
      const name = familyName(stack);
      if (name && !isIconFont(name)) weights.set(name, (weights.get(name) ?? 0) + w);
    }
    const total = [...weights.values()].reduce((a, b) => a + b, 0) || 1;
    const fonts = [...weights].filter(([name, w]) => w / total >= 0.05 && !homeFamilies.has(name)).map(([name]) => name);
    const button = pickButtons(page, colors.base)[0];
    const buttons =
      homeButton?.background && button?.background && deltaE(parseColor(homeButton.background)!, parseColor(button.background)!) > settings.matchDeltaE
        ? [homeButton.background, button.background]
        : [];
    if (fonts.length || buttons.length) out.push({ kind: 'pages-differ', page: page.url, fonts, buttons });
  }
  return out;
}
