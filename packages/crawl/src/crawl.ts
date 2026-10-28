import {
  factsOf,
  isHomepage,
  selectSample,
  templatePattern,
  type AuditInput,
  type PageSnapshot,
  type SiteLevel,
} from '@sitelens/core';
import { discover, type Discovery } from './discover';
import { FetchError, type Fetcher, type FetchResult } from './fetch';
import { preflight, type Preflight } from './preflight';

export type CrawlStage = 'preflight' | 'discover' | 'pages';

export interface CrawlProgress {
  stage: CrawlStage;
  done: number;
  total: number;
  url?: string;
}

export interface CrawlOptions {
  fetcher: Fetcher;
  /** Rejects a name that does not resolve before anything is fetched */
  resolves?: (hostname: string) => Promise<boolean>;
  /** How many link targets not opened while crawling get a status check */
  linkChecks?: number;
  onProgress?: (progress: CrawlProgress) => void;
  /** Something failed for one page; the audit goes on without it */
  onWarning?: (message: string) => void;
}

export interface Crawl {
  pre: Preflight;
  discovery: Discovery;
  pages: PageSnapshot[];
  home: PageSnapshot;
  favicon: SiteLevel['favicon'];
}

function toSnapshot(result: FetchResult, url: string, depth: number): PageSnapshot {
  return {
    url,
    finalUrl: result.finalUrl,
    status: result.status,
    redirects: result.redirects,
    headers: result.headers,
    contentType: result.contentType,
    rawHtml: result.body,
    templateId: templatePattern(result.finalUrl),
    depth,
  };
}

async function faviconStatus(home: PageSnapshot, fetcher: Fetcher): Promise<SiteLevel['favicon']> {
  const declared = factsOf(home).icons[0];
  const url = declared ?? new URL('/favicon.ico', home.finalUrl).toString();
  try {
    const answer = await fetcher(url, { maxBytes: 300_000 });
    return { url, status: answer.status, contentType: answer.contentType };
  } catch (error) {
    if (!(error instanceof FetchError)) throw error;
    // An icon on another site, which the online proxy may not read, is not a missing icon
    return error.code === 'blocked' ? undefined : { url, status: 0 };
  }
}

/** Finds and fetches the pages to audit, the part of collecting that is the same in the CLI and online. */
export async function crawlSite(input: AuditInput, options: CrawlOptions): Promise<Crawl> {
  const { fetcher, onProgress, onWarning } = options;
  onProgress?.({ stage: 'preflight', done: 0, total: 1 });
  const pre = await preflight(input.url, { fetcher, resolves: options.resolves });

  const budget = Math.min(120, Math.max(30, input.pages * 3));
  const discovery = await discover(pre, {
    fetcher,
    budget,
    linkChecks: options.linkChecks,
    onProgress: (done, total) => onProgress?.({ stage: 'discover', done, total }),
  });
  const sample = selectSample(discovery.found, input.pages);

  const pages: PageSnapshot[] = [];
  for (const [index, found] of sample.entries()) {
    onProgress?.({ stage: 'pages', done: index, total: sample.length, url: found.url });
    const known = discovery.fetched.get(found.url);
    try {
      const result = known ?? (await fetcher(found.url));
      pages.push(toSnapshot(result, found.url, found.depth));
    } catch (error) {
      if (!(error instanceof FetchError)) throw error;
      onWarning?.(`${found.url}: ${error.message}`);
    }
  }
  const home = pages.find((p) => isHomepage(p.finalUrl)) ?? pages[0]!;
  return { pre, discovery, pages, home, favicon: await faviconStatus(home, fetcher) };
}
