import { cards } from './cards/generated';
import { htmlPages } from './checks/helpers';
import {
  categoryWeights,
  effortOrder,
  lighthouseFormFactorWeights,
  likelyFactor,
  penalties,
  reach,
  scoredCategories,
} from './config/scoring';
import type { Category, Finding, SiteSnapshot } from './model';
import type { CheckOutcome } from './run';
import { isHomepage } from './url';

export interface CategoryScore {
  category: Category;
  /** 0–100, or null when nothing in the category could be measured */
  score: number | null;
  /** Some checks were skipped because their data was not collected in this mode */
  partial: boolean;
}

export interface Scores {
  overall: number | null;
  categories: CategoryScore[];
}

/** How much of the site a finding touches: the homepage or the whole site counts fully. */
export function reachOf(finding: Finding, site: SiteSnapshot): number {
  if (!finding.pages.length) return 1;
  const home = site.pages.find((page) => isHomepage(page.finalUrl));
  if (home && finding.pages.includes(home.url)) return 1;
  const total = Math.max(1, htmlPages(site).length);
  return reach(Math.min(1, finding.pages.length / total));
}

export function penaltyOf(finding: Finding, site: SiteSnapshot): number {
  const confidence = finding.confidence === 'likely' ? likelyFactor : 1;
  return penalties[finding.severity] * reachOf(finding, site) * confidence;
}

function performanceScore(site: SiteSnapshot): number | null {
  const perPage = site.pages
    .map(({ lighthouse }) => {
      const mobile = lighthouse?.mobile?.performance;
      const desktop = lighthouse?.desktop?.performance;
      if (mobile === undefined) return desktop;
      if (desktop === undefined) return mobile;
      return mobile * lighthouseFormFactorWeights.mobile + desktop * lighthouseFormFactorWeights.desktop;
    })
    .filter((score): score is number => score !== undefined);
  if (!perPage.length) return null;
  return Math.round(perPage.reduce((sum, score) => sum + score, 0) / perPage.length);
}

export function scoreAudit(site: SiteSnapshot, outcome: CheckOutcome): Scores {
  const skippedCategories = new Set(outcome.skipped.map((s) => s.category));
  const categories = scoredCategories.map((category): CategoryScore => {
    const partial = skippedCategories.has(category);
    if (category === 'performance') return { category, score: performanceScore(site), partial };
    const ran = outcome.findings.filter((f) => f.category === category);
    if (!ran.length) return { category, score: null, partial };
    // Each problem takes its share of what is left: a few serious problems still cost a lot, but a
    // big site with several of them does not drop to zero (calibrated on 17 real sites, 25.10.2026)
    const kept = ran.reduce((left, finding) => left * (1 - penaltyOf(finding, site) / 100), 1);
    return { category, score: Math.round(100 * kept), partial };
  });
  const weighted = categories.filter((c) => c.score !== null);
  const weightSum = weighted.reduce((sum, c) => sum + (categoryWeights[c.category] ?? 0), 0);
  const overall = weightSum
    ? Math.round(weighted.reduce((sum, c) => sum + c.score! * (categoryWeights[c.category] ?? 0), 0) / weightSum)
    : null;
  return { overall, categories };
}

const ID_PREFIX_CATEGORY: Record<string, Category> = {
  perf: 'performance',
  seo: 'seo',
  a11y: 'accessibility',
  mobile: 'accessibility',
  sec: 'security',
  privacy: 'privacy',
  content: 'content',
  brand: 'brand',
  tech: 'tech',
};

export function categoryOfId(checkId: string): Category {
  return ID_PREFIX_CATEGORY[checkId.split('/')[0]!] ?? 'tech';
}

/**
 * The five problems to fix first: severity × reach × category weight × confidence,
 * and on a tie the one that takes less work.
 */
export function topFindings(findings: Finding[], site: SiteSnapshot, count = 5): Finding[] {
  const effort = (f: Finding) => effortOrder[cards[f.checkId]?.effort ?? 'medium'];
  return findings
    .filter((f) => f.severity !== 'pass' && f.severity !== 'suggestion')
    .map((f) => ({ f, impact: penaltyOf(f, site) * (categoryWeights[f.category] ?? 5) }))
    .sort((a, b) => b.impact - a.impact || effort(a.f) - effort(b.f))
    .slice(0, count)
    .map(({ f }) => f);
}
