import type { Category, Severity } from '../model';

// Every threshold, weight and multiplier in one place. The README and the report appendix
// describe the same numbers.

/** Categories with a score ring. Privacy and content get scores from 1.0; until then they are listed only. */
export const scoredCategories: Category[] = ['performance', 'seo', 'accessibility', 'security'];

export const categoryWeights: Partial<Record<Category, number>> = {
  performance: 20,
  seo: 20,
  accessibility: 20,
  security: 20,
  privacy: 10,
  content: 10,
};

/** Percent of what is left of a category score that one problem takes away (see scoreAudit). */
export const penalties: Record<Severity, number> = {
  critical: 25,
  important: 10,
  minor: 3,
  suggestion: 0,
  pass: 0,
};

/** Lighthouse performance is averaged like PageSpeed Insights shows it: phone counts most. */
export const lighthouseFormFactorWeights = { mobile: 0.7, desktop: 0.3 };

/** Findings that are a heuristic ("likely") count half. */
export const likelyFactor = 0.5;

/** Part of the pages affected: 0.5 + 0.5 × share; the homepage or the whole site counts fully. */
export const reach = (share: number) => 0.5 + 0.5 * share;

export const effortOrder = { small: 0, medium: 1, large: 2 } as const;

export const thresholds = {
  lcp: { good: 2500, poor: 4000 },
  cls: { good: 0.1, poor: 0.25 },
  // Lab data has no INP; Total Blocking Time stands in for it with Lighthouse's own bands
  tbt: { good: 200, poor: 600 },
  // web.dev calls TTFB above 0.8 s "needs improvement"
  ttfb: { poor: 800 },
  // No standard exists for page weight; these bands are the owner's call (25.10.2026)
  pageWeight: { minor: 3_000_000, important: 5_000_000 },
  // Savings worth reporting, in bytes and milliseconds
  imageSavings: 100_000,
  renderBlockingMs: 300,
  title: { min: 30, max: 60 },
  description: { max: 160 },
  // ACME clients such as certbot renew 30 days before expiry, so under 14 days usually means renewal failed
  certificateWarningDays: 14,
  hstsMinMaxAge: 15_552_000,
  thinTextLength: 300,
};
