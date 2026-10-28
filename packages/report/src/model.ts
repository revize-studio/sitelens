import {
  cards,
  fillTemplate,
  formatDate,
  formatNumber,
  formatSeconds,
  isHomepage,
  pathOf,
  scoredCategories,
  thresholds,
  topFindings,
  type Category,
  type CheckOutcome,
  type Finding,
  type Lang,
  type Scores,
  type SiteSnapshot,
} from '@sitelens/core';
import { strings, type ReportStrings } from './i18n';

export type ProblemSeverity = 'critical' | 'important' | 'minor';
export type Rating = 'good' | 'needs' | 'poor';

export interface ReportCard {
  id: string;
  severity: ProblemSeverity;
  severityLabel: string;
  /** Critical and important problems get the full card, minor ones the short card */
  full: boolean;
  title: string;
  summary: string;
  whatIsWrong: string;
  whyItMatters: string;
  howToFix: string[];
  short: string;
  whoFixes: string;
  effort: string;
  where: string;
  technical: string;
}

export interface Metric {
  label: string;
  value: string;
  good: string;
  rating: Rating;
}

export interface ReportSection {
  key: Category | 'other';
  heading: string;
  description: string;
  /** Sections without a score (privacy and contact, until 1.0) have no ring */
  scored: boolean;
  score: number | null;
  partial: boolean;
  metrics: Metric[];
  cards: ReportCard[];
}

export interface ReportModel {
  lang: Lang;
  t: ReportStrings;
  domain: string;
  date: string;
  pages: number;
  overall: number | null;
  summary: string;
  rings: { label: string; score: number | null }[];
  counts: Record<ProblemSeverity | 'pass', number>;
  top: ReportCard[];
  passed: string[];
  sections: ReportSection[];
  appendix: { id: string; priority: string; details: string; where: string }[];
  method: string;
  /** Weak overall result: the report ends its problem list with where to get help */
  offerHelp: boolean;
  skipped: string | null;
}

const SEVERITY_ORDER: ProblemSeverity[] = ['critical', 'important', 'minor'];
const isProblem = (f: Finding): f is Finding & { severity: ProblemSeverity } =>
  SEVERITY_ORDER.includes(f.severity as ProblemSeverity);

function where(finding: Finding, t: ReportStrings): string {
  if (!finding.pages.length) return t.wholeSite;
  const labels = finding.pages
    .map((url) => (isHomepage(url) ? t.homepage : decodeURI(pathOf(url))))
    .sort((a, b) => (a === t.homepage ? -1 : b === t.homepage ? 1 : 0));
  return labels.length <= 3 ? labels.join(', ') : t.andMore(labels.slice(0, 2).join(', '), labels.length - 2);
}

function toCard(finding: Finding & { severity: ProblemSeverity }, lang: Lang, t: ReportStrings): ReportCard {
  const card = cards[finding.checkId];
  if (!card) throw new Error(`No advice card for ${finding.checkId}`);
  const variant = card.variants[finding.variant] ?? Object.values(card.variants)[0]!;
  const text = variant[lang];
  const fill = (template: string) => fillTemplate(template, finding.evidence, lang);
  return {
    id: finding.checkId,
    severity: finding.severity,
    severityLabel: t.severity[finding.severity],
    full: finding.severity !== 'minor',
    title: fill(text.title),
    summary: fill(text.summary),
    whatIsWrong: fill(text.whatIsWrong),
    whyItMatters: fill(text.whyItMatters),
    howToFix: text.howToFix.map(fill),
    short: fill(text.short),
    whoFixes: t.whoFixesValue[card.whoFixes],
    effort: t.effortValue[card.effort],
    where: where(finding, t),
    technical: [fill(text.technical), finding.details].filter(Boolean).join(' '),
  };
}

function rate(value: number, bands: { good: number; poor: number }): Rating {
  return value <= bands.good ? 'good' : value <= bands.poor ? 'needs' : 'poor';
}

