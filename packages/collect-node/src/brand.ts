import { lookup } from 'node:dns/promises';
import {
  brandButtons,
  chooseLogo,
  extractPage,
  familyName,
  isBotCheck,
  keyPages,
  logoRules,
  themeToggles,
  uiRules,
  type ExtractOptions,
  type Box,
  type RawAsset,
  type RawBrand,
  type RawManifest,
  type RawPage,
} from '@sitelens/brand';
import { preflight } from '@sitelens/crawl';
import type { Browser, BrowserContext, BrowserContextOptions, Page } from 'playwright-core';
import { fetchPage, USER_AGENT } from './http';
import { userAgentFor } from './render';

export type BrandStage = 'fetch' | 'pages' | 'dark' | 'mobile' | 'logo';

export interface BrandProgress {
  stage: BrandStage;
  done: number;
  total: number;
  url?: string;
}

export interface BrandCollectOptions {
  url: string;
  browser: Browser;
  /** Key pages beyond the homepage, for the consistency checks */
  pages: number;
  sitelensVersion: string;
  onProgress?: (progress: BrandProgress) => void;
  onWarning?: (message: string) => void;
}

export interface BrandCollection {
  raw: RawBrand;
  /** The logo, icon and share-image files as the site serves them, for the package */
  files: Map<string, Buffer>;
  /**
   * Screenshots: `desktop`, `mobile` and `dark` views, `nav`, `logo`, `button-<index>` and
   * `type-<h1|h2|h3|p|a>` elements
   */
  shots: Map<string, Buffer>;
}

/** A font file of an open-licensed family, only ever embedded in the PDF, never put in the package. */
export interface BrandFontFile {
  family: string;
  weight: string;
  style: string;
  unicodeRange: string | null;
  url: string;
  bytes: Buffer;
}

/** The page is a bot check (Cloudflare, DataDome…), so there is nothing of the brand to read. */
export class BotCheckError extends Error {
  constructor(readonly url: string) {
    super(`${url} answered with a bot check instead of the page`);
  }
}

const EXTRACT = {
  logoHint: logoRules.hint,
  consent: uiRules.consent,
  skipLink: uiRules.skipLink,
  maxHeight: 8_000,
  sampleStep: 24,
} satisfies Omit<ExtractOptions, 'scheme'>;
const ASSET_MAX_BYTES = 2_000_000;

const resolves = (hostname: string) =>
  lookup(hostname).then(
    () => true,
    () => false,
  );

async function openPage(context: BrowserContext, url: string): Promise<Page> {
  const page = await context.newPage();
  const response = await page.goto(url, { waitUntil: 'load', timeout: 45_000 });
  if (response && response.status() >= 400)
    throw new Error(`the server answered the browser with HTTP ${response.status()} for ${url}`);
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);
  if (isBotCheck(await page.title(), await page.content())) throw new BotCheckError(url);
  // Lazy sections and their fonts only arrive when a visitor scrolls down
  await page.evaluate(async () => {
    const step = innerHeight * 0.9;
    for (let y = 0, i = 0; y < document.documentElement.scrollHeight && i < 12; y += step, i++) {
      scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    scrollTo(0, 0);
  });
  // Headers that hide while scrolling down come back on a real upward scroll, not on scrollTo
  await page.mouse.wheel(0, -600);
  await page.waitForLoadState('networkidle', { timeout: 3_000 }).catch(() => undefined);
  await page.evaluate(() =>
    Promise.race([
      Promise.all([
        document.fonts.ready,
        ...document
          .getAnimations()
          .filter((animation) => animation.effect?.getComputedTiming().endTime !== Infinity)
          .map((animation) => animation.finished.catch(() => undefined)),
      ]),
      new Promise((resolve) => setTimeout(resolve, 3_000)),
    ]),
  );
  return page;
}

async function shot(page: Page, box: Box | undefined, limit: { width: number; height: number }, pad = 6) {
  if (!box || box[2] < 2 || box[3] < 2) return null;
  const [x, y, width, height] = box;
  const clip = {
    x: Math.max(0, x - pad),
    y: Math.max(0, y - pad),
    width: Math.min(width + pad * 2, limit.width),
    height: Math.min(height + pad * 2, limit.height),
  };
  try {
    return await page.screenshot({ clip, fullPage: true, type: 'png', animations: 'disabled' });
  } catch {
    // An element that moved or a page that is too tall to capture leaves this one picture out
    return null;
  }
}

const view = (page: Page) => page.screenshot({ type: 'jpeg', quality: 82, animations: 'disabled' });

const extract = (page: Page, scheme: 'light' | 'dark', toggle?: string) =>
  page.evaluate(extractPage, { ...EXTRACT, scheme, ...(toggle ? { toggle } : {}) });

/** The same tokens and page colours: the pass did not switch the theme. */
const sameTheme = (a: RawPage, b: RawPage) =>
  a.base.bodyBackground === b.base.bodyBackground &&
  a.base.htmlBackground === b.base.htmlBackground &&
  JSON.stringify(a.tokens) === JSON.stringify(b.tokens);

