import named from '../data/css-named-colors.json';

/** A colour in sRGB, channels 0–1, already brought into the sRGB gamut. */
export interface Color {
  r: number;
  g: number;
  b: number;
  alpha: number;
}

type Vec3 = [number, number, number];
type Mat3 = [Vec3, Vec3, Vec3];

const multiply = (m: Mat3, [x, y, z]: Vec3): Vec3 => [
  m[0][0] * x + m[0][1] * y + m[0][2] * z,
  m[1][0] * x + m[1][1] * y + m[1][2] * z,
  m[2][0] * x + m[2][1] * y + m[2][2] * z,
];

// Matrices from the CSS Color 4 sample code, so results match what browsers compute
const LIN_SRGB_TO_XYZ: Mat3 = [
  [0.41239079926595934, 0.357584339383878, 0.1804807884018343],
  [0.21263900587151027, 0.715168678767756, 0.07219231536073371],
  [0.01933081871559182, 0.11919477979462598, 0.9505321522496607],
];
const XYZ_TO_LIN_SRGB: Mat3 = [
  [3.2409699419045226, -1.537383177570094, -0.4986107602930034],
  [-0.9692436362808796, 1.8759675015077202, 0.04155505740717559],
  [0.05563007969699366, -0.20397695888897652, 1.0569715142428786],
];
const D50_TO_D65: Mat3 = [
  [0.9554734527042182, -0.023098536874261423, 0.0632593086610217],
  [-0.028369706963208136, 1.0099954580058226, 0.021041398966943008],
  [0.012314001688319899, -0.020507696433477912, 1.3303659366080753],
];
const P3_TO_XYZ: Mat3 = [
  [0.4865709486482162, 0.26566769316909306, 0.1982172852343625],
  [0.2289745640697488, 0.6917385218365064, 0.079286914093745],
  [0, 0.04511338185890264, 1.043944368900976],
];
const A98_TO_XYZ: Mat3 = [
  [0.5766690429101305, 0.1855582379065463, 0.1882286462349947],
  [0.29734497525053605, 0.6273635662554661, 0.07529145849399788],
  [0.02703136138641234, 0.07068885253582723, 0.9913375368376388],
];
const PROPHOTO_TO_XYZ_D50: Mat3 = [
  [0.7977666449006423, 0.13518129740053308, 0.0313477341283922],
  [0.2880748288194013, 0.711835234241873, 0.00008993693872564],
  [0, 0, 0.8251046025104602],
];
const REC2020_TO_XYZ: Mat3 = [
  [0.6369580483012914, 0.14461690358620832, 0.1688809751641721],
  [0.2627002120112671, 0.6779980715188708, 0.05930171646986196],
  [0, 0.028072693049087428, 1.060985057710791],
];
const OKLAB_TO_LMS: Mat3 = [
  [1, 0.3963377773761749, 0.2158037573099136],
  [1, -0.1055613458156586, -0.0638541728258133],
  [1, -0.0894841775298119, -1.2914855480194092],
];
const LMS_TO_XYZ: Mat3 = [
  [1.2268798758459243, -0.5578149944602171, 0.2813910456659647],
  [-0.0405757452148008, 1.112286803280317, -0.0717110580655164],
  [-0.0763729366746601, -0.4214933324022432, 1.5869240198367816],
];
const D50_WHITE: Vec3 = [0.3457 / 0.3585, 1, (1 - 0.3457 - 0.3585) / 0.3585];
const D65_WHITE: Vec3 = [0.3127 / 0.329, 1, (1 - 0.3127 - 0.329) / 0.329];
const KAPPA = 24389 / 27;
const EPSILON = 216 / 24389;

const encodeSrgb = (c: number) =>
  Math.sign(c) * (Math.abs(c) <= 0.0031308 ? 12.92 * Math.abs(c) : 1.055 * Math.abs(c) ** (1 / 2.4) - 0.055);
const decodeSrgb = (c: number) =>
  Math.sign(c) * (Math.abs(c) <= 0.04045 ? Math.abs(c) / 12.92 : ((Math.abs(c) + 0.055) / 1.055) ** 2.4);
