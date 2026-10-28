import {
  extractFacts,
  isAllowed,
  isSameSite,
  looksLikePage,
  normalizeUrl,
  parseRobots,
  parseSitemap,
  type FoundPage,
  type LinkStatus,
  type Robots,
  type SitemapResource,
  type TextResource,
} from '@sitelens/core';
import { FetchError, mapLimit, type Fetcher, type FetchResult } from './fetch';
import type { Preflight } from './preflight';

// sitelens identifies itself in robots.txt terms as "sitelens" and obeys the rules for it
const AGENT = 'sitelens';
const MAX_SITEMAP_FILES = 10;
const MAX_SITEMAP_URLS = 2000;

export interface Discovery {
  robotsTxt?: TextResource;
  sitemaps: SitemapResource[];
  found: FoundPage[];
  /** Answers already fetched while crawling, by normalised address, reused by the audit */
  fetched: Map<string, FetchResult>;
  links: LinkStatus[];
}

export interface DiscoverOptions {
  fetcher: Fetcher;
  /** How many pages to open while looking for links */
  budget: number;
  /** How many link targets not opened while crawling get a status check */
  linkChecks?: number;
  concurrency?: number;
  onProgress?: (crawled: number, budget: number) => void;
}

const isHtml = (result: FetchResult) =>
  result.status >= 200 && result.status < 300 && /html/i.test(result.contentType ?? 'text/html');

/** The file, or null when the online proxy may not read it (another site, robots.txt). */
async function fetchText(url: string, fetcher: Fetcher): Promise<TextResource | null> {
  try {
    const result = await fetcher(url, { maxBytes: 10_000_000 });
    return {
      url,
      status: result.status,
      body: result.status === 200 ? result.body : '',
      contentType: result.contentType,
    };
  } catch (error) {
    if (!(error instanceof FetchError)) throw error;
    return error.code === 'blocked' ? null : { url, status: 0, body: '' };
  }
}

async function readSitemaps(origin: string, robots: Robots | null, fetcher: Fetcher): Promise<SitemapResource[]> {
  const queue = robots?.sitemaps.length ? [...robots.sitemaps] : [`${origin}/sitemap.xml`];
  const done: SitemapResource[] = [];
  let urls = 0;
  while (queue.length && done.length < MAX_SITEMAP_FILES) {
    const url = queue.shift()!;
    // Compressed sitemaps need a binary download; they are rare on the sites this tool is for
    if (url.endsWith('.gz') || done.some((s) => s.url === url)) continue;
    const file = await fetchText(url, fetcher);
    if (!file) continue;
    const parsed = file.status === 200 ? parseSitemap(file.body) : { kind: 'invalid' as const, urls: [] };
    if (parsed.kind === 'index') queue.push(...parsed.urls.filter((u) => isSameSite(u, origin)));
    const pages = parsed.kind === 'urlset' ? parsed.urls.slice(0, Math.max(0, MAX_SITEMAP_URLS - urls)) : [];
    urls += pages.length;
    done.push({
      url,
      status: file.status,
      body: '',
      contentType: file.contentType,
      urls: parsed.kind === 'index' ? parsed.urls : pages,
    });
  }
  return done;
}

/**
 * Finds the site's pages the way a visitor would: from the homepage through links, breadth
 * first, on the same site only and within robots.txt, plus the addresses from the sitemap.
 */
