import settings from '../data/analysis.json';
import { chroma, composite, contrastRatio, luminance, parseColor, toHex, type Color } from './color';
import type { ColorAnalysis } from './colors';
import type { ButtonStyle, UiSection } from './model';
import type { RawButton, RawPage } from './raw';
import { familyName } from './typography';

function buttonStyle(button: RawButton, index: number, kind: ButtonStyle['kind'], base: Color): ButtonStyle {
  const s = button.style;
  const background = parseColor(s.background);
  const border = parseColor(s.borderColor);
  const color = parseColor(s.color);
  return {
    kind,
    index,
    text: button.text,
    background: background && background.alpha > 0.1 ? toHex(composite(background, base)) : null,
    gradient: /gradient\(/.test(s.backgroundImage),
    color: color ? toHex(composite(color, base)) : s.color,
    border:
      parseFloat(s.borderWidth) > 0 && s.borderStyle !== 'none' && border && border.alpha > 0
        ? `${s.borderWidth} ${s.borderStyle} ${toHex(composite(border, base))}`
        : null,
    radius: s.radius,
    family: familyName(s.fontFamily),
    sizePx: Math.round(parseFloat(s.fontSize) * 10) / 10,
    weight: Number(s.fontWeight) || 400,
    shadow: s.shadow !== 'none',
    transform: s.textTransform,
  };
}

const signature = (b: ButtonStyle) => [b.background, b.gradient, b.border, b.color].join('|');
const LANGUAGE_CODE = /^[A-Z]{2,3}$/i;

/** Buttons that belong to the brand: no tabs, language switches or cookie banners, coloured ones first. */
export function brandButtons(page: RawPage): RawButton[] {
  const coloured = (b: RawButton) => {
    const bg = parseColor(b.style.background);
    return (bg && bg.alpha > 0.1 && chroma(bg) >= 12) || /gradient\(/.test(b.style.backgroundImage) ? 2 : 0;
  };
  return page.buttons
    .filter((b) => !b.isTab && !b.inConsent && !LANGUAGE_CODE.test(b.text.trim()))
    .map((b, index) => ({ b, index, score: b.emphasis + coloured(b) }))
    .sort((x, y) => y.score - x.score || x.index - y.index)
    .map(({ b }) => b);
}

/** The main and secondary buttons: the most emphasised ones, one per distinct look. */
export function pickButtons(page: RawPage, base: Color): ButtonStyle[] {
  const candidates = brandButtons(page);
  const filled = candidates.find((b) => {
    const bg = parseColor(b.style.background);
    return (bg && bg.alpha > 0.1) || /gradient\(/.test(b.style.backgroundImage);
  });
  const out: ButtonStyle[] = [];
  const index = (b: RawButton) => page.buttons.indexOf(b);
  if (filled) out.push(buttonStyle(filled, index(filled), 'primary', base));
  for (const button of candidates) {
    if (out.length >= 3) break;
    const style = buttonStyle(button, index(button), out.length ? 'secondary' : 'primary', base);
    if (!out.some((o) => signature(o) === signature(style))) out.push(style);
  }
  return out;
}

function corners(radius: string | undefined, heightPx: number): UiSection['character']['corners'] {
  if (!radius) return 'sharp';
  if (radius.endsWith('%')) return parseFloat(radius) >= 50 ? 'pill' : 'rounded';
  const value = parseFloat(radius);
  if (value >= heightPx / 2 - 1 || value >= 999) return 'pill';
  return value >= 4 ? 'rounded' : 'sharp';
}

export function analyseUi(page: RawPage, colors: ColorAnalysis, hasDarkTheme: boolean): UiSection {
  const buttons = pickButtons(page, colors.base);
  // A full rounding is written as a huge number (Tailwind's rounded-full computes to 3.35544e+07px);
  // the brandbook shows it the way people write it
  const radii = [
    ...new Set(
      Object.entries(page.usage.radius)
        .filter(([value]) => !value.includes('/'))
        .sort((a, b) => b[1] - a[1])
        .map(([value]) => (/px$/.test(value) && parseFloat(value) >= 999 ? '9999px' : value)),
    ),
  ];
  const shadows = Object.entries(page.usage.shadow)
    .sort((a, b) => b[1] - a[1])
    .map(([value]) => value);

  const texts = (colors.section.groups.text ?? []).filter((t) => t.share >= 0.1);
  const contrast = Math.max(0, ...texts.map((t) => contrastRatio(parseColor(t.hex)!, colors.base))) || 21;
  const accents = colors.section.groups.accent ?? [];
  const usedAccents = accents.filter((a) => a.use > 0);
  const saturation = Math.max(0, ...(usedAccents.length ? usedAccents : accents).map((a) => chroma(parseColor(a.hex)!)));
  const primary = brandButtons(page)[0];

  return {
    buttons,
    radii: radii.slice(0, settings.maxRadii),
    shadows: shadows.slice(0, 3),
    character: {
      proposal: true,
      theme: luminance(colors.base) < 0.2 ? 'dark' : 'light',
      contrast: contrast >= 12 ? 'high' : contrast >= 7 ? 'medium' : 'low',
      saturation: saturation < 25 ? 'muted' : saturation < 55 ? 'moderate' : 'vivid',
      corners: corners(primary?.style.radius, primary?.box[3] ?? 40),
      glass: page.effects.glass > 0,
      gradients: page.effects.gradients > 2,
      hasDarkTheme,
    },
  };
}