const decodeA98 = (c: number) => Math.sign(c) * Math.abs(c) ** (563 / 256);
const decodeProphoto = (c: number) => (Math.abs(c) <= 16 / 512 ? c / 16 : Math.sign(c) * Math.abs(c) ** 1.8);
function decodeRec2020(c: number) {
  const alpha = 1.09929682680944;
  const beta = 0.018053968510807;
  return Math.abs(c) < beta * 4.5 ? c / 4.5 : Math.sign(c) * ((Math.abs(c) + alpha - 1) / alpha) ** (1 / 0.45);
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function fromXyzD65(xyz: Vec3, alpha: number): Color {
  // Out-of-gamut colours (display-p3, oklch) are clipped; enough for swatches and hex codes
  const [r, g, b] = multiply(XYZ_TO_LIN_SRGB, xyz).map((c) => clamp01(encodeSrgb(c))) as Vec3;
  return { r, g, b, alpha: clamp01(alpha) };
}

function labToXyzD50([l, a, b]: Vec3): Vec3 {
  const f1 = (l + 16) / 116;
  const f0 = a / 500 + f1;
  const f2 = f1 - b / 200;
  const xyz: Vec3 = [
    f0 ** 3 > EPSILON ? f0 ** 3 : (116 * f0 - 16) / KAPPA,
    l > KAPPA * EPSILON ? ((l + 16) / 116) ** 3 : l / KAPPA,
    f2 ** 3 > EPSILON ? f2 ** 3 : (116 * f2 - 16) / KAPPA,
  ];
  return [xyz[0] * D50_WHITE[0], xyz[1] * D50_WHITE[1], xyz[2] * D50_WHITE[2]];
}

function oklabToXyz(lab: Vec3): Vec3 {
  const lms = multiply(OKLAB_TO_LMS, lab).map((c) => c ** 3) as Vec3;
  return multiply(LMS_TO_XYZ, lms);
}

const polar = (l: number, c: number, h: number): Vec3 => [
  l,
  c * Math.cos((h * Math.PI) / 180),
  c * Math.sin((h * Math.PI) / 180),
];

function hslToRgb(h: number, s: number, l: number): Vec3 {
  const hue = ((h % 360) + 360) % 360;
  const channel = (n: number) => {
    const k = (n + hue / 30) % 12;
    return l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [channel(0), channel(8), channel(4)];
}

function hwbToRgb(h: number, w: number, b: number): Vec3 {
  if (w + b >= 1) {
    const gray = w / (w + b);
    return [gray, gray, gray];
  }
  return hslToRgb(h, 1, 0.5).map((c) => c * (1 - w - b) + w) as Vec3;
}

/** One function argument: a number, a percentage (as a fraction), an angle in degrees or `none`. */
interface Arg {
  value: number;
  percent: boolean;
}

function parseArg(token: string): Arg | null {
  if (token === 'none') return { value: 0, percent: false };
  const match = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(%|deg|rad|grad|turn)?$/i.exec(token);
  if (!match) return null;
  const number = Number(match[1]);
  switch (match[2]?.toLowerCase()) {
    case '%':
      return { value: number / 100, percent: true };
    case 'rad':
      return { value: (number * 180) / Math.PI, percent: false };
    case 'grad':
      return { value: number * 0.9, percent: false };
    case 'turn':
      return { value: number * 360, percent: false };
    default:
      return { value: number, percent: false };
  }
}

function splitArgs(body: string): { channels: Arg[]; alpha: number } | null {
  const [main = '', alphaPart] = body.split('/');
  const tokens = main.trim().split(/[\s,]+/).filter(Boolean);
  // The legacy syntax puts alpha as a fourth comma-separated value
  let alphaToken = alphaPart?.trim();
  if (!alphaToken && tokens.length === 4) alphaToken = tokens.pop();
  const channels = tokens.map(parseArg);
  if (channels.some((c) => c === null)) return null;
  const alphaArg = alphaToken ? parseArg(alphaToken) : { value: 1, percent: false };
  if (!alphaArg) return null;
  return { channels: channels as Arg[], alpha: alphaArg.value };
}

function parseHex(hex: string): Color | null {
  if (!/^[0-9a-f]+$/i.test(hex) || ![3, 4, 6, 8].includes(hex.length)) return null;
  const full = hex.length <= 4 ? [...hex].map((c) => c + c).join('') : hex;
  const channel = (i: number) => parseInt(full.slice(i, i + 2), 16) / 255;
  return { r: channel(0), g: channel(2), b: channel(4), alpha: full.length === 8 ? channel(6) : 1 };
}

const SPACES: Record<string, (rgb: Vec3) => Vec3> = {
  srgb: (rgb) => multiply(LIN_SRGB_TO_XYZ, rgb.map(decodeSrgb) as Vec3),
  'srgb-linear': (rgb) => multiply(LIN_SRGB_TO_XYZ, rgb),
  'display-p3': (rgb) => multiply(P3_TO_XYZ, rgb.map(decodeSrgb) as Vec3),
  'a98-rgb': (rgb) => multiply(A98_TO_XYZ, rgb.map(decodeA98) as Vec3),
  'prophoto-rgb': (rgb) => multiply(D50_TO_D65, multiply(PROPHOTO_TO_XYZ_D50, rgb.map(decodeProphoto) as Vec3)),
  rec2020: (rgb) => multiply(REC2020_TO_XYZ, rgb.map(decodeRec2020) as Vec3),
  xyz: (xyz) => xyz,
  'xyz-d65': (xyz) => xyz,
  'xyz-d50': (xyz) => multiply(D50_TO_D65, xyz),
};

/**
 * Parses any colour a stylesheet or a computed style can hold: hex, named, rgb(), hsl(), hwb(), lab(),
 * lch(), oklab(), oklch() and color(). Returns null for what is not a single colour (gradients,
 * var(), color-mix(), currentcolor).
 */
export function parseColor(text: string): Color | null {
  const value = text.trim().toLowerCase();
  if (value === 'transparent') return { r: 0, g: 0, b: 0, alpha: 0 };
  if (value.startsWith('#')) return parseHex(value.slice(1));
  const known = (named as Record<string, string>)[value];
  if (known) return parseHex(known.slice(1));
  const match = /^([a-z]+)\(\s*([^()]*)\)$/.exec(value);
  if (!match) return null;
  const [, fn = '', body = ''] = match;

  if (fn === 'color') {
    const [space = '', ...rest] = body.trim().split(/\s+/);
    const convert = SPACES[space];
    const args = convert && splitArgs(rest.join(' '));
    if (!convert || !args || args.channels.length !== 3) return null;
    return fromXyzD65(convert(args.channels.map((c) => c.value) as Vec3), args.alpha);
  }

  const args = splitArgs(body);
  if (!args || args.channels.length !== 3) return null;
  const [c0, c1, c2] = args.channels as [Arg, Arg, Arg];
  switch (fn) {
    case 'rgb':
    case 'rgba': {
      const channel = (c: Arg) => (c.percent ? c.value : c.value / 255);
      const rgb: Vec3 = [channel(c0), channel(c1), channel(c2)];
      return { r: clamp01(rgb[0]), g: clamp01(rgb[1]), b: clamp01(rgb[2]), alpha: clamp01(args.alpha) };
    }
    case 'hsl':
    case 'hsla': {
      // Modern syntax allows plain numbers for saturation and lightness, meaning percent
      const fraction = (c: Arg) => (c.percent ? c.value : c.value / 100);
      const [r, g, b] = hslToRgb(c0.value, fraction(c1), fraction(c2));
      return { r: clamp01(r), g: clamp01(g), b: clamp01(b), alpha: clamp01(args.alpha) };
    }
    case 'hwb': {
      const fraction = (c: Arg) => (c.percent ? c.value : c.value / 100);
      const [r, g, b] = hwbToRgb(c0.value, fraction(c1), fraction(c2));
      return { r: clamp01(r), g: clamp01(g), b: clamp01(b), alpha: clamp01(args.alpha) };
    }
    case 'lab': {
      const lab: Vec3 = [c0.percent ? c0.value * 100 : c0.value, c1.percent ? c1.value * 125 : c1.value, c2.percent ? c2.value * 125 : c2.value];
      return fromXyzD65(multiply(D50_TO_D65, labToXyzD50(lab)), args.alpha);
    }
    case 'lch': {
      const lab = polar(c0.percent ? c0.value * 100 : c0.value, c1.percent ? c1.value * 150 : c1.value, c2.value);
      return fromXyzD65(multiply(D50_TO_D65, labToXyzD50(lab)), args.alpha);
    }
    case 'oklab':
      return fromXyzD65(
        oklabToXyz([c0.value, c1.percent ? c1.value * 0.4 : c1.value, c2.percent ? c2.value * 0.4 : c2.value]),
        args.alpha,
      );
    case 'oklch':
      return fromXyzD65(oklabToXyz(polar(c0.value, c1.percent ? c1.value * 0.4 : c1.value, c2.value)), args.alpha);
    default:
      return null;
  }
}

/** The colour as seen over an opaque base, which is how a translucent background or text looks. */
export function composite(color: Color, base: Color): Color {
  const a = color.alpha;
  return { r: color.r * a + base.r * (1 - a), g: color.g * a + base.g * (1 - a), b: color.b * a + base.b * (1 - a), alpha: 1 };
}

export const toRgb255 = (c: Color): Vec3 => [Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255)];

export const toHex = (c: Color) =>
  `#${toRgb255(c)
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;

/** A naive RGB-to-CMYK conversion; print needs a proof from the printer, which the brandbook says. */
export function toCmyk(c: Color): [number, number, number, number] {
  const k = 1 - Math.max(c.r, c.g, c.b);
  if (k >= 1) return [0, 0, 0, 100];
  const part = (v: number) => Math.round(((1 - v - k) / (1 - k)) * 100);
  return [part(c.r), part(c.g), part(c.b), Math.round(k * 100)];
}

/** CIELAB with a D65 white point, the usual space for colour differences of screen colours. */
export function toLab(c: Color): Vec3 {
  const [x, y, z] = multiply(LIN_SRGB_TO_XYZ, [decodeSrgb(c.r), decodeSrgb(c.g), decodeSrgb(c.b)]);
  const f = (t: number) => (t > EPSILON ? Math.cbrt(t) : (KAPPA * t + 16) / 116);
  const fx = f(x / D65_WHITE[0]);
  const fy = f(y / D65_WHITE[1]);
  const fz = f(z / D65_WHITE[2]);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export const chroma = (c: Color) => {
  const [, a, b] = toLab(c);
  return Math.hypot(a, b);
};

/** CIEDE2000 between two Lab colours. */
export function deltaE2000Lab([l1, a1, b1]: Vec3, [l2, a2, b2]: Vec3): number {
  const rad = Math.PI / 180;
  const c1 = Math.hypot(a1, b1);
  const c2 = Math.hypot(a2, b2);
  const cBar = (c1 + c2) / 2;
  const g = 0.5 * (1 - Math.sqrt(cBar ** 7 / (cBar ** 7 + 25 ** 7)));
  const a1p = a1 * (1 + g);
  const a2p = a2 * (1 + g);
  const c1p = Math.hypot(a1p, b1);
  const c2p = Math.hypot(a2p, b2);
  const hue = (a: number, b: number) => (a === 0 && b === 0 ? 0 : ((Math.atan2(b, a) / rad) % 360 + 360) % 360);
  const h1p = hue(a1p, b1);
  const h2p = hue(a2p, b2);

  const dL = l2 - l1;
  const dC = c2p - c1p;
  let dh = 0;
  if (c1p * c2p !== 0) {
    dh = h2p - h1p;
    if (dh > 180) dh -= 360;
    else if (dh < -180) dh += 360;
  }
  const dH = 2 * Math.sqrt(c1p * c2p) * Math.sin((dh / 2) * rad);

  const lBar = (l1 + l2) / 2;
  const cBarP = (c1p + c2p) / 2;
  let hBar = h1p + h2p;
  if (c1p * c2p !== 0) {
    if (Math.abs(h1p - h2p) <= 180) hBar /= 2;
    else hBar = h1p + h2p < 360 ? (hBar + 360) / 2 : (hBar - 360) / 2;
  }
  const t =
    1 -
    0.17 * Math.cos((hBar - 30) * rad) +
    0.24 * Math.cos(2 * hBar * rad) +
    0.32 * Math.cos((3 * hBar + 6) * rad) -
    0.2 * Math.cos((4 * hBar - 63) * rad);
  const sl = 1 + (0.015 * (lBar - 50) ** 2) / Math.sqrt(20 + (lBar - 50) ** 2);
  const sc = 1 + 0.045 * cBarP;
  const sh = 1 + 0.015 * cBarP * t;
  const dTheta = 30 * Math.exp(-(((hBar - 275) / 25) ** 2));
  const rc = 2 * Math.sqrt(cBarP ** 7 / (cBarP ** 7 + 25 ** 7));
  const rt = -Math.sin(2 * dTheta * rad) * rc;
  return Math.sqrt((dL / sl) ** 2 + (dC / sc) ** 2 + (dH / sh) ** 2 + rt * (dC / sc) * (dH / sh));
}

export const deltaE = (a: Color, b: Color) => deltaE2000Lab(toLab(a), toLab(b));

/** WCAG relative luminance. */
export const luminance = (c: Color) => 0.2126 * decodeSrgb(c.r) + 0.7152 * decodeSrgb(c.g) + 0.0722 * decodeSrgb(c.b);

/** WCAG contrast ratio, from 1 to 21. */
export function contrastRatio(a: Color, b: Color): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}