export async function discover(pre: Preflight, options: DiscoverOptions): Promise<Discovery> {
  const { origin } = pre;
  const { fetcher } = options;
  const robotsTxt = (await fetchText(`${origin}/robots.txt`, fetcher)) ?? {
    url: `${origin}/robots.txt`,
    status: 0,
    body: '',
  };
  const robots = robotsTxt.status === 200 ? parseRobots(robotsTxt.body) : null;
  const sitemaps = await readSitemaps(origin, robots, fetcher);

  const fetched = new Map<string, FetchResult>();
  const found = new Map<string, FoundPage>();
  const sources = new Map<string, Set<string>>();
  const start = normalizeUrl(pre.homepage.finalUrl)!;
  fetched.set(start, pre.homepage);
  const queue: FoundPage[] = [{ url: start, depth: 0, linkTexts: [] }];
  const seen = new Set([start]);

  const visit = (page: FoundPage, result: FetchResult) => {
    if (!isHtml(result)) return;
    const finalUrl = normalizeUrl(result.finalUrl) ?? page.url;
    const known = found.get(finalUrl);
    if (known) known.linkTexts.push(...page.linkTexts);
    else found.set(finalUrl, { ...page, url: finalUrl });
    for (const link of extractFacts(result.body, result.finalUrl).links) {
      if (!isSameSite(link.href, origin) || !looksLikePage(link.href)) continue;
      sources.set(link.href, (sources.get(link.href) ?? new Set()).add(finalUrl));
      if (seen.has(link.href)) {
        const target = found.get(link.href) ?? queue.find((q) => q.url === link.href);
        if (target && link.text) target.linkTexts.push(link.text);
        continue;
      }
      seen.add(link.href);
      if (!robots || isAllowed(robots, link.href, AGENT))
        queue.push({ url: link.href, depth: page.depth + 1, linkTexts: link.text ? [link.text] : [] });
    }
  };

  visit(queue.shift()!, pre.homepage);
  while (queue.length && fetched.size < options.budget) {
    const batch = queue.splice(0, Math.min(options.concurrency ?? 4, options.budget - fetched.size));
    const results = await mapLimit(batch, options.concurrency ?? 4, async (page) => {
      try {
        return await fetcher(page.url);
      } catch (error) {
        // Only a failed page is skipped; anything else, such as the proxy's daily limit, ends the audit
        if (error instanceof FetchError) return error;
        throw error;
      }
    });
    batch.forEach((page, i) => {
      const result = results[i];
      if (result && !(result instanceof FetchError)) {
        fetched.set(page.url, result);
        visit(page, result);
      }
    });
    options.onProgress?.(fetched.size, options.budget);
  }

  for (const url of sitemaps.flatMap((s) => s.urls)) {
    const normal = normalizeUrl(url);
    if (normal && isSameSite(normal, origin) && looksLikePage(normal) && !found.has(normal) && !seen.has(normal))
      found.set(normal, { url: normal, depth: 9, linkTexts: [] });
  }

  return {
    robotsTxt,
    sitemaps,
    found: [...found.values()],
    fetched,
    links: await checkLinks(sources, fetched, robots, fetcher, options.linkChecks ?? 150),
  };
}

/** Status of every internal link target; pages not opened while crawling get a light HEAD request. */
async function checkLinks(
  sources: Map<string, Set<string>>,
  fetched: Map<string, FetchResult>,
  robots: Robots | null,
  fetcher: Fetcher,
  limit: number,
): Promise<LinkStatus[]> {
  const targets = [...sources.keys()];
  const unchecked = targets
    .filter((url) => !fetched.has(url) && (!robots || isAllowed(robots, url, AGENT)))
    .slice(0, limit);
  const checked = new Map<string, { status: number; error?: string }>();
  await mapLimit(unchecked, 6, async (url) => {
    try {
      let answer = await fetcher(url, { method: 'HEAD', timeoutMs: 10_000 });
      // Some servers refuse HEAD; ask again properly before calling the link broken
      if (answer.status === 405 || answer.status === 501 || answer.status === 403)
        answer = await fetcher(url, { timeoutMs: 10_000, maxBytes: 100_000 });
      checked.set(url, { status: answer.status });
    } catch (error) {
      if (!(error instanceof FetchError)) throw error;
      checked.set(url, { status: 0, error: error.code });
    }
  });
  return targets
    .map((url) => {
      const known = fetched.get(url);
      const state = known ? { status: known.status } : checked.get(url);
      return state ? { url, ...state, foundOn: [...sources.get(url)!] } : null;
    })
    .filter((link): link is LinkStatus => link !== null);
}
