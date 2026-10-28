import { crawlSite, mapLimit, type CrawlStage } from '@sitelens/crawl';
import {
  fromLhr,
  groupTemplates,
  isHomepage,
  type AuditInput,
  type DataKey,
  type PageSnapshot,
  type SiteSnapshot,
} from '@sitelens/core';
import { proxyFetcher, type ProxySettings } from './proxy';
import { PsiError, renderedFromLhr, runPagespeed, type PsiProblem, type PsiSettings } from './psi';

export type OnlineStage = CrawlStage | 'pagespeed';

export interface OnlineProgress {
  stage: OnlineStage;
  done: number;
  total: number;
  url?: string;
}

export interface OnlineOptions {
  input: AuditInput;
  proxy: ProxySettings;
  psi: Omit<PsiSettings, 'lang'>;
  sitelensVersion: string;
  onProgress?: (progress: OnlineProgress) => void;
  onWarning?: (message: string) => void;
}

export interface OnlineAudit {
  snapshot: SiteSnapshot;
  /** Why PageSpeed Insights stopped measuring, when it did; a key of the visitor's own fixes quota and key problems */
  pagespeedProblem?: PsiProblem;
}

// Fewer than the CLI's 150: each check is a request through the proxy's free daily allowance
const LINK_CHECKS = 40;
// PageSpeed Insights takes ten seconds or more per address, so a few run side by side
const PAGESPEED_CONCURRENCY = 4;

/** Collects everything the checks need, through the proxy and PageSpeed Insights, in the browser. */
export async function collectOnline(options: OnlineOptions): Promise<OnlineAudit> {
  const { input, onProgress, onWarning } = options;
  const startedAt = new Date().toISOString();
  const { pre, discovery, pages, favicon } = await crawlSite(input, {
    fetcher: proxyFetcher(options.proxy),
    linkChecks: LINK_CHECKS,
    onProgress,
    onWarning,
  });
  const snapshot: SiteSnapshot = {
    input,
    mode: 'online',
    startedAt,
    versions: { sitelens: options.sitelensVersion },
    available: ['rawHtml', 'hosts', 'robots', 'sitemap', ...(favicon ? (['favicon'] as const) : [])],
    site: {
      origin: pre.origin,
      finalUrl: pre.homepage.finalUrl,
      hosts: pre.hosts,
      robotsTxt: discovery.robotsTxt,
      sitemaps: discovery.sitemaps,
      favicon,
    },
    templates: groupTemplates(pages.map((p) => p.url)),
    pages,
    links: discovery.links,
    discovered: discovery.found.length,
  };
  const pagespeedProblem = await addPagespeed(snapshot, { ...options.psi, lang: input.lang }, onProgress, onWarning);
  return { snapshot, pagespeedProblem };
}

/**
 * Measures the pages PageSpeed Insights has not measured yet: all of them on a phone, the homepage
 * also on a computer, like the CLI. Run it again with the visitor's own key after a quota problem.
 */
export async function addPagespeed(
  snapshot: SiteSnapshot,
  settings: PsiSettings,
  onProgress?: (progress: OnlineProgress) => void,
  onWarning?: (message: string) => void,
): Promise<PsiProblem | undefined> {
  const home = snapshot.pages.find((p) => isHomepage(p.finalUrl)) ?? snapshot.pages[0];
  const runs = snapshot.pages
    .filter((page) => page.status < 400)
    .flatMap((page) =>
      (page === home ? (['mobile', 'desktop'] as const) : (['mobile'] as const))
        .filter((strategy) => !page.lighthouse?.[strategy])
        .map((strategy) => [page, strategy] as [PageSnapshot, 'mobile' | 'desktop']),
    );
  let done = 0;
  let stop: PsiProblem | undefined;
  const available = new Set<DataKey>(snapshot.available);
  await mapLimit(runs, PAGESPEED_CONCURRENCY, async ([page, strategy]) => {
    if (stop) return;
    onProgress?.({ stage: 'pagespeed', done, total: runs.length, url: page.finalUrl });
    try {
      const lhr = await runPagespeed(page.finalUrl, strategy, settings);
      page.lighthouse = { ...page.lighthouse, [strategy]: fromLhr(lhr) };
      available.add('lighthouse');
      snapshot.versions['Lighthouse (PageSpeed Insights)'] = lhr.lighthouseVersion;
      if (strategy === 'mobile') {
        page.rendered = renderedFromLhr(lhr);
        available.add('network');
        if (page.rendered.axe) available.add('axe');
      }
    } catch (error) {
      if (!(error instanceof PsiError)) throw error;
      if (error.problem === 'quota' || error.problem === 'key') stop = error.problem;
      else onWarning?.(`PageSpeed Insights ${strategy} ${page.finalUrl}: ${error.message}`);
    }
    done++;
  });
  snapshot.available = [...available];
  return stop;
}
