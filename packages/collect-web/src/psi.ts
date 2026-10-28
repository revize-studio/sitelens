import type { AxeNode, AxeResults, AxeViolation, Lang, Lhr, NetworkEntry, RenderedPage } from '@sitelens/core';

const ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
// The same WCAG rule sets the CLI runs axe with (collect-node AXE_OPTIONS); best-practice rules stay out
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

export type PsiProblem = 'quota' | 'key' | 'page' | 'unavailable';

/** PageSpeed Insights could not measure a page; quota and key problems stop the measuring altogether. */
export class PsiError extends Error {
  constructor(
    readonly problem: PsiProblem,
    message: string,
  ) {
    super(message);
  }
}

export interface PsiSettings {
  /** An API key restricted to the site's address; PSI no longer answers calls without one */
  key?: string;
  lang: Lang;
  fetch?: typeof fetch;
  /** Waits before trying again after the per-minute quota ran out; replaceable in tests */
  wait?: (ms: number) => Promise<void>;
  /** Only performance, for when the screenshot is all that is needed */
  performanceOnly?: boolean;
}

interface PsiErrorBody {
  error?: {
    code?: number;
    message?: string;
    errors?: { reason?: string }[];
    details?: { reason?: string; metadata?: { quota_limit?: string } }[];
  };
}

interface PsiAnswer {
  lighthouseResult: Lhr & { runtimeError?: { code?: string; message?: string } };
}

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
// The daily and the per-minute quota answer with the same 429; only the quota name tells them apart
const PER_MINUTE_RETRIES = 2;
const PER_MINUTE_WAIT_MS = 30_000;

/** Runs Lighthouse on Google's servers for one address and returns the full Lighthouse result. */
export async function runPagespeed(url: string, strategy: 'mobile' | 'desktop', settings: PsiSettings): Promise<Lhr> {
  const query = new URLSearchParams({ url, strategy: strategy.toUpperCase(), locale: settings.lang });
  query.append('category', 'PERFORMANCE');
  // Accessibility audits come from the phone run only, as they do in the CLI's report
  if (strategy === 'mobile' && !settings.performanceOnly) query.append('category', 'ACCESSIBILITY');
  const fetcher = settings.fetch ?? fetch;
  const wait = settings.wait ?? pause;
  // Google asks for the key in a header rather than in the address
  const headers: Record<string, string> = settings.key ? { 'x-goog-api-key': settings.key } : {};

  let serverErrors = 0;
  let minuteWaits = 0;
  for (;;) {
    let response: Response;
    try {
      response = await fetcher(`${ENDPOINT}?${query}`, { headers, signal: AbortSignal.timeout(120_000) });
    } catch (error) {
      throw new PsiError('unavailable', error instanceof Error ? error.message : String(error));
    }
    if (response.ok) {
      const { lighthouseResult } = (await response.json()) as PsiAnswer;
      const failure = lighthouseResult.runtimeError;
      if (failure?.code && failure.code !== 'NO_ERROR') throw new PsiError('page', failure.message ?? failure.code);
      return lighthouseResult;
    }
    const body = ((await response.json().catch(() => ({}))) as PsiErrorBody).error;
    const reasons = [...(body?.errors ?? []), ...(body?.details ?? [])].map((e) => e.reason ?? '').join(' ');
    const quotaLimit = (body?.details ?? []).map((d) => d.metadata?.quota_limit ?? '').join(' ');
    const message = body?.message ?? `PageSpeed Insights answered ${response.status}`;
    if (response.status === 429 || /rateLimitExceeded|dailyLimitExceeded|quotaExceeded/i.test(reasons)) {
      if (!/PerDay/i.test(`${quotaLimit} ${message}`) && minuteWaits < PER_MINUTE_RETRIES) {
        minuteWaits++;
        await wait(PER_MINUTE_WAIT_MS);
        continue;
      }
      throw new PsiError('quota', message);
    }
    // A wrong key answers 400 with API_KEY_INVALID, a key restricted to other sites 403
    if (response.status === 403 || /keyInvalid|API_KEY|API key|referer/i.test(`${reasons} ${message}`))
      throw new PsiError('key', message);
    // PSI sometimes fails a first run with 500 and succeeds on the next one
    if (response.status >= 500 && serverErrors++ === 0) continue;
    throw new PsiError(response.status >= 500 ? 'unavailable' : 'page', message);
  }
}

