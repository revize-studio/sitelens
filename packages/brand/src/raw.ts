/** What `extractPage` reads from one rendered page. Plain JSON, so it crosses page.evaluate and postMessage. */
export interface RawPage {
  url: string;
  viewport: { width: number; height: number };
  scheme: 'light' | 'dark';
  /** The theme switch that was flipped for this pass, e.g. `data-theme=dark`, when the system setting was not enough */
  toggle?: string;
  meta: RawMeta;
  base: { htmlBackground: string; bodyBackground: string; color: string; colorScheme: string };
  tokens: RawToken[];
  /** Selectors of rules that set tokens for a theme, e.g. `:root[data-theme="dark"]` */
  themeSelectors: string[];
  darkMedia: boolean;
  usage: RawUsage;
  textStyles: Partial<Record<'h1' | 'h2' | 'h3' | 'p' | 'a', RawTextStyle>>;
  fontFaces: RawFontFace[];
  logos: RawLogo[];
  buttons: RawButton[];
  nav: { box: Box; links: { text: string; href: string }[] } | null;
  /** Links to other pages of the site from the header, navigation and footer, in page order */
  siteLinks: string[];
  texts: { headings: { level: number; text: string; transform: string }[]; paragraphs: string[] };
  effects: { glass: number; gradients: number };
  bodyTextLength: number;
  pageHeight: number;
}

export interface RawMeta {
  title: string;
  description: string | null;
  lang: string;
  themeColors: { content: string; media: string | null }[];
  ogImage: string | null;
  ogTitle: string | null;
  siteName: string | null;
  icons: { rel: string; href: string; sizes: string | null; type: string | null }[];
  manifest: string | null;
  organization: { name: string | null; logo: string | null } | null;
}

export interface RawToken {
  name: string;
  value: string;
  /** Read from a stylesheet rule, or only found in the computed style (a stylesheet the page could not read) */
  source: 'css' | 'computed';
}

/** Weights keyed by the computed CSS value. */
export interface RawUsage {
  /** Visible background at grid points: the colours from the last opaque layer up, joined with `|`; `base` when nothing covers the page */
  background: Record<string, number>;
  text: Record<string, number>;
  border: Record<string, number>;
  radius: Record<string, number>;
  shadow: Record<string, number>;
  font: Record<string, number>;
  size: Record<string, number>;
  weight: Record<string, number>;
}

export interface RawTextStyle {
  text: string;
  box: Box;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
  color: string;
  textTransform: string;
}

export interface RawFontFace {
  family: string;
  weight: string;
  style: string;
  status: string;
  sources: string[];
}

export type Box = [x: number, y: number, width: number, height: number];

export interface RawLogo {
  kind: 'img' | 'svg' | 'css';
  src: string | null;
  svg: string | null;
  alt: string | null;
  label: string | null;
  hint: boolean;
  visible: boolean;
  area: 'header' | 'nav' | 'footer' | 'main' | 'other';
  inHomeLink: boolean;
  box: Box;
  /** The file's own size (natural size, or the SVG viewBox), which tells a mark from a lockup better than the box */
  natural: [width: number, height: number] | null;
  /** Fill and stroke colours of an inline SVG, weighted by shape area */
  fills: Record<string, number>;
  /** The backgrounds behind the logo, from the last opaque one up */
  behind: string[];
}

export interface RawButton {
  text: string;
  box: Box;
  emphasis: number;
  inNav: boolean;
  inHeader: boolean;
  isTab: boolean;
  /** Inside a cookie banner or another consent tool, which is not part of the brand */
  inConsent: boolean;
  style: {
    background: string;
    backgroundImage: string;
    color: string;
    borderWidth: string;
    borderStyle: string;
    borderColor: string;
    radius: string;
    paddingBlock: string;
    paddingInline: string;
    fontFamily: string;
    fontSize: string;
    fontWeight: string;
    letterSpacing: string;
    textTransform: string;
    shadow: string;
  };
}

/** Everything collected for one brandbook, in the CLI or online. */
export interface RawBrand {
  url: string;
  mode: 'cli' | 'online';
  startedAt: string;
  home: { light: RawPage; dark: RawPage | null; mobile: RawPage | null };
  /** Key pages beyond the homepage, for consistency checks */
  pages: RawPage[];
  /** Font and stylesheet files the pages loaded */
  network: { fonts: string[]; stylesheets: string[] };
  /** Logo, icon and image files fetched from the site; SVGs keep their source text */
  assets: RawAsset[];
  manifest: RawManifest | null;
  versions: Record<string, string>;
  /** Online, a page built by JavaScript renders almost empty in the frame; the brandbook says so */
  limited?: boolean;
}

export interface RawAsset {
  url: string;
  contentType: string;
  size: number;
  text: string | null;
}

export interface RawManifest {
  name: string | null;
  shortName: string | null;
  themeColor: string | null;
  backgroundColor: string | null;
  icons: { src: string; sizes: string | null; type: string | null; purpose: string | null }[];
}
