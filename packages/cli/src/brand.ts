import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { analyseBrand, isOpenFont, type Brandbook } from '@sitelens/brand';
import {
  BotCheckError,
  collectBrand,
  downloadFonts,
  findBrowser,
  launchBrowser,
  PreflightError,
  renderPdf,
  userAgentFor,
  type BrandCollection,
} from '@sitelens/collect-node';
import { brandbookPackage, renderBrandbook, renderInteractiveBrandbook, type BrandbookAssets } from '@sitelens/report';
import { zipSync } from 'fflate';
import type { BrandFormat } from './args';
import { brandbookFonts } from './assets';
import { preflightMessage, type Messages } from './messages';
import { createProgress, fileLink, paint } from './ui';

export interface BrandOptions {
  url: string;
  lang: 'pl' | 'en';
  pages: number;
  out?: string;
  formats: BrandFormat[];
  version: string;
}

export type BrandResult = 'ok' | 'site-unavailable' | 'environment';

const TYPES: Record<string, string> = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
};

const dataUri = (bytes: Buffer, type: string) => `data:${type};base64,${bytes.toString('base64')}`;
// The site's own content-type goes into a data: URI, so only a plain type/subtype is taken from it
function typeOf(url: string, contentType?: string): string {
  const declared = contentType?.split(';')[0]?.trim().toLowerCase();
  if (declared && /^[a-z]+\/[a-z0-9.+-]+$/.test(declared)) return declared;
  return TYPES[extname(new URL(url).pathname).toLowerCase()] ?? 'application/octet-stream';
}

/** The families worth embedding in the PDF: the ones the brandbook shows, under an open licence. */
function embeddable(book: Brandbook): string[] {
  const shown = new Set([book.typography.heading, book.typography.body, ...book.typography.styles.map((s) => s.family)]);
  return book.typography.families.filter((f) => shown.has(f.name) && (f.openLicence || isOpenFont(f.name))).map((f) => f.name);
}

async function assetsFor(collection: BrandCollection, book: Brandbook, userAgent: string, withFonts: boolean): Promise<BrandbookAssets> {
  const images: Record<string, string> = {};
  for (const [name, bytes] of collection.shots) images[name] = dataUri(bytes, name === 'desktop' || name === 'mobile' || name === 'dark' ? 'image/jpeg' : 'image/png');
  for (const asset of collection.raw.assets) {
    const bytes = collection.files.get(asset.url);
    if (bytes) images[asset.url] = dataUri(bytes, typeOf(asset.url, asset.contentType));
  }
  // Only the PDF embeds brand typefaces; the HTML page shows pictures of the type instead
  const fonts = withFonts ? await downloadFonts(collection.raw, embeddable(book), userAgent) : [];
  return {
    ...brandbookFonts(),
    brandFonts: fonts.map((f) => ({
      family: f.family,
      weight: f.weight,
      style: f.style,
      unicodeRange: f.unicodeRange,
      src: dataUri(f.bytes, typeOf(f.url)),
    })),
    images,
  };
}

function writePackage(
  folder: string,
  collection: BrandCollection,
  book: Brandbook,
  options: BrandOptions,
  rendered: { pdf: Uint8Array | null; html: string | null },
) {
  const types = new Map(collection.raw.assets.map((a) => [a.url, typeOf(a.url, a.contentType)]));
  const entries = brandbookPackage(book, { files: collection.files, types, shots: collection.shots }, options.lang, {
    pdf: Boolean(rendered.pdf),
    html: Boolean(rendered.html),
    tokens: options.formats.includes('tokens'),
    json: options.formats.includes('json'),
  });
  if (rendered.html) entries.unshift({ path: 'brandbook.html', data: rendered.html });
  if (rendered.pdf) entries.unshift({ path: 'brandbook.pdf', data: rendered.pdf });
  for (const entry of entries) {
    mkdirSync(dirname(join(folder, entry.path)), { recursive: true });
    writeFileSync(join(folder, entry.path), entry.data);
  }
  if (options.formats.includes('zip')) {
    const encoder = new TextEncoder();
    const files = Object.fromEntries(
      entries.map((e) => [`${basename(folder)}/${e.path}`, typeof e.data === 'string' ? encoder.encode(e.data) : e.data]),
    );
    writeFileSync(`${folder}.zip`, zipSync(files, { level: 6 }));
  }
}

/** `sitelens brand <url>`: reads the brand from the live site and writes the brandbook package. */
export async function brand(options: BrandOptions, m: Messages): Promise<BrandResult> {
  const b = m.brand;
  const browserInfo = findBrowser();
  if (!browserInfo) {
    console.error(m.errors.noBrowser);
    return 'environment';
  }
  const warnings: string[] = [];
  const progress = createProgress(b.stages);
  const browser = await launchBrowser(browserInfo.path);
  const close = () => browser.close().catch(() => undefined);
  process.once('SIGINT', () => void close().then(() => process.exit(130)));

  try {
    const collection = await collectBrand({
      url: options.url,
      browser,
      pages: options.pages,
      sitelensVersion: options.version,
      onProgress: (p) => progress.update(p),
      onWarning: (message) => warnings.push(message),
    });
    progress.update({ stage: 'analysis', done: 0, total: 1 });
    const book = analyseBrand(collection.raw, { lang: options.lang });
    progress.update({ stage: 'report', done: 0, total: 1 });
    const folder = resolve(options.out ?? `brandbook-${book.host}`);
    const zipPath = `${folder}.zip`;
    try {
      mkdirSync(folder, { recursive: true });
      const rendered: { pdf: Uint8Array | null; html: string | null } = { pdf: null, html: null };
      const wantPdf = options.formats.includes('pdf');
      if (wantPdf || options.formats.includes('html')) {
        const assets = await assetsFor(collection, book, await userAgentFor(browser), wantPdf);
        if (options.formats.includes('html')) rendered.html = renderInteractiveBrandbook(book, assets, options.lang);
        if (wantPdf) {
          const path = join(folder, 'brandbook.pdf');
          await renderPdf(browser, renderBrandbook(book, assets, options.lang), path);
          rendered.pdf = readFileSync(path);
          rmSync(path);
        }
      }
      writePackage(folder, collection, book, options, rendered);
    } catch (error) {
      progress.stop();
      console.error(m.errors.write(folder, (error as Error).message));
      return 'environment';
    }
    progress.stop();

    if (!book.logo.found) console.log(paint('yellow', b.noLogo));
    const colors = Object.values(book.colors.groups).reduce((sum, list) => sum + list.length, 0);
    console.log(`\n${b.summary(book.name, colors, book.typography.families.slice(0, 3).map((f) => f.name))}`);
    console.log(`${paint('green', '✓')} ${b.saved}:\n  ${paint('cyan', fileLink(folder))}`);
    if (options.formats.includes('zip')) console.log(`  ${paint('cyan', fileLink(zipPath))}`);
    if (warnings.length) console.log(paint('dim', warnings.join('\n')));
    return 'ok';
  } catch (error) {
    progress.stop();
    if (error instanceof PreflightError) {
      console.error(paint('red', preflightMessage(error, m)));
      return 'site-unavailable';
    }
    if (error instanceof BotCheckError) {
      console.error(paint('red', b.errors.botCheck(error.url)));
      return 'site-unavailable';
    }
    throw error;
  } finally {
    await close();
  }
}