function performanceMetrics(site: SiteSnapshot, lang: Lang, t: ReportStrings): Metric[] {
  const home = site.pages.find((p) => isHomepage(p.finalUrl)) ?? site.pages[0];
  const metrics = home?.lighthouse?.mobile?.metrics;
  if (!metrics) return [];
  const out: Metric[] = [];
  if (metrics.lcp !== undefined)
    out.push({
      label: t.metrics.lcp,
      value: formatSeconds(metrics.lcp, lang),
      good: t.metrics.good(formatSeconds(thresholds.lcp.good, lang)),
      rating: rate(metrics.lcp, thresholds.lcp),
    });
  if (metrics.cls !== undefined)
    out.push({
      label: t.metrics.cls,
      value: formatNumber(metrics.cls, lang, 2),
      good: t.metrics.good(formatNumber(thresholds.cls.good, lang, 1)),
      rating: rate(metrics.cls, thresholds.cls),
    });
  if (metrics.tbt !== undefined)
    out.push({
      label: t.metrics.tbt,
      value: `${formatNumber(Math.round(metrics.tbt), lang)} ms`,
      good: t.metrics.good(`${thresholds.tbt.good} ms`),
      rating: rate(metrics.tbt, thresholds.tbt),
    });
  return out;
}

function bySeverity(a: ReportCard, b: ReportCard) {
  return SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);
}

// The summary sentence calls everything under 70 serious problems; better results get no studio note
const HELP_BELOW = 70;

/** Everything the template prints, already in words and numbers; the template does no arithmetic. */
export function buildReport(site: SiteSnapshot, outcome: CheckOutcome, scores: Scores, lang: Lang): ReportModel {
  const t = strings[lang];
  const problems = outcome.findings.filter(isProblem);
  const cardsFor = (categories: Category[]) =>
    problems
      .filter((f) => categories.includes(f.category))
      .map((f) => toCard(f, lang, t))
      .sort(bySeverity);

  const sections: ReportSection[] = scoredCategories.map((category) => {
    const score = scores.categories.find((c) => c.category === category);
    const label = t.categories[category]!;
    return {
      key: category,
      heading: label.heading,
      description: label.description,
      scored: true,
      score: score?.score ?? null,
      partial: score?.partial ?? false,
      metrics: category === 'performance' ? performanceMetrics(site, lang, t) : [],
      cards: cardsFor([category]),
    };
  });
  const otherCategories = (['privacy', 'content'] as Category[]).filter((c) => !scoredCategories.includes(c));
  const otherCards = cardsFor(otherCategories);
  if (otherCards.length)
    sections.push({
      key: 'other',
      heading: t.otherSection.heading,
      description: t.otherSection.description,
      scored: false,
      score: null,
      partial: false,
      metrics: [],
      cards: otherCards,
    });

  const weakest = scores.categories
    .filter((c) => c.score !== null && c.score < 90)
    .sort((a, b) => a.score! - b.score!)[0];
  const passes = outcome.findings.filter((f) => f.severity === 'pass');
  const date = formatDate(site.startedAt, lang);
  const versions = Object.entries(site.versions)
    .map(([name, version]) => `${name} ${version}`)
    .join(', ');

  return {
    lang,
    t,
    domain: new URL(site.site.origin).hostname.replace(/^www\./, ''),
    date,
    pages: site.pages.length,
    overall: scores.overall,
    summary:
      scores.overall === null
        ? ''
        : t.summarySentence(scores.overall, weakest ? t.categories[weakest.category]!.name : null),
    rings: scores.categories.map((c) => ({ label: t.categories[c.category]!.name, score: c.score })),
    counts: {
      critical: problems.filter((f) => f.severity === 'critical').length,
      important: problems.filter((f) => f.severity === 'important').length,
      minor: problems.filter((f) => f.severity === 'minor').length,
      pass: passes.length,
    },
    top: topFindings(problems, site)
      .filter(isProblem)
      .map((f) => toCard(f, lang, t)),
    passed: passes
      .flatMap((f) => {
        const text = cards[f.checkId]?.passed?.[lang];
        return text ? [fillTemplate(text, f.evidence, lang)] : [];
      }),
    sections,
    appendix: sections.flatMap((s) =>
      s.cards.map((c) => ({ id: c.id, priority: c.severityLabel, details: c.technical, where: c.where })),
    ),
    method: t.method({ date, pages: site.pages.length, versions }),
    offerHelp: scores.overall !== null && scores.overall < HELP_BELOW,
    skipped: outcome.skipped.length ? t.skipped(outcome.skipped.map((s) => s.checkId).join(', ')) : null,
  };
}