interface LhrNode {
  selector?: string;
  snippet?: string;
  explanation?: string;
}

interface A11yAudit {
  score?: number | null;
  scoreDisplayMode?: string;
  title?: string;
  details?: {
    items?: { node?: LhrNode }[];
    debugData?: { impact?: AxeViolation['impact']; tags?: string[] };
  };
}

interface FullLhr extends Lhr {
  categories: Lhr['categories'] & { accessibility?: { auditRefs: { id: string }[] } };
}

const CONTRAST =
  /contrast of ([\d.]+) \(foreground color: (#[0-9a-f]{3,8}), background color: (#[0-9a-f]{3,8}).*?Expected contrast ratio of ([\d.]+):1/is;

function nodeOf(node: LhrNode): AxeNode {
  const contrast = CONTRAST.exec(node.explanation ?? '');
  return {
    target: node.selector ?? '',
    html: (node.snippet ?? '').slice(0, 300),
    ...(contrast
      ? { contrast: { ratio: Number(contrast[1]), fg: contrast[2]!, bg: contrast[3]!, expected: Number(contrast[4]) } }
      : {}),
  };
}

/** axe results as Lighthouse ran them on Google's servers, in the shape the CLI records. */
export function axeFromLhr(lhr: Lhr): AxeResults | undefined {
  const refs = (lhr as FullLhr).categories.accessibility?.auditRefs;
  if (!refs) return undefined;
  const violations: AxeViolation[] = [];
  const passes: string[] = [];
  for (const { id } of refs) {
    const audit = lhr.audits[id] as A11yAudit | undefined;
    if (!audit || audit.scoreDisplayMode !== 'binary') continue;
    if (audit.score === 1) passes.push(id);
    const debug = audit.details?.debugData;
    if (audit.score !== 0 || !debug?.impact || !debug.tags?.some((tag) => WCAG_TAGS.includes(tag))) continue;
    const nodes = (audit.details?.items ?? []).map((item) => nodeOf(item.node ?? {}));
    violations.push({
      id,
      impact: debug.impact,
      help: audit.title ?? id,
      tags: debug.tags,
      nodes,
      count: nodes.length,
    });
  }
  return { violations, passes };
}

/** The files the page loaded, from the network-requests audit. */
export function networkFromLhr(lhr: Lhr): NetworkEntry[] {
  return (lhr.audits['network-requests']?.details?.items ?? []).flatMap((item) => {
    const url = typeof item.url === 'string' ? item.url : '';
    if (!url) return [];
    const status = typeof item.statusCode === 'number' && item.statusCode > 0 ? item.statusCode : 0;
    return [
      {
        url,
        type: typeof item.resourceType === 'string' ? item.resourceType.toLowerCase() : 'other',
        status,
        transferSize: typeof item.transferSize === 'number' ? item.transferSize : undefined,
        mimeType: typeof item.mimeType === 'string' ? item.mimeType : undefined,
      },
    ];
  });
}

/**
 * What the CLI learns from opening the page in a browser, as far as Lighthouse reports it. There is
 * no rendered HTML and no cookies, so the checks that need them read the server HTML or are skipped.
 */
export function renderedFromLhr(lhr: Lhr): RenderedPage {
  return { html: '', network: networkFromLhr(lhr), cookies: [], console: [], axe: axeFromLhr(lhr) };
}

/** The picture of the loaded page that Lighthouse took on Google's servers, as a data: URI. */
export function screenshotFromLhr(lhr: Lhr): string | null {
  const data = (lhr.audits['final-screenshot']?.details as { data?: unknown } | undefined)?.data;
  return typeof data === 'string' && data.startsWith('data:image/') ? data : null;
}
