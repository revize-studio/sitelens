import type { Template } from './model';
import { isHomepage } from './url';

/** A page found while crawling, before it is chosen for the audit. */
export interface FoundPage {
  url: string;
  depth: number;
  /** Text of the links that pointed here, used to recognise key pages */
  linkTexts: string[];
}

const KEY_PAGES = [
  /kontakt|contact/i,
  /oferta|uslugi|usługi|offer|services?|produkty|products?|sklep|shop/i,
  /cennik|ceny|pricing|prices?/i,
  /o-nas|o nas|about|firma|company/i,
];

/** /blog/how-to and /blog/news share the /blog/* template; first-level pages are their own template. */
export function templatePattern(url: string): string {
  if (isHomepage(url)) return '/';
  const segments = new URL(url).pathname.split('/').filter(Boolean);
  return segments.length > 1 ? `/${segments[0]}/*` : `/${segments[0] ?? ''}`;
}

export function groupTemplates(urls: string[]): Template[] {
  const byPattern = new Map<string, string[]>();
  for (const url of urls) {
    const pattern = templatePattern(url);
    byPattern.set(pattern, [...(byPattern.get(pattern) ?? []), url]);
  }
  return [...byPattern].map(([pattern, pages]) => ({ id: pattern, pattern, pages }));
}

function keyRank(page: FoundPage): number {
  const haystack = `${new URL(page.url).pathname} ${page.linkTexts.join(' ')}`;
  const index = KEY_PAGES.findIndex((pattern) => pattern.test(haystack));
  return index === -1 ? Infinity : index;
}

/**
 * Picks the pages to audit: the homepage, then key pages (contact, offer, pricing, about),
 * then a couple from every template so one big blog cannot crowd everything else out,
 * then whatever is closest to the homepage.
 */
export function selectSample(found: FoundPage[], limit: number): FoundPage[] {
  const chosen = new Map<string, FoundPage>();
  const add = (page: FoundPage | undefined) => {
    if (page && chosen.size < limit && !chosen.has(page.url)) chosen.set(page.url, page);
  };
  const byDepth = [...found].sort((a, b) => a.depth - b.depth);

  add(byDepth.find((page) => isHomepage(page.url)) ?? byDepth[0]);
  for (const page of byDepth.filter((p) => keyRank(p) !== Infinity).sort((a, b) => keyRank(a) - keyRank(b))) add(page);

  const perTemplate = new Map<string, FoundPage[]>();
  for (const page of byDepth) {
    const pattern = templatePattern(page.url);
    perTemplate.set(pattern, [...(perTemplate.get(pattern) ?? []), page]);
  }
  for (let round = 0; round < 2; round++) for (const pages of perTemplate.values()) add(pages[round]);
  for (const page of byDepth) add(page);

  return [...chosen.values()];
}
