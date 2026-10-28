/**
 * The brandbook as data. It holds facts read from the site and proposals marked as such, but no
 * sentences: the report templates write them in the chosen language.
 */
export interface Brandbook {
  schemaVersion: 1;
  url: string;
  host: string;
  name: string;
  mode: 'cli' | 'online';
  generatedAt: string;
  /** Addresses of the pages that were read */
  pages: string[];
  /** Sections that are approximate in this mode, e.g. screenshots online */
  approximate: string[];
  siteLanguage: string;
  logo: LogoSection;
  colors: ColorSection;
  typography: TypographySection;
  ui: UiSection;
  tone: ToneSection;
  dark: DarkSection | null;
  consistency: Suggestion[];
}

export type ColorRole = 'background' | 'text' | 'accent' | 'line' | 'state' | 'neutral';

export interface Swatch {
  /** Display name: the token name without its prefix, or a colour name when the site has no tokens */
  name: string;
  token: string | null;
  hex: string;
  rgb: [number, number, number];
  cmyk: [number, number, number, number];
  role: ColorRole;
  /** Share of this colour within its own kind (backgrounds, text or lines) */
  share: number;
  /** Weighted share across the whole page, for the proportion bar */
  use: number;
  dark: string | null;
  nameSource: 'token' | 'palette';
}

export interface ColorSection {
  base: string;
  hasTokens: boolean;
  groups: Partial<Record<ColorRole, Swatch[]>>;
  proportions: { name: string; hex: string; use: number }[];
  contrast: {
    texts: string[];
    backgrounds: string[];
    cells: { text: string; background: string; textHex: string; backgroundHex: string; ratio: number; level: 'AA' | 'AA-large' | 'fail' }[];
  };
}

export interface LogoVariant {
  kind: 'lockup' | 'mark' | 'icon' | 'share';
  /** The file on the site, or null for an SVG drawn in the page's own code */
  src: string | null;
  /** More files drawn on top of `src` in the same box, when the site builds its logo from layers */
  layers: string[];
  svg: string | null;
  background: 'light' | 'dark';
  width: number;
  height: number;
  label: string | null;
}

export interface LogoFile {
  url: string | null;
  what: 'logo' | 'inline-svg' | 'favicon' | 'apple-touch-icon' | 'manifest-icon' | 'share-image' | 'organization-logo';
}

export interface LogoSection {
  found: boolean;
  variants: LogoVariant[];
  files: LogoFile[];
  colors: Swatch[];
  proposals: {
    proposal: true;
    clearSpaceRatio: number;
    clearSpacePx: number;
    minWidthPx: number;
    markMinPx: number;
    prohibitions: string[];
  } | null;
}

export interface FontFamily {
  name: string;
  share: number;
  source: 'google' | 'adobe' | 'bunny' | 'self' | 'other' | 'unknown';
  hosts: string[];
  loaded: boolean;
  /** From Google Fonts or on the list of open-licensed families; for others the licence is not known */
  openLicence: boolean;
  files: string[];
}

export interface TextStyle {
  key: 'h1' | 'h2' | 'h3' | 'p' | 'a';
  family: string;
  weight: number;
  sizePx: number;
  /** Line height as a multiple of the size; null for `normal` */
  lineHeight: number | null;
  /** Letter spacing as a percentage of the size; null for `normal` */
  letterSpacing: number | null;
  transform: string;
  color: string;
  sample: string;
}

export interface TypographySection {
  heading: string | null;
  body: string | null;
  families: FontFamily[];
  styles: TextStyle[];
  weights: number[];
  sizes: number[];
  unused: string[];
}

export interface ButtonStyle {
  kind: 'primary' | 'secondary';
  /** Position in the homepage's button list, which names its screenshot (`button-<index>`) */
  index: number;
  text: string;
  background: string | null;
  gradient: boolean;
  color: string;
  border: string | null;
  radius: string;
  family: string;
  sizePx: number;
  weight: number;
  shadow: boolean;
  transform: string;
}

export interface UiSection {
  buttons: ButtonStyle[];
  radii: string[];
  shadows: string[];
  character: {
    proposal: true;
    theme: 'light' | 'dark';
    contrast: 'high' | 'medium' | 'low';
    saturation: 'muted' | 'moderate' | 'vivid';
    corners: 'sharp' | 'rounded' | 'pill';
    glass: boolean;
    gradients: boolean;
    hasDarkTheme: boolean;
  };
}

export interface ToneSection {
  language: string;
  address: 'informal' | 'formal' | 'impersonal' | 'unknown';
  averageSentenceWords: number | null;
  headingCase: 'sentence' | 'title' | 'upper' | 'mixed' | 'unknown';
  examples: string[];
  ctas: string[];
}

export interface DarkSection {
  /** How the dark theme turns on: the system setting, or a switch on the page */
  trigger: 'system' | 'toggle';
  toggle: string | null;
  base: string;
  swatches: Swatch[];
}

export type Suggestion =
  | { kind: 'near-colors'; pairs: { a: string; b: string; deltaE: number }[] }
  | { kind: 'stray-colors'; colors: { hex: string; share: number }[] }
  | { kind: 'unused-fonts'; families: string[] }
  | { kind: 'many-sizes'; count: number }
  | { kind: 'many-radii'; count: number }
  | { kind: 'theme-color'; themeColor: string; base: string }
  | { kind: 'pages-differ'; page: string; fonts: string[]; buttons: string[] };
