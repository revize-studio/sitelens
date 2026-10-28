import { lookup } from 'node:dns/promises';
import { crawlSite } from '@sitelens/crawl';
import {
  groupTemplates,
  type AuditInput,
  type DataKey,
  type PageSnapshot,
  type SiteSnapshot,
  type TlsInfo,
} from '@sitelens/core';
import type { Browser } from 'playwright-core';
import { fetchPage } from './http';
import { startLighthouse } from './lighthouse';
import { axeVersion, renderPage } from './render';
import { inspectTls } from './tls';

export type CollectStage = 'preflight' | 'discover' | 'pages' | 'browser' | 'lighthouse';

export interface CollectProgress {
  stage: CollectStage;
  done: number;
  total: number;
  url?: string;
}

export interface CollectOptions {
  input: AuditInput;
  browser: Browser;
  browserPath: string;
  /** Shown with the browser version in the report appendix, e.g. "Google Chrome" */
  browserName?: string;
  sitelensVersion: string;
  /** Skip Lighthouse, e.g. in tests; the performance category is then reported as not measured */
  lighthouse?: boolean;
  onProgress?: (progress: CollectProgress) => void;
  /** Something failed for one page; the audit goes on without that piece of data */
  onWarning?: (message: string) => void;
}

const resolves = (hostname: string) =>
  lookup(hostname).then(
    () => true,
    () => false,
  );

/** Collects everything the checks need, in the order a visitor would see it. Network and browser only; no analysis. */
export async function collectSite(options: CollectOptions): Promise<SiteSnapshot> {
  const { input, onProgress, onWarning } = options;
  const startedAt = new Date().toISOString();
  const available = new Set<DataKey>(['rawHtml', 'hosts', 'robots', 'sitemap', 'favicon']);

  const { pre, discovery, pages, home, favicon } = await crawlSite(input, {
    fetcher: fetchPage,
    resolves,
    onProgress,
    onWarning,
  });
  const origin = new URL(pre.origin);

  let tls: TlsInfo | undefined;
  if (origin.protocol === 'https:') {
    tls = await inspectTls(origin.hostname, Number(origin.port) || 443).catch((error: Error) => ({
      authorized: false,
      error: error.message,
      altNames: [],
    }));
    available.add('tls');
  }
  const insecure = Boolean(tls && !tls.authorized);

  for (const [index, page] of pages.entries()) {
    if (page.status >= 400) continue;
    onProgress?.({ stage: 'browser', done: index, total: pages.length, url: page.finalUrl });
    try {
      page.rendered = await renderPage(options.browser, page.finalUrl, { insecure });
      for (const key of ['rendered', 'network', 'cookies', 'axe'] as const) available.add(key);
    } catch (error) {
      onWarning?.(`${page.finalUrl}: ${error instanceof Error ? error.message.split('\n')[0] : String(error)}`);
    }
  }

  const versions: Record<string, string> = { sitelens: options.sitelensVersion, 'axe-core': axeVersion };
  versions[options.browserName ?? 'browser'] = options.browser.version();

  if (options.lighthouse !== false) {
    const runs = pages
      .filter((p) => p.status < 400)
      .flatMap(
        (p) =>
          (p === home
            ? [
                [p, 'mobile'],
                [p, 'desktop'],
              ]
            : [[p, 'mobile']]) as [PageSnapshot, 'mobile' | 'desktop'][],
      );
    const runner = await startLighthouse(options.browserPath, { insecure });
    try {
      for (const [index, [page, formFactor]] of runs.entries()) {
        onProgress?.({ stage: 'lighthouse', done: index, total: runs.length, url: page.finalUrl });
        try {
          const result = await runner.run(page.finalUrl, formFactor);
          page.lighthouse = { ...page.lighthouse, [formFactor]: result };
          available.add('lighthouse');
        } catch (error) {
          onWarning?.(
            `Lighthouse ${formFactor} ${page.finalUrl}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    } finally {
      await runner.close();
    }
    if (runner.version) versions.lighthouse = runner.version;
  }

  return {
    input,
    mode: 'cli',
    startedAt,
    versions,
    available: [...available],
    site: {
      origin: pre.origin,
      finalUrl: pre.homepage.finalUrl,
      hosts: pre.hosts,
      robotsTxt: discovery.robotsTxt,
      sitemaps: discovery.sitemaps,
      favicon,
      tls,
    },
    templates: groupTemplates(pages.map((p) => p.url)),
    pages,
    links: discovery.links,
    discovered: discovery.found.length,
  };
}
