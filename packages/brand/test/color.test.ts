import { describe, expect, it } from 'vitest';
import {
  composite,
  contrastRatio,
  deltaE,
  deltaE2000Lab,
  parseColor,
  toCmyk,
  toHex,
  toRgb255,
  type Color,
} from '../src/color';

const hex = (text: string) => {
  const color = parseColor(text);
  expect(color, text).not.toBeNull();
  return toHex(color as Color);
};

describe('parseColor', () => {
  it('reads hex in all four lengths', () => {
    expect(hex('#f00')).toBe('#FF0000');
    expect(hex('#0f08')).toBe('#00FF00');
    expect(parseColor('#0f08')?.alpha).toBeCloseTo(0.533, 2);
    expect(hex('#2B5CF0')).toBe('#2B5CF0');
    expect(parseColor('#2b5cf080')?.alpha).toBeCloseTo(0.502, 2);
  });

  it('reads named colours and transparent', () => {
    expect(hex('RebeccaPurple')).toBe('#663399');
    expect(parseColor('transparent')?.alpha).toBe(0);
  });

  it('reads rgb() in the legacy and the modern syntax', () => {
    expect(hex('rgb(43, 92, 240)')).toBe('#2B5CF0');
    expect(parseColor('rgba(0, 0, 0, 0.5)')?.alpha).toBe(0.5);
    expect(hex('rgb(100% 0% 0% / 50%)')).toBe('#FF0000');
    expect(parseColor('rgb(255 0 0 / 50%)')?.alpha).toBe(0.5);
  });

  it('reads hsl() and hwb()', () => {
    expect(hex('hsl(120 100% 25%)')).toBe('#008000');
    expect(hex('hsl(0.5turn, 100%, 50%)')).toBe('#00FFFF');
    expect(hex('hwb(0 0% 0%)')).toBe('#FF0000');
    expect(hex('hwb(0 50% 50%)')).toBe('#808080');
  });

  it('converts lab() and lch() from the D50 white point to sRGB', () => {
    expect(hex('lab(54.29% 80.82 69.89)')).toBe('#FF0000');
    expect(hex('lab(54.2917 80.8125 69.8851)')).toBe('#FF0000');
    expect(hex('lch(54.29 106.84 40.85)')).toBe('#FF0000');
    expect(hex('lab(100 0 0)')).toBe('#FFFFFF');
  });

  it('converts oklab() and oklch()', () => {
    expect(hex('oklch(62.8% 0.2577 29.23)')).toBe('#FF0000');
    expect(hex('oklab(0.628 0.2249 0.1258)')).toBe('#FF0000');
    expect(hex('oklch(0 0 0)')).toBe('#000000');
  });

  it('converts color() spaces and clips wide-gamut colours', () => {
    expect(hex('color(srgb 0.5 0.5 0.5)')).toBe('#808080');
    expect(hex('color(srgb-linear 1 0 0)')).toBe('#FF0000');
    expect(hex('color(display-p3 1 0 0)')).toBe('#FF0000');
    expect(hex('color(xyz-d65 0.9505 1 1.089)')).toBe('#FFFFFF');
    expect(parseColor('color(display-p3 0 0 1 / 0.25)')?.alpha).toBe(0.25);
  });

  it('returns null for what is not one colour', () => {
    for (const text of ['linear-gradient(red, blue)', 'var(--x)', 'currentcolor', '12px', 'color-mix(in srgb, red, blue)', ''])
      expect(parseColor(text), text).toBeNull();
  });
});

describe('colour maths', () => {
  it('composites translucent colours over the base', () => {
    const over = composite(parseColor('rgba(0, 0, 0, 0.5)')!, parseColor('#ffffff')!);
    expect(toRgb255(over)).toEqual([128, 128, 128]);
  });

  it('computes CIEDE2000 like the reference data', () => {
    // Pairs 1 and 7 from Sharma, Wu and Dalal (2005)
    expect(deltaE2000Lab([50, 2.6772, -79.7751], [50, 0, -82.7485])).toBeCloseTo(2.0425, 3);
    expect(deltaE2000Lab([50, 0, 0], [50, -1, 2])).toBeCloseTo(2.3669, 3);
    expect(deltaE(parseColor('#050506')!, parseColor('#050506')!)).toBe(0);
  });

  it('computes WCAG contrast', () => {
    expect(contrastRatio(parseColor('#000')!, parseColor('#fff')!)).toBeCloseTo(21, 5);
    expect(contrastRatio(parseColor('#767676')!, parseColor('#fff')!)).toBeCloseTo(4.54, 2);
  });

  it('converts to CMYK the naive way', () => {
    expect(toCmyk(parseColor('#000')!)).toEqual([0, 0, 0, 100]);
    expect(toCmyk(parseColor('#2B5CF0')!)).toEqual([82, 62, 0, 6]);
  });
});
