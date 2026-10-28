import {
  extractPage,
  isBotCheck,
  keyPages,
  logoRules,
  themeToggles,
  uiRules,
  type ExtractOptions,
  type RawAsset,
  type RawBrand,
  type RawManifest,
  type RawPage,
} from '@sitelens/brand';
import { FetchError, preflight, type Fetcher } from '@sitelens/crawl';
import { fetchAsset, proxyFetcher, type ProxySettings } from '../proxy';
import { PsiError, runPagespeed, screenshotFromLhr, type PsiProblem, type PsiSettings } from '../psi';
import { cssRefs, forceScheme, rewriteCss } from './css';
import { FRAME_CSP, sanitizeHtml } from './sanitize';

export type BrandOnlineStage = 'page' | 'styles' | 'render' | 'pages' | 'screenshots';

export interface BrandOnlineProgress {
  stage: BrandOnlineStage;
  done: number;
  total: number;
  url?: string;
}

export interface BrandOnlineOptions {
  url: string;
  /** Key pages beyond the homepage, for the consistency checks */
  pages: number;
  proxy: ProxySettings;
  psi: PsiSettings;
  /** An element off screen where the frames are laid out */
  stage: HTMLElement;
  sitelensVersion: string;
  onProgress?: (progress: BrandOnlineProgress) => void;
  onWarning?: (message: string) => void;
}

/** A font file the site uses, kept in memory so open-licensed families can be embedded in the PDF. */
export interface BrandOnlineFont {
  family: string;
  weight: string;
  style: string;
  unicodeRange: string | null;
  url: string;
  bytes: Uint8Array;
  type: string;
}

export interface BrandOnlineResult {
  raw: RawBrand;
  /** Logo, icon and share-image files by address, with their types */
  files: Map<string, Uint8Array>;
  types: Map<string, string>;
  /** `desktop` and `mobile` from PageSpeed Insights (JPEG), `nav` cut from the desktop one (PNG) */
  shots: Map<string, Uint8Array>;
  fonts: BrandOnlineFont[];
  /** Why PageSpeed Insights took no screenshots, when it did not */
  pagespeedProblem?: PsiProblem;
}

/** The page is a bot check (Cloudflare, DataDome…), so there is nothing of the brand to read. */
export class BotCheckError extends Error {
  constructor(readonly url: string) {
    super(`${url} answered with a bot check instead of the page`);
  }
}

// What one brandbook may download through the proxy, all files together
const BUDGET_BYTES = 5_000_000;
const MAX_IMPORT_DEPTH = 3;
const EXTRACT = { logoHint: logoRules.hint, consent: uiRules.consent, skipLink: uiRules.skipLink, maxHeight: 8_000, sampleStep: 24 };
// Script subsets other than Latin are never shown in a brandbook of a Polish or English site
const LATIN_RANGE = /U\+0{0,2}(0|20|41|100)\b|U\+0-/i;

const decoder = new TextDecoder();
const blobUrls: string[] = [];

/** Downloads through the proxy at most once per address and within the budget. */
class Loader {
  private spent = 0;
  private cache = new Map<string, Promise<{ bytes: Uint8Array; type: string } | null>>();
  private blobs = new Map<string, string>();
  /** The site's address of each blob: copy, to report fonts and logos under their real addresses */
  readonly origins = new Map<string, string>();
  readonly stylesheets = new Set<string>();

  constructor(private readonly settings: ProxySettings) {}

  get(url: string, kind: 'css' | 'font' | 'image') {
    let pending = this.cache.get(url);
    if (!pending) {
      pending =
        this.spent > BUDGET_BYTES
          ? Promise.resolve(null)
          : fetchAsset(this.settings, url, kind).then((asset) => {
              if (asset) this.spent += asset.bytes.length;
              return asset;
            });
      this.cache.set(url, pending);
    }
    return pending;
  }

  /** A blob: address the sandboxed frame may load, which shares this page's origin. */
  async blob(url: string, kind: 'font' | 'image'): Promise<string | null> {
    const known = this.blobs.get(url);
    if (known) return known;
    const asset = await this.get(url, kind);
    if (!asset) return null;
    const local = URL.createObjectURL(new Blob([asset.bytes as BlobPart], { type: asset.type }));
    blobUrls.push(local);
    this.blobs.set(url, local);
    this.origins.set(local, url);
    return local;
  }

