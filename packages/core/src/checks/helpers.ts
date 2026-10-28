import { factsOf, visibleFactsOf, type PageFacts } from '../extract';
import type { CheckDefinition, Confidence, Finding, PageSnapshot, Severity, SiteSnapshot } from '../model';
import { isHomepage, isSameSite, pathOf } from '../url';

export type Check = CheckDefinition;

export interface FindingInput {
  variant?: string;
  severity: Severity;
  pages?: string[];
  evidence?: Record<string, string | number>;
  details?: string;
  confidence?: Confidence;
}

export function finding(site: SiteSnapshot, check: Pick<Check, 'id' | 'category'>, input: FindingInput): Finding {
  const pages = input.pages ?? [];
  return {
    checkId: check.id,
    variant: input.variant ?? 'default',
    category: check.category,
    severity: input.severity,
    confidence: input.confidence ?? 'certain',
    pages,
    templateIds: [...new Set(site.pages.filter((p) => pages.includes(p.url)).map((p) => p.templateId))],
    evidence: input.evidence ?? {},
    details: input.details,
  };
}

export function pass(
  site: SiteSnapshot,
  check: Pick<Check, 'id' | 'category'>,
  evidence: Record<string, string | number> = {},
) {
  return finding(site, check, { severity: 'pass', evidence });
}

/** Pages that answered with HTML; the ones content checks can read. */
export function htmlPages(site: SiteSnapshot): PageSnapshot[] {
  return site.pages.filter(
    (page) => page.status >= 200 && page.status < 300 && (!page.contentType || /html/i.test(page.contentType)),
  );
}

/** `visible` reads pages as a visitor sees them; sites built in the browser send an almost empty HTML shell. */
export function withFacts(
  site: SiteSnapshot,
  source: 'server' | 'visible' = 'server',
): { page: PageSnapshot; facts: PageFacts }[] {
  return htmlPages(site).map((page) => ({ page, facts: source === 'visible' ? visibleFactsOf(page) : factsOf(page) }));
}

export function homepage(site: SiteSnapshot): PageSnapshot | undefined {
  return site.pages.find((page) => isHomepage(page.finalUrl)) ?? site.pages[0];
}

export function header(page: PageSnapshot, name: string): string | undefined {
  return page.headers[name.toLowerCase()];
}

/** The worst of a set of severities, for findings that cover several pages. */
export function worst(severities: Severity[]): Severity {
  const order: Severity[] = ['critical', 'important', 'minor', 'suggestion', 'pass'];
  return order.find((s) => severities.includes(s)) ?? 'pass';
}

/** A few examples for the appendix, shortened so one long URL cannot fill the table. */
export function examples(values: string[], max = 3): string {
  const shown = values.slice(0, max).map((v) => (v.length > 90 ? `${v.slice(0, 87)}…` : v));
  return values.length > max ? `${shown.join(', ')} (+${values.length - max})` : shown.join(', ');
}

/** When something is missing on every audited page it is a site-wide setting: report it once, for the whole site. */
export function siteWide(site: SiteSnapshot, pages: string[]): string[] {
  return pages.length && pages.length === htmlPages(site).length ? [] : pages;
}

/** A path for links inside the site, the full address for anything else. */
export function short(url: string, origin: string): string {
  return isSameSite(url, origin) ? pathOf(url) : url;
}
