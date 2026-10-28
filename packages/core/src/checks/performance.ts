import { thresholds } from '../config/scoring';
import type { LighthouseResult, PageSnapshot, Severity } from '../model';
import { formatBytes } from '../format';
import { pathOf } from '../url';
import { type Check, examples, finding, header, htmlPages, pass, siteWide } from './helpers';

/** Phone results: Google ranks by the mobile version and the sample report measures on a phone. */
function measured(pages: PageSnapshot[]): { page: PageSnapshot; lh: LighthouseResult }[] {
  return pages.flatMap((page) => (page.lighthouse?.mobile ? [{ page, lh: page.lighthouse.mobile }] : []));
}

function banded(value: number, bands: { good: number; poor: number }, poor: Severity, middle: Severity): Severity {
  if (value > bands.poor) return poor;
  if (value > bands.good) return middle;
  return 'pass';
}

/** One finding per metric: the worst page sets the severity, every page outside "good" is listed. */
function metricCheck(
  id: string,
  pick: (lh: LighthouseResult) => number | undefined,
  bands: { good: number; poor: number },
  poor: Severity,
  middle: Severity,
  unit: (value: number) => string,
): Check {
  return {
    id,
    category: 'performance',
    stage: 'mvp',
    requires: ['lighthouse'],
    run(site) {
      const values = measured(site.pages)
        .map(({ page, lh }) => ({ page, lh, value: pick(lh) }))
        .filter((v): v is { page: PageSnapshot; lh: LighthouseResult; value: number } => v.value !== undefined);
      if (!values.length) return [];
      const rated = values.map((v) => ({ ...v, severity: banded(v.value, bands, poor, middle) }));
      const bad = rated.filter((v) => v.severity !== 'pass').sort((a, b) => b.value - a.value);
      const best = Math.min(...values.map((v) => v.value));
      if (!bad.length) return [pass(site, this, { value: best })];
      const top = bad[0]!;
      return [
        finding(site, this, {
          severity: top.severity,
          pages: bad.map((v) => v.page.url),
          evidence: { value: top.value, count: bad.length, total: values.length, good: bands.good },
          details:
            examples(bad.map((v) => `${pathOf(v.page.url)}: ${unit(v.value)}`)) +
            (top.lh.lcpElement && id === 'perf/lcp' ? `; ${top.lh.lcpElement}` : ''),
        }),
      ];
    },
  };
}

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`;
const lcp = metricCheck('perf/lcp', (lh) => lh.metrics.lcp, thresholds.lcp, 'critical', 'important', seconds);
const cls = metricCheck(
  'perf/cls',
  (lh) => lh.metrics.cls,
  thresholds.cls,
  'important',
  'minor',
  (v) => v.toFixed(2),
);
// Lab runs cannot measure INP; Total Blocking Time is the stand-in Lighthouse itself uses
const inp = metricCheck(
  'perf/inp',
  (lh) => lh.metrics.tbt,
  thresholds.tbt,
  'important',
  'minor',
  (ms) => `${Math.round(ms)} ms`,
);

const ttfb: Check = {
  id: 'perf/ttfb',
  category: 'performance',
  stage: 'mvp',
  requires: ['lighthouse'],
  run(site) {
    const slow = measured(site.pages).filter(({ lh }) => (lh.metrics.ttfb ?? 0) > thresholds.ttfb.poor);
    if (!measured(site.pages).length) return [];
    if (!slow.length) return [pass(site, this)];
    const worstMs = Math.max(...slow.map(({ lh }) => lh.metrics.ttfb ?? 0));
    return [
      finding(site, this, {
        severity: 'important',
        pages: slow.map(({ page }) => page.url),
        evidence: { value: worstMs, count: slow.length, limit: thresholds.ttfb.poor },
        details: examples(slow.map(({ page, lh }) => `${pathOf(page.url)}: ${Math.round(lh.metrics.ttfb ?? 0)} ms`)),
      }),
    ];
  },
};

const pageWeight: Check = {
  id: 'perf/page-weight',
  category: 'performance',
  stage: 'mvp',
  requires: ['lighthouse'],
  run(site) {
    const pages = measured(site.pages).filter(({ lh }) => lh.totalBytes !== undefined);
    if (!pages.length) return [];
    const heavy = pages.filter(({ lh }) => lh.totalBytes! > thresholds.pageWeight.minor);
    if (!heavy.length) return [pass(site, this)];
    const heaviest = heavy.reduce((a, b) => (a.lh.totalBytes! >= b.lh.totalBytes! ? a : b));
    const breakdown = heaviest.lh.resourceSummary
      .filter((r) => r.bytes > 0)
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 4)
      .map((r) => `${r.type} ${formatBytes(r.bytes, 'en')}`)
      .join(', ');
    return [
      finding(site, this, {
        severity: heaviest.lh.totalBytes! > thresholds.pageWeight.important ? 'important' : 'minor',
        pages: heavy.map(({ page }) => page.url),
        evidence: { bytes: heaviest.lh.totalBytes!, count: heavy.length, limit: thresholds.pageWeight.minor },
        details: `${pathOf(heaviest.page.url)}: ${formatBytes(heaviest.lh.totalBytes!, 'en')} (${breakdown}).`,
      }),
    ];
  },
};

function savingsCheck(id: string, pick: (lh: LighthouseResult) => { url: string; wastedBytes?: number }[]): Check {
  return {
    id,
    category: 'performance',
    stage: 'mvp',
    requires: ['lighthouse'],
    run(site) {
      const pages = measured(site.pages);
      if (!pages.length) return [];
      const items = new Map<string, number>();
      const affected = new Set<string>();
      for (const { page, lh } of pages) {
        for (const item of pick(lh)) {
          if (!item.wastedBytes) continue;
          items.set(item.url, Math.max(items.get(item.url) ?? 0, item.wastedBytes));
          affected.add(page.url);
        }
      }
      const savings = [...items.values()].reduce((sum, bytes) => sum + bytes, 0);
      if (savings < thresholds.imageSavings) return [pass(site, this)];
      return [
        finding(site, this, {
          severity: 'important',
          pages: [...affected],
          evidence: { count: items.size, savings },
          details: examples([...items.keys()].map(pathOf)),
        }),
      ];
    },
  };
}

const imagesSize = savingsCheck('perf/images-size', (lh) => lh.oversizedImages);
const imagesFormat = savingsCheck('perf/images-format', (lh) => lh.legacyFormatImages);

const renderBlocking: Check = {
  id: 'perf/render-blocking',
  category: 'performance',
  stage: 'mvp',
  requires: ['lighthouse'],
  run(site) {
    const pages = measured(site.pages);
    if (!pages.length) return [];
    const blocking = pages
      .map(({ page, lh }) => ({
        page,
        items: lh.renderBlocking,
        ms: Math.max(0, ...lh.renderBlocking.map((i) => i.wastedMs ?? 0)),
      }))
      .filter(({ ms }) => ms > thresholds.renderBlockingMs);
    if (!blocking.length) return [pass(site, this)];
    const files = [...new Set(blocking.flatMap(({ items }) => items.map((i) => i.url)))];
    return [
      finding(site, this, {
        severity: 'important',
        pages: blocking.map(({ page }) => page.url),
        // Files one page has to wait for; the list below adds up all pages
        evidence: {
          count: Math.max(...blocking.map(({ items }) => items.length)),
          ms: Math.max(...blocking.map(({ ms }) => ms)),
        },
        details: examples(files.map(pathOf), 4),
      }),
    ];
  },
};

const compression: Check = {
  id: 'perf/compression',
  category: 'performance',
  stage: 'mvp',
  requires: ['rawHtml'],
  run(site) {
    const pages = htmlPages(site);
    // Lighthouse ignored savings under 1.4 KB; a document that small gains nothing from compression
    const plain = pages
      .filter((page) => (page.rawHtml?.length ?? 0) >= 1400)
      .filter((page) => !/(gzip|br|zstd|deflate)/i.test(header(page, 'content-encoding') ?? ''))
      .map((page) => page.url);
    const assets = [
      ...new Set(site.pages.flatMap((page) => page.lighthouse?.mobile?.uncompressed ?? []).map((i) => i.url)),
    ];
    if (!plain.length && !assets.length) return [pass(site, this)];
    return [
      finding(site, this, {
        severity: 'important',
        pages: siteWide(site, plain),
        evidence: { count: plain.length + assets.length },
        details: examples([...plain, ...assets].map(pathOf), 4),
      }),
    ];
  },
};

export const performanceChecks: Check[] = [
  lcp,
  cls,
  inp,
  ttfb,
  pageWeight,
  imagesSize,
  imagesFormat,
  renderBlocking,
  compression,
];