async function fetchAsset(url: string): Promise<{ asset: RawAsset; bytes: Buffer } | null> {
  try {
    const response = await fetch(url, {
      headers: { 'user-agent': USER_AGENT },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > ASSET_MAX_BYTES) return null;
    const contentType = response.headers.get('content-type') ?? '';
    const isSvg = /svg/i.test(contentType) || /\.svg(\?|$)/i.test(url);
    return { asset: { url, contentType, size: bytes.length, text: isSvg ? bytes.toString('utf8') : null }, bytes };
  } catch {
    return null;
  }
}

async function readManifest(url: string | null): Promise<RawManifest | null> {
  if (!url) return null;
  try {
    const response = await fetch(url, { headers: { 'user-agent': USER_AGENT }, signal: AbortSignal.timeout(10_000) });
    if (!response.ok) return null;
    const data = (await response.json()) as Record<string, unknown>;
    const icons = Array.isArray(data.icons) ? (data.icons as Record<string, unknown>[]) : [];
    const text = (key: string) => (typeof data[key] === 'string' ? (data[key] as string) : null);
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
  } catch {
    return null;
  }
}

/**
 * Opens the site in Chromium like a visitor (1440 px and 390 px, light and dark) and reads the
 * brand from the rendered pages. Collection only; the analysis is `analyseBrand`.
 */
export async function collectBrand(options: BrandCollectOptions): Promise<BrandCollection> {
  const { browser, onProgress, onWarning } = options;
  const startedAt = new Date().toISOString();
  onProgress?.({ stage: 'fetch', done: 0, total: 1 });
  const pre = await preflight(options.url, { fetcher: fetchPage, resolves });
  const homeUrl = pre.homepage.finalUrl;
  const userAgent = await userAgentFor(browser);
  const network = { fonts: new Set<string>(), stylesheets: new Set<string>() };
  const base: BrowserContextOptions = {
    userAgent,
    extraHTTPHeaders: { 'accept-language': 'pl,en;q=0.8' },
    // Content that fades in while scrolling stays visible this way, as it does for people who turned motion off
    reducedMotion: 'reduce',
  };

  const desktop = await browser.newContext({ ...base, viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
  desktop.on('response', (response) => {
    const type = response.request().resourceType();
    if (type === 'font') network.fonts.add(response.url());
    else if (type === 'stylesheet') network.stylesheets.add(response.url());
  });
  const shots = new Map<string, Buffer>();
  const keep = (name: string, image: Buffer | null) => image && shots.set(name, image);
  try {
    const homePage = await openPage(desktop, homeUrl);
    const light = await extract(homePage, 'light');
    keep('desktop', await view(homePage));
    keep('nav', light.nav ? await shot(homePage, light.nav.box, { width: 1440, height: 160 }, 0) : null);
    const logo = chooseLogo(light);
    if (logo?.visible) keep('logo', await shot(homePage, logo.box, { width: 900, height: 300 }, 8));
    for (const button of brandButtons(light).slice(0, 4))
      keep(`button-${light.buttons.indexOf(button)}`, await shot(homePage, button.box, { width: 600, height: 160 }));
    for (const [key, style] of Object.entries(light.textStyles))
      keep(`type-${key}`, await shot(homePage, style?.box, { width: 1100, height: 240 }, 2));

    const pages: RawPage[] = [];
    const targets = keyPages(light, options.pages);
    for (const [index, url] of targets.entries()) {
      onProgress?.({ stage: 'pages', done: index, total: targets.length, url });
      try {
        const page = await openPage(desktop, url);
        pages.push(await extract(page, 'light'));
        await page.close();
      } catch (error) {
        if (error instanceof BotCheckError) throw error;
        onWarning?.(`${url}: ${(error as Error).message}`);
      }
    }

    onProgress?.({ stage: 'dark', done: 0, total: 1 });
    let dark: RawPage | null = null;
    const darkContext = await browser.newContext({ ...base, viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
    try {
      const darkPage = await openPage(darkContext, homeUrl);
      dark = await extract(darkPage, 'dark');
      if (sameTheme(light, dark)) {
        dark = null;
        for (const toggle of themeToggles(light.themeSelectors)) {
          await darkPage.evaluate(({ attribute, value }) => {
            const root = document.documentElement;
            if (attribute === 'class') root.classList.add(value);
            else root.setAttribute(attribute, value);
          }, toggle);
          await darkPage.waitForTimeout(400);
          const label = toggle.attribute === 'class' ? `class="${toggle.value}"` : `${toggle.attribute}="${toggle.value}"`;
          const switched = await extract(darkPage, 'dark', label);
          if (!sameTheme(light, switched)) {
            dark = switched;
            break;
          }
        }
      }
      if (dark) keep('dark', await view(darkPage));
    } catch (error) {
      onWarning?.(`dark theme: ${(error as Error).message}`);
    } finally {
      await darkContext.close();
    }

    onProgress?.({ stage: 'mobile', done: 0, total: 1 });
    let mobile: RawPage | null = null;
    const phone = await browser.newContext({
      ...base,
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      colorScheme: 'light',
    });
    try {
      const phonePage = await openPage(phone, homeUrl);
      mobile = await extract(phonePage, 'light');
      keep('mobile', await view(phonePage));
    } catch (error) {
      onWarning?.(`phone: ${(error as Error).message}`);
    } finally {
      await phone.close();
    }

    onProgress?.({ stage: 'logo', done: 0, total: 1 });
    const manifest = await readManifest(light.meta.manifest);
    const logoUrls = [...light.logos, ...(dark?.logos ?? [])].filter((l) => l.src).map((l) => l.src!);
    const iconUrls = light.meta.icons.map((i) => i.href);
    const urls = [
      ...new Set(
        [...logoUrls, ...iconUrls, light.meta.ogImage, light.meta.organization?.logo, ...(manifest?.icons ?? []).map((i) => i.src)].filter(
          (u): u is string => Boolean(u && /^https?:/.test(u)),
        ),
      ),
    ].slice(0, 16);
    const assets: RawAsset[] = [];
    const files = new Map<string, Buffer>();
    for (const url of urls) {
      const fetched = await fetchAsset(url);
      if (!fetched) continue;
      assets.push(fetched.asset);
      files.set(url, fetched.bytes);
    }

    return {
      raw: {
        url: options.url,
        mode: 'cli',
        startedAt,
        home: { light, dark, mobile },
        pages,
        network: { fonts: [...network.fonts], stylesheets: [...network.stylesheets] },
        assets,
        manifest,
        versions: { sitelens: options.sitelensVersion, chromium: browser.version() },
      },
      files,
      shots,
    };
  } finally {
    await desktop.close();
  }
}

const FONT_BUDGET_BYTES = 4_000_000;
const FONT_SERVICES = /^fonts\.(googleapis\.com|bunny\.net)$/;
// Google and Bunny split each weight into script subsets; Latin covers Polish and English
const LATIN = /^(latin|latin-ext)$/;

function fontFaceRules(css: string): { subset: string | null; body: string }[] {
  return [...css.matchAll(/(?:\/\*\s*([\w-]+)\s*\*\/\s*)?@font-face\s*{([^}]*)}/g)].map((m) => ({
    subset: m[1] ?? null,
    body: m[2]!,
  }));
}

const property = (body: string, name: string) =>
  new RegExp(`${name}\\s*:\\s*([^;]+);?`, 'i').exec(body)?.[1]?.trim().replace(/^["']|["']$/g, '') ?? null;

/**
 * Downloads the files of the given families so the PDF can be set in the brand's own typefaces.
 * Call it only for open-licensed families; the files stay in memory and never join the package.
 */
export async function downloadFonts(raw: RawBrand, families: string[], userAgent: string): Promise<BrandFontFile[]> {
  const wanted = new Set(families.map((f) => f.toLowerCase()));
  const out: BrandFontFile[] = [];
  const seen = new Set<string>();
  let total = 0;
  const add = async (face: Omit<BrandFontFile, 'bytes'>) => {
    if (seen.has(face.url) || total > FONT_BUDGET_BYTES) return;
    seen.add(face.url);
    const fetched = await fetchAsset(face.url);
    if (!fetched) return;
    total += fetched.bytes.length;
    out.push({ ...face, bytes: fetched.bytes });
  };

  for (const face of raw.home.light.fontFaces) {
    const family = familyName(face.family);
    if (!wanted.has(family.toLowerCase())) continue;
    const url = face.sources.find((u) => /\.woff2(\?|#|$)/i.test(u)) ?? face.sources[0];
    if (url) await add({ family, weight: face.weight, style: face.style, unicodeRange: null, url });
  }

  for (const href of raw.network.stylesheets) {
    if (!FONT_SERVICES.test(new URL(href).hostname)) continue;
    let css: string;
    try {
      const response = await fetch(href, { headers: { 'user-agent': userAgent }, signal: AbortSignal.timeout(10_000) });
      if (!response.ok) continue;
      css = await response.text();
    } catch {
      continue;
    }
    for (const { subset, body } of fontFaceRules(css)) {
      const family = property(body, 'font-family');
      const url = /url\(\s*["']?([^"')]+)["']?\s*\)/.exec(body)?.[1];
      if (!family || !url || !wanted.has(family.toLowerCase()) || (subset && !LATIN.test(subset))) continue;
      await add({
        family,
        weight: property(body, 'font-weight') ?? '400',
        style: property(body, 'font-style') ?? 'normal',
        unicodeRange: property(body, 'unicode-range'),
        url: new URL(url, href).href,
      });
    }
  }
  return out;
}
