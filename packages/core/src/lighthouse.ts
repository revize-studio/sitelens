import type { LighthouseItem, LighthouseResult } from './model';

// Only the parts of a Lighthouse report (LHR) sitelens reads. PSI returns the same structure
// under lighthouseResult, so the online version maps it with the same function.
interface LhrAudit {
  numericValue?: number;
  score?: number | null;
  details?: {
    items?: Array<Record<string, unknown>>;
  };
}

export interface Lhr {
  lighthouseVersion: string;
  configSettings: { formFactor: 'mobile' | 'desktop' };
  categories: { performance?: { score: number | null } };
  audits: Record<string, LhrAudit | undefined>;
}

const num = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : undefined);
const str = (value: unknown) => (typeof value === 'string' ? value : undefined);

function items(lhr: Lhr, auditId: string): LighthouseItem[] {
  return (lhr.audits[auditId]?.details?.items ?? [])
    .map((item) => ({
      url: str(item.url) ?? '',
      totalBytes: num(item.totalBytes),
      wastedBytes: num(item.wastedBytes),
      wastedMs: num(item.wastedMs),
    }))
    .filter((item) => item.url);
}

// Lighthouse 13 folded the image audits into one insight: each image lists the fixes that apply
function imageFixes(lhr: Lhr, kind: 'size' | 'format'): LighthouseItem[] {
  // The resize advice is the only one that names two sizes, the file's and the displayed one (e.g. 1200x800)
  const isResize = (fix: Record<string, unknown>) => /\d+x\d+.*\d+x\d+/.test(str(fix.reason) ?? '');
  return (lhr.audits['image-delivery-insight']?.details?.items ?? []).flatMap((item) => {
    const fixes = (item.subItems as { items?: Array<Record<string, unknown>> } | undefined)?.items ?? [];
    const wastedBytes = fixes
      .filter((fix) => isResize(fix) === (kind === 'size'))
      .reduce((sum, fix) => sum + (num(fix.wastedBytes) ?? 0), 0);
    const url = str(item.url);
    return url && wastedBytes ? [{ url, totalBytes: num(item.totalBytes), wastedBytes }] : [];
  });
}

function lcpElement(lhr: Lhr): string | undefined {
  const item = lhr.audits['largest-contentful-paint-element']?.details?.items?.[0];
  // Lighthouse 10–12 nest the node in a table of tables; 13 lists it beside the LCP breakdown
  const nested =
    (item?.items as Array<Record<string, unknown>> | undefined)?.[0]?.node ??
    item?.node ??
    lhr.audits['lcp-breakdown-insight']?.details?.items?.find((entry) => entry.type === 'node');
  const node = nested as { selector?: unknown; snippet?: unknown } | undefined;
  return str(node?.snippet) ?? str(node?.selector);
}

export function fromLhr(lhr: Lhr): LighthouseResult {
  const metric = (id: string) => num(lhr.audits[id]?.numericValue);
  const score = lhr.categories.performance?.score;
  return {
    formFactor: lhr.configSettings.formFactor,
    lighthouseVersion: lhr.lighthouseVersion,
    performance: typeof score === 'number' ? Math.round(score * 100) : undefined,
    metrics: {
      lcp: metric('largest-contentful-paint'),
      cls: metric('cumulative-layout-shift'),
      tbt: metric('total-blocking-time'),
      fcp: metric('first-contentful-paint'),
      speedIndex: metric('speed-index'),
      ttfb: metric('server-response-time'),
    },
    lcpElement: lcpElement(lhr),
    totalBytes: metric('total-byte-weight'),
    resourceSummary: (lhr.audits['resource-summary']?.details?.items ?? [])
      .map((item) => ({
        type: str(item.resourceType) ?? 'other',
        bytes: num(item.transferSize) ?? 0,
        count: num(item.requestCount) ?? 0,
      }))
      .filter((item) => item.type !== 'total'),
    // Older Lighthouse (and PSI until it moves to 13) uses the audits on the left, 13 the insights
    oversizedImages: [...items(lhr, 'uses-responsive-images'), ...imageFixes(lhr, 'size')],
    legacyFormatImages: [...items(lhr, 'modern-image-formats'), ...imageFixes(lhr, 'format')],
    renderBlocking: [...items(lhr, 'render-blocking-resources'), ...items(lhr, 'render-blocking-insight')],
    uncompressed: items(lhr, 'uses-text-compression'),
  };
}
