import { deltaE } from './color';
import { analyseColors } from './colors';
import { consistency } from './consistency';
import { analyseLogo } from './logo';
import type { Brandbook, DarkSection } from './model';
import type { RawBrand, RawPage } from './raw';
import { brandName } from './site';
import { analyseTone } from './tone';
import { colorTokens } from './tokens';
import { analyseTypography } from './typography';
import { analyseUi } from './ui';

/** True when the dark pass really changed the page: other token values or another page colour. */
function differs(light: RawPage, dark: RawPage): boolean {
  if (light.base.bodyBackground !== dark.base.bodyBackground || light.base.htmlBackground !== dark.base.htmlBackground)
    return true;
  const lightTokens = new Map(colorTokens(light.tokens).map((t) => [t.name, t.color]));
  return colorTokens(dark.tokens).some((t) => {
    const before = lightTokens.get(t.name);
    return before ? deltaE(before, t.color) > 1 : false;
  });
}

function darkSection(dark: RawPage, lang: 'pl' | 'en'): DarkSection {
  const colors = analyseColors(dark, null, lang);
  return {
    trigger: dark.toggle ? 'toggle' : 'system',
    toggle: dark.toggle ?? null,
    base: colors.section.base,
    swatches: colors.swatches,
  };
}

/** Turns what was collected into the brandbook model; deterministic, no network. */
export function analyseBrand(raw: RawBrand, options: { lang: 'pl' | 'en'; generatedAt?: string }): Brandbook {
  const page = raw.home.light;
  const host = new URL(page.url).hostname;
  const dark = raw.home.dark && differs(page, raw.home.dark) ? raw.home.dark : null;
  const colors = analyseColors(page, dark, options.lang);
  const typography = analyseTypography(page, raw.network, host);
  const logo = analyseLogo(raw, colors.base, options.lang);
  const ui = analyseUi(page, colors, Boolean(dark));
  const tone = analyseTone(page, raw.pages);
  return {
    schemaVersion: 1,
    url: page.url,
    host: host.replace(/^www\./, ''),
    name: brandName(page, raw.manifest, logo.chosen, host),
    mode: raw.mode,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    pages: [page.url, ...raw.pages.map((p) => p.url)],
    approximate: raw.mode === 'online' ? ['screenshots', 'buttons', 'dark', ...(raw.limited ? ['limited'] : [])] : [],
    siteLanguage: tone.language,
    logo: logo.section,
    colors: colors.section,
    typography,
    ui,
    tone,
    dark: dark ? darkSection(dark, options.lang) : null,
    consistency: consistency(page, raw.pages, colors, typography),
  };
}