  local(url: string): string | null {
    return this.blobs.get(url) ?? null;
  }
}

/** Frees the blob: copies of the last brandbook, once its frames are gone. */
export function releaseBrandFiles() {
  for (const url of blobUrls.splice(0)) URL.revokeObjectURL(url);
}

const property = (block: string, name: string) =>
  new RegExp(`${name}\\s*:\\s*([^;}]+)`, 'i').exec(block)?.[1]?.trim().replace(/^["']|["']$/g, '') ?? null;

/** Loads a stylesheet with its imports and Latin font files, and returns it rewritten for the frame. */
async function loadCss(
  url: string,
  loader: Loader,
  fonts: Map<string, Omit<BrandOnlineFont, 'bytes' | 'type'>>,
  depth = 0,
): Promise<string | null> {
  const asset = await loader.get(url, 'css');
  if (!asset) return null;
  loader.stylesheets.add(url);
  return prepareCss(decoder.decode(asset.bytes), url, loader, fonts, depth);
}

async function prepareCss(
  css: string,
  base: string,
  loader: Loader,
  fonts: Map<string, Omit<BrandOnlineFont, 'bytes' | 'type'>>,
  depth = 0,
): Promise<string> {
  const imports = new Map<string, string | null>();
  for (const ref of cssRefs(css, base))
    if (ref.kind === 'import' && depth < MAX_IMPORT_DEPTH) imports.set(ref.url, await loadCss(ref.url, loader, fonts, depth + 1));
  for (const [block] of css.matchAll(/@font-face\s*{[^}]*}/gi)) {
    const range = property(block, 'unicode-range');
    if (range && !LATIN_RANGE.test(range)) continue;
    const family = property(block, 'font-family');
    for (const ref of cssRefs(block, base)) {
      if (ref.kind !== 'font' || !(await loader.blob(ref.url, 'font'))) continue;
      if (family)
        fonts.set(ref.url, {
          family,
          weight: property(block, 'font-weight') ?? '400',
          style: property(block, 'font-style') ?? 'normal',
          unicodeRange: range,
          url: ref.url,
        });
      break;
    }
  }
  return rewriteCss(css, base, {
    imported: (href) => imports.get(href) ?? null,
    local: (href, kind) => (kind === 'font' ? loader.local(href) : null),
  });
}

const LOGO_HINT = new RegExp(logoRules.hint, 'i');

function looksLikeLogo(img: HTMLImageElement, pageUrl: string): boolean {
  const link = img.closest('a');
  const home = link ? /^\/([a-z]{2}(-[a-z]{2})?\/?)?$/i.test(new URL(link.href || '/', pageUrl).pathname) : false;
  const text = `${img.className} ${img.id} ${img.alt} ${img.getAttribute('src') ?? ''} ${link?.className ?? ''} ${link?.getAttribute('aria-label') ?? ''}`;
  return home || LOGO_HINT.test(text) || Boolean(img.closest('header, nav'));
}

/** The site's page as the frame shows it: sanitised, styles inlined, logos local, other pictures blank. */
async function frameHtml(
  html: string,
  pageUrl: string,
  scheme: 'light' | 'dark',
  loader: Loader,
  fonts: Map<string, Omit<BrandOnlineFont, 'bytes' | 'type'>>,
): Promise<string> {
  const doc = new DOMParser().parseFromString(sanitizeHtml(html, pageUrl, FRAME_CSP), 'text/html');
  for (const link of [...doc.querySelectorAll<HTMLLinkElement>('link[rel~="stylesheet" i]')]) {
    const css = await loadCss(link.getAttribute('href') ?? '', loader, fonts);
    if (css === null) {
      link.remove();
      continue;
    }
    const style = doc.createElement('style');
    style.dataset.sitelens = '';
    if (link.media) style.media = forceScheme(link.media, scheme);
    style.textContent = forceScheme(css, scheme);
    link.replaceWith(style);
  }
  for (const style of doc.querySelectorAll('style:not([data-sitelens])')) {
    style.textContent = forceScheme(await prepareCss(style.textContent ?? '', pageUrl, loader, fonts), scheme);
    if (style.getAttribute('media')) style.setAttribute('media', forceScheme(style.getAttribute('media')!, scheme));
  }
  for (const img of doc.querySelectorAll<HTMLImageElement>('img')) {
    const src = img.getAttribute('src');
    const local = src && /^https?:/.test(src) && looksLikeLogo(img, pageUrl) ? await loader.blob(src, 'image') : null;
    // A blank picture of the same size keeps the layout without loading other people's photos
    const blank = `data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${Number(img.getAttribute('width')) || 1}" height="${Number(img.getAttribute('height')) || 1}"/>`,
    )}`;
    img.setAttribute('src', local ?? blank);
    if (local) img.dataset.sitelensSrc = src!;
  }
  return `<!doctype html>\n${doc.documentElement.outerHTML}`;
}

async function settle(frame: HTMLIFrameElement) {
  await Promise.race([frame.contentDocument!.fonts.ready, new Promise((resolve) => setTimeout(resolve, 6_000))]);
  // The frame may run no script at all, so its frames are counted on this page, which paints with it
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

async function renderFrame(stage: HTMLElement, html: string, width: number): Promise<HTMLIFrameElement> {
  const frame = document.createElement('iframe');
  // Never allow-scripts next to allow-same-origin: with both, the page could lift the sandbox
  frame.setAttribute('sandbox', 'allow-same-origin');
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  frame.width = String(width);
  frame.height = '900';
  const loaded = new Promise((resolve) => frame.addEventListener('load', resolve, { once: true }));
  frame.srcdoc = html;
  stage.append(frame);
  await loaded;
  await settle(frame);
  return frame;
}

/** Puts the site's own addresses back where the frame saw blob: copies of logos and fonts. */
function withSiteAddresses(page: RawPage, frame: HTMLIFrameElement, loader: Loader): RawPage {
  const sources = new Map(loader.origins);
  for (const img of frame.contentDocument!.querySelectorAll<HTMLImageElement>('img[data-sitelens-src]'))
    sources.set(img.currentSrc || img.src, img.dataset.sitelensSrc!);
  const site = (url: string | null) => (url && sources.get(url)) ?? url;
  return {
    ...page,
    logos: page.logos.map((logo) => ({ ...logo, src: site(logo.src) })),
    fontFaces: page.fontFaces.map((face) => ({ ...face, sources: face.sources.map((url) => site(url)!) })),
  };
}

/** Icons and the manifest from the site's own HTML: the frame leaves them out, so it loads nothing for them. */
function linkedFiles(html: string, pageUrl: string): Pick<RawPage['meta'], 'icons' | 'manifest'> {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const absolute = (href: string | null) => {
    try {
      return href ? new URL(href, pageUrl).href : null;
    } catch {
      return null;
    }
  };
  return {
    icons: [...doc.querySelectorAll('link[rel~="icon" i], link[rel="apple-touch-icon" i], link[rel="mask-icon" i]')].map((l) => ({
      rel: l.getAttribute('rel') ?? '',
      href: absolute(l.getAttribute('href')) ?? '',
      sizes: l.getAttribute('sizes'),
      type: l.getAttribute('type'),
    })),
    manifest: absolute(doc.querySelector('link[rel="manifest"]')?.getAttribute('href') ?? null),
  };
}

function read(
  frame: HTMLIFrameElement,
  loader: Loader,
  page: { html: string; url: string },
  scheme: 'light' | 'dark',
  toggle?: string,
): RawPage {
  const options: ExtractOptions = { ...EXTRACT, scheme, pageUrl: page.url, ...(toggle ? { toggle } : {}) };
  const win = frame.contentWindow as Window & typeof globalThis;
  const raw = withSiteAddresses(extractPage(options, frame.contentDocument!, win), frame, loader);
  return { ...raw, meta: { ...raw.meta, ...linkedFiles(page.html, page.url) } };
}

const sameTheme = (a: RawPage, b: RawPage) =>
  a.base.bodyBackground === b.base.bodyBackground &&
  a.base.htmlBackground === b.base.htmlBackground &&
  JSON.stringify(a.tokens) === JSON.stringify(b.tokens);

async function readManifest(url: string | null, fetcher: Fetcher): Promise<RawManifest | null> {
  if (!url) return null;
  try {
    const data = JSON.parse((await fetcher(url, { maxBytes: 200_000 })).body) as Record<string, unknown>;
    const text = (key: string) => (typeof data[key] === 'string' ? (data[key] as string) : null);
    const icons = Array.isArray(data.icons) ? (data.icons as Record<string, unknown>[]) : [];
    return {
      name: text('name'),
      shortName: text('short_name'),
      themeColor: text('theme_color'),
      backgroundColor: text('background_color'),
      icons: icons
        .filter((i) => typeof i.src === 'string')
        .map((i) => ({
          src: new URL(i.src as string, url).href,
          sizes: typeof i.sizes === 'string' ? i.sizes : null,
          type: typeof i.type === 'string' ? i.type : null,
          purpose: typeof i.purpose === 'string' ? i.purpose : null,
        })),
    };
  } catch (error) {
    if (error instanceof FetchError || error instanceof SyntaxError) return null;
    throw error;
  }
}

function bytesOf(dataUri: string): Uint8Array {
  const binary = atob(dataUri.slice(dataUri.indexOf(',') + 1));
  return Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
}

/** The top of the desktop screenshot down to the bottom of the navigation, as PNG. */
async function cropNav(desktop: Uint8Array, nav: RawPage['nav']): Promise<Uint8Array | null> {
  if (!nav) return null;
  const image = await createImageBitmap(new Blob([desktop as BlobPart], { type: 'image/jpeg' }));
  // PageSpeed Insights lays the page out 1350 px wide on a computer; the frame used 1440
  const scale = image.width / 1350;
  const height = Math.round(Math.min(nav.box[1] + nav.box[3], 200) * scale);
  if (height < 8) return null;
  const canvas = new OffscreenCanvas(image.width, height);
  canvas.getContext('2d')!.drawImage(image, 0, 0);
  return new Uint8Array(await (await canvas.convertToBlob({ type: 'image/png' })).arrayBuffer());
}

/**
 * Collects the brand online: the pages come through the proxy and render in a sandboxed frame in
 * the visitor's browser, the screenshots come from PageSpeed Insights.
 */
export async function collectBrandOnline(options: BrandOnlineOptions): Promise<BrandOnlineResult> {
  const { stage, onProgress, onWarning } = options;
  const startedAt = new Date().toISOString();
  const fetcher = proxyFetcher(options.proxy);
  const loader = new Loader(options.proxy);
  const fonts = new Map<string, Omit<BrandOnlineFont, 'bytes' | 'type'>>();

  onProgress?.({ stage: 'page', done: 0, total: 1 });
  const pre = await preflight(options.url, { fetcher });
  const homeUrl = pre.homepage.finalUrl;
  const homeHtml = pre.homepage.body;
  const parsed = new DOMParser().parseFromString(homeHtml, 'text/html');
  if (isBotCheck(parsed.title, homeHtml)) throw new BotCheckError(homeUrl);
  for (const el of parsed.querySelectorAll('script, noscript, style, template')) el.remove();
  // A page whose server HTML has almost no text is built by JavaScript, which the frame does not run
  const limited = (parsed.body?.textContent ?? '').replace(/\s+/g, ' ').trim().length < 200;

  const shots = new Map<string, Uint8Array>();
  let pagespeedProblem: PsiProblem | undefined;
  const screenshots = Promise.all(
    (['desktop', 'mobile'] as const).map(async (strategy) => {
      try {
        const shot = screenshotFromLhr(await runPagespeed(homeUrl, strategy, { ...options.psi, performanceOnly: true }));
        if (shot) shots.set(strategy, bytesOf(shot));
      } catch (error) {
        if (!(error instanceof PsiError)) throw error;
        pagespeedProblem ??= error.problem;
      }
    }),
  );

  onProgress?.({ stage: 'styles', done: 0, total: 1 });
  const lightHtml = await frameHtml(homeHtml, homeUrl, 'light', loader, fonts);
  onProgress?.({ stage: 'render', done: 0, total: 1 });
  const frame = await renderFrame(stage, lightHtml, 1440);
  const home = { html: homeHtml, url: homeUrl };
  const light = read(frame, loader, home, 'light');
  frame.width = '390';
  await settle(frame);
  const mobile = read(frame, loader, home, 'light');
  frame.remove();

  const darkFrame = await renderFrame(stage, await frameHtml(homeHtml, homeUrl, 'dark', loader, fonts), 1440);
  let dark: RawPage | null = read(darkFrame, loader, home, 'dark');
  if (sameTheme(light, dark)) {
    dark = null;
    for (const toggle of themeToggles(light.themeSelectors)) {
      const root = darkFrame.contentDocument!.documentElement;
      if (toggle.attribute === 'class') root.classList.add(toggle.value);
      else root.setAttribute(toggle.attribute, toggle.value);
      await settle(darkFrame);
      const switched = read(darkFrame, loader, home, 'dark', toggle.attribute === 'class' ? `class="${toggle.value}"` : `${toggle.attribute}="${toggle.value}"`);
      if (!sameTheme(light, switched)) {
        dark = switched;
        break;
      }
    }
  }
  darkFrame.remove();

  const pages: RawPage[] = [];
  const targets = keyPages(light, options.pages);
  for (const [index, url] of targets.entries()) {
    onProgress?.({ stage: 'pages', done: index, total: targets.length, url });
    try {
      const page = await fetcher(url);
      if (page.status >= 400 || !/html/i.test(page.contentType ?? 'text/html')) continue;
      const pageFrame = await renderFrame(stage, await frameHtml(page.body, page.finalUrl, 'light', loader, fonts), 1440);
      pages.push(read(pageFrame, loader, { html: page.body, url: page.finalUrl }, 'light'));
      pageFrame.remove();
    } catch (error) {
      if (!(error instanceof FetchError)) throw error;
      onWarning?.(`${url}: ${error.message}`);
    }
  }

  onProgress?.({ stage: 'screenshots', done: 0, total: 1 });
  const manifest = await readManifest(light.meta.manifest, fetcher);
  const wanted = [
    ...[...light.logos, ...(dark?.logos ?? [])].map((l) => l.src),
    ...light.meta.icons.map((i) => i.href),
    light.meta.ogImage,
    light.meta.organization?.logo,
    ...(manifest?.icons ?? []).map((i) => i.src),
  ].filter((u): u is string => Boolean(u && /^https?:/.test(u)));
  const assets: RawAsset[] = [];
  const files = new Map<string, Uint8Array>();
  const types = new Map<string, string>();
  for (const url of [...new Set(wanted)].slice(0, 16)) {
    const asset = await loader.get(url, 'image');
    if (!asset) continue;
    files.set(url, asset.bytes);
    types.set(url, asset.type);
    assets.push({ url, contentType: asset.type, size: asset.bytes.length, text: /svg/.test(asset.type) ? decoder.decode(asset.bytes) : null });
  }

  await screenshots;
  const desktop = shots.get('desktop');
  const nav = desktop ? await cropNav(desktop, light.nav) : null;
  if (nav) shots.set('nav', nav);

  const fontFiles: BrandOnlineFont[] = [];
  for (const face of fonts.values()) {
    const asset = await loader.get(face.url, 'font');
    if (asset) fontFiles.push({ ...face, bytes: asset.bytes, type: asset.type });
  }

  return {
    raw: {
      url: options.url,
      mode: 'online',
      startedAt,
      home: { light, dark, mobile },
      pages,
      network: { fonts: [...fonts.keys()], stylesheets: [...loader.stylesheets] },
      assets,
      manifest,
      versions: { sitelens: options.sitelensVersion },
      ...(limited ? { limited: true } : {}),
    },
    files,
    types,
    shots,
    fonts: fontFiles,
    pagespeedProblem,
  };
}
