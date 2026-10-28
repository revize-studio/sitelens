import { toCss, toDtcg, toTailwind, type Brandbook } from '@sitelens/brand';
import type { Lang } from '@sitelens/core';
import { brandbookStrings } from './i18n';

export interface PackageSources {
  /** Files from the site by address: logo, icons, share image */
  files: Map<string, Uint8Array>;
  /** Their content types by address, when the site sent one */
  types: Map<string, string>;
  /** Screenshots: `desktop`, `mobile` and `dark` as JPEG, `nav`, `logo` and `button-<index>` as PNG */
  shots: Map<string, Uint8Array>;
}

export interface PackageEntry {
  path: string;
  data: Uint8Array | string;
}

const EXTENSIONS: Record<string, string> = {
  'image/svg+xml': '.svg',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
  'image/x-icon': '.ico',
  'image/vnd.microsoft.icon': '.ico',
};

const extensionOf = (name: string) => /\.[a-z0-9]{1,5}$/i.exec(name)?.[0] ?? '';

/** A safe, unique file name for a file from the site, keeping its own name where it has one. */
function fileName(url: string, type: string | undefined, taken: Set<string>): string {
  const parsed = new URL(url);
  // Image services such as Next.js (/_next/image?url=/logo.png) name the original in a parameter
  const original = parsed.searchParams.get('url');
  const last = (original && /^\/[^?#]*\.[a-z0-9]{2,5}$/i.test(original) ? original : parsed.pathname).split('/').pop() ?? '';
  let name = decodeURIComponent(last).replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '') || 'plik';
  if (!extensionOf(name) && type && EXTENSIONS[type]) name += EXTENSIONS[type];
  const extension = extensionOf(name);
  const stem = name.slice(0, name.length - extension.length);
  for (let n = 2; taken.has(name); n++) name = `${stem}-${n}${extension}`;
  taken.add(name);
  return name;
}

// FNV-1a, enough to notice that two addresses served the same bytes
function fingerprint(bytes: Uint8Array): string {
  let hash = 0x811c9dc5;
  for (const byte of bytes) hash = Math.imul(hash ^ byte, 0x01000193) >>> 0;
  return `${bytes.length}:${hash}`;
}

/**
 * Everything of the brandbook package except the PDF and the HTML page, which the caller renders and
 * adds: tokens, logo files with their sources, screenshots and a README. Works in Node and in the browser.
 */
export function brandbookPackage(
  book: Brandbook,
  sources: PackageSources,
  lang: Lang,
  formats: { pdf: boolean; html: boolean; tokens: boolean; json: boolean },
): PackageEntry[] {
  const p = brandbookStrings[lang].pkg;
  const out: PackageEntry[] = [];
  if (formats.tokens) {
    out.push({ path: 'tokens.json', data: `${JSON.stringify(toDtcg(book), null, 2)}\n` });
    out.push({ path: 'tokens.css', data: toCss(book) });
    out.push({ path: 'tailwind.css', data: toTailwind(book) });
  }
  if (formats.json) out.push({ path: 'brandbook.json', data: `${JSON.stringify(book, null, 2)}\n` });

  // The logo files exactly as the site serves them, each with the address it came from
  const taken = new Set<string>();
  const written = new Set<string>();
  const listed: { name: string; source: string }[] = [];
  for (const file of book.logo.files) {
    const bytes = file.url ? sources.files.get(file.url) : undefined;
    // Sites link one file under several addresses; it goes into the package once
    if (!file.url || !bytes || written.has(fingerprint(bytes))) continue;
    written.add(fingerprint(bytes));
    const name = fileName(file.url, sources.types.get(file.url), taken);
    out.push({ path: `logo/${name}`, data: bytes });
    listed.push({ name, source: file.url });
  }
  book.logo.variants
    .filter((v) => v.svg && !v.src)
    .forEach((v, i) => {
      const name = `${p.inlineLogo}${i ? `-${i + 1}` : ''}.svg`;
      out.push({ path: `logo/${name}`, data: `${v.svg}\n` });
      listed.push({ name, source: p.inlineSource(book.url) });
    });
  out.push({ path: `logo/${p.sourcesFile}`, data: p.sourcesDoc(book.host, listed) });

  const shots: [string, string][] = [
    ['desktop', `${p.desktop}.jpg`],
    ['mobile', `${p.phone}.jpg`],
    ['dark', `${p.dark}.jpg`],
    ['nav', `${p.nav}.png`],
    ['logo', `${p.logo}.png`],
  ];
  for (const [key, name] of shots) {
    const image = sources.shots.get(key);
    if (image) out.push({ path: `${p.screenshots}/${name}`, data: image });
  }
  book.ui.buttons.forEach((button, i) => {
    const image = sources.shots.get(`button-${button.index}`);
    if (image) out.push({ path: `${p.screenshots}/${p.button}-${i + 1}.png`, data: image });
  });

  const listedFormats = [formats.pdf && 'pdf', formats.html && 'html', formats.tokens && 'tokens', formats.json && 'json'].filter(
    (f): f is string => Boolean(f),
  );
  out.push({ path: 'README.md', data: p.readme(book, listedFormats) });
  return out;
}
