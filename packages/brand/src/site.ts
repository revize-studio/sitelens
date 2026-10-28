import botProtection from '../data/bot-protection.json';
import type { RawLogo, RawManifest, RawPage } from './raw';

const normalise = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

/** The second-level name of the host: `revize` for www.revize.pl. */
export function hostLabel(host: string): string {
  const parts = host.replace(/^www\./, '').split('.');
  // co.uk, com.pl and the like: the name sits one level further left
  const secondLevel = ['co', 'com', 'org', 'net', 'gov', 'edu', 'ac', 'or', 'ne', 'go'];
  return parts.length > 2 && secondLevel.includes(parts.at(-2)!) ? parts.at(-3)! : (parts.at(-2) ?? parts[0] ?? host);
}

/**
 * The brand's name as the site states it, preferring names that match the domain; the domain itself
 * when nothing does.
 */
export function brandName(page: RawPage, manifest: RawManifest | null, logo: RawLogo | null, host: string): string {
  const label = hostLabel(host);
  const titleParts = page.meta.title.split(/\s+[|–—•·:-]\s+/).map((p) => p.trim());
  const candidates = [
    page.meta.organization?.name,
    page.meta.siteName,
    manifest?.shortName,
    manifest?.name,
    (logo?.alt || logo?.label)?.replace(/\b(logo|logotyp|logotype)\b/gi, '').trim(),
    ...titleParts,
  ].filter((c): c is string => Boolean(c && c.length <= 40));
  const matching = candidates.find((c) => {
    const n = normalise(c);
    return n && (n.includes(label) || label.includes(n));
  });
  // A name the site states outright beats the domain, which often is not the brand (localhost, a shop platform)
  const stated = [page.meta.organization?.name, page.meta.siteName, manifest?.shortName, manifest?.name].find(
    (c): c is string => Boolean(c && c.length <= 40),
  );
  return matching ?? stated ?? label.charAt(0).toUpperCase() + label.slice(1);
}

/** True when the page is a bot check (Cloudflare, Imperva, DataDome…) instead of the site. */
export function isBotCheck(title: string, html: string): boolean {
  const t = title.trim().toLowerCase();
  const h = html.slice(0, 200_000).toLowerCase();
  return botProtection.titles.some((p) => t.startsWith(p)) || botProtection.html.some((p) => h.includes(p));
}

/** Up to `count` pages linked from the navigation, one per path, files and anchors left out. */
export function keyPages(page: RawPage, count: number): string[] {
  const home = new URL(page.url);
  const seen = new Set([home.pathname.replace(/\/$/, '') || '/']);
  const out: string[] = [];
  // Navigation first; a one-page navigation of anchors falls back to the footer and other site links
  for (const href of [...(page.nav?.links ?? []).map((l) => l.href), ...page.siteLinks]) {
    let url: URL;
    try {
      url = new URL(href);
    } catch {
      continue;
    }
    const path = url.pathname.replace(/\/$/, '') || '/';
    if (url.origin !== home.origin || seen.has(path) || /\.(pdf|jpe?g|png|webp|zip|docx?|xlsx?)$/i.test(path)) continue;
    seen.add(path);
    url.hash = '';
    out.push(url.toString());
    if (out.length >= count) break;
  }
  return out;
}

/** Theme switches the stylesheets know about, e.g. `[data-theme="dark"]` or `.dark`, as attribute changes on <html>. */
export function themeToggles(selectors: string[]): { attribute: string; value: string }[] {
  const toggles: { attribute: string; value: string }[] = [];
  const add = (attribute: string, value: string) => {
    if (!toggles.some((t) => t.attribute === attribute && t.value === value)) toggles.push({ attribute, value });
  };
  for (const selector of selectors) {
    for (const match of selector.matchAll(/\[(data-[\w-]+)\s*=\s*["']?(dark[\w-]*)["']?\]/gi)) add(match[1]!, match[2]!);
    for (const match of selector.matchAll(/\.(dark[\w-]*|theme-dark|[\w-]*-dark)\b/gi)) add('class', match[1]!);
  }
  return toggles.slice(0, 4);
}
