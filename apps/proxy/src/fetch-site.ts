import { isAllowed, parseRobots, type Robots } from '@sitelens/core/robots';
import { hostProblem, withinSites } from './address';
import { resolveHost, type Resolution } from './resolve';

export const USER_AGENT = 'Mozilla/5.0 (compatible; sitelens; +https://github.com/revize-studio/sitelens)';
// The crawler's name in robots.txt terms, the same one the CLI obeys
const AGENT = 'sitelens';
const TEXT = /^(text\/|application\/(xhtml\+xml|xml|json|ld\+json|manifest\+json|rss\+xml|atom\+xml))/i;
const ROBOTS_TTL_MS = 10 * 60_000;
const ROBOTS_CACHE_ENTRIES = 100;
const ROBOTS_CACHE_MAX_BYTES = 64_000;
// The Free plan allows 50 subrequests per call; the rest is kept for Turnstile and slack
const SUBREQUEST_BUDGET = 45;

export const LIMITS = { maxBytes: 2_000_000, timeoutMs: 15_000, maxRedirects: 5 };

export type SiteErrorCode = 'dns' | 'refused' | 'timeout' | 'tls' | 'redirects' | 'network' | 'blocked';

/** The site could not be read; the code matches the CLI's fetch errors so the audit can explain it. */
export class SiteError extends Error {
  constructor(
    readonly code: SiteErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export interface SiteRequest {
  url: string;
  /** HEAD is answered from a GET whose body is not read: the proxy only ever sends GET */
  method: 'GET' | 'HEAD';
  follow: boolean;
  maxBytes: number;
  timeoutMs: number;
  maxRedirects: number;
  /** Redirects to other sites are reported, not followed, so a pass cannot reach beyond its sites */
  sites?: string[];
  /** Read the body as bytes (fonts, images) instead of text */
  binary?: boolean;
  /**
   * A file the page being read needs to render (stylesheet, font, picture). A browser loads it without
   * asking robots.txt, which governs crawling pages, so the proxy does too.
   */
  subresource?: boolean;
}

export interface SiteAnswer {
  url: string;
  finalUrl: string;
  status: number;
  redirects: { from: string; to: string; status: number }[];
  headers: Record<string, string>;
  contentType?: string;
  body: string;
  bytes?: Uint8Array<ArrayBuffer>;
  truncated: boolean;
}

export interface SiteDeps {
  fetch: typeof fetch;
  now: () => number;
}

/** What one call to the proxy may spend: subrequests counted, DNS answers reused for the same host. */
interface Call {
  fetch: typeof fetch;
  now: () => number;
  resolved: Map<string, Promise<Resolution>>;
}

// Robots files are public and the same for every visitor; keeping small ones a few minutes in memory
// saves a request per page and holds nothing about the person running the audit
const robotsCache = new Map<string, { robots: Robots | null; until: number }>();

function startCall(deps: SiteDeps): Call {
  let left = SUBREQUEST_BUDGET;
  return {
    now: deps.now,
    resolved: new Map(),
    fetch: (input, init) => {
      if (left-- <= 0) throw new SiteError('network', 'Reading this address needs too many requests');
      return deps.fetch(input, init);
    },
  };
}

function urlProblem(url: URL): string | null {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return 'only http and https addresses are fetched';
  if (url.port !== '') return 'only the standard ports 80 and 443 are fetched';
  if (url.username || url.password) return 'addresses with a login in them are not fetched';
  return hostProblem(url.hostname);
}

function codeOf(error: unknown): SiteErrorCode {
  if (error instanceof SiteError) return error.code;
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  if (/TimeoutError|timed out|timeout/i.test(text)) return 'timeout';
  if (/certificate|SSL|TLS/i.test(text)) return 'tls';
  if (/refused|reset/i.test(text)) return 'refused';
  if (/DNS|resolve|not known/i.test(text)) return 'dns';
  return 'network';
}

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

function decode(bytes: Uint8Array, contentType: string | undefined): string {
  const charset = /charset=["']?([\w-]+)/i.exec(contentType ?? '')?.[1] ?? 'utf-8';
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    // An unknown charset label: UTF-8 is right for the vast majority of pages
    return new TextDecoder('utf-8').decode(bytes);
  }
}

async function readCapped(response: Response, maxBytes: number, contentType: string | undefined) {
  const { bytes, truncated } = await readBytes(response, maxBytes);
  return { body: decode(bytes, contentType), truncated };
}

async function readBytes(response: Response, maxBytes: number): Promise<{ bytes: Uint8Array<ArrayBuffer>; truncated: boolean }> {
  const reader = response.body?.getReader();
  if (!reader) return { bytes: new Uint8Array(0), truncated: false };
  const chunks: Uint8Array[] = [];
  let size = 0;
  let truncated = false;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (size + value.length > maxBytes) {
        chunks.push(value.subarray(0, maxBytes - size));
        size = maxBytes;
        truncated = true;
        await reader.cancel();
        break;
      }
      chunks.push(value);
      size += value.length;
    }
  } catch (error) {
    // A body that stalls or breaks off is a problem of this page, not of the proxy
    throw new SiteError(codeOf(error), messageOf(error));
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return { bytes, truncated };
}

/**
 * The robots.txt rules for an origin, or null when the file says nothing (RFC 9309: 4xx or too many
 * redirects allow everything). A file that cannot be read (5xx, 429, network) forbids everything and is
 * not remembered, so a passing failure cannot open a site for ten minutes.
 */
async function robotsFor(origin: string, call: Call): Promise<Robots | null> {
  const cached = robotsCache.get(origin);
  if (cached && cached.until > call.now()) return cached.robots;
  let answer: SiteAnswer;
  try {
    answer = await get(
      {
        url: `${origin}/robots.txt`,
        method: 'GET',
        follow: true,
        maxBytes: 500_000,
        timeoutMs: 10_000,
        maxRedirects: 2,
      },
      call,
      false,
    );
  } catch (error) {
    if (!(error instanceof SiteError && error.code === 'redirects'))
      throw new SiteError('blocked', `robots.txt of ${new URL(origin).host} could not be read`);
    answer = { url: origin, finalUrl: origin, status: 404, redirects: [], headers: {}, body: '', truncated: false };
  }
  if (answer.status >= 500 || answer.status === 429)
    throw new SiteError('blocked', `robots.txt of ${new URL(origin).host} could not be read (${answer.status})`);
  const robots = answer.status >= 200 && answer.status < 300 ? parseRobots(answer.body) : null;
  if (answer.body.length <= ROBOTS_CACHE_MAX_BYTES) {
    if (robotsCache.size >= ROBOTS_CACHE_ENTRIES) robotsCache.delete(robotsCache.keys().next().value!);
    robotsCache.set(origin, { robots, until: call.now() + ROBOTS_TTL_MS });
  }
  return robots;
}

/** Reads one address like a visitor would, checking every hop before connecting to it. */
export function fetchSite(request: SiteRequest, deps: SiteDeps): Promise<SiteAnswer> {
  return get(request, startCall(deps), !request.subresource);
}

// robots.txt itself, and wherever it redirects, is read without asking robots.txt first
async function get(request: SiteRequest, call: Call, obeyRobots: boolean): Promise<SiteAnswer> {
  const redirects: SiteAnswer['redirects'] = [];
  let current = new URL(request.url);
  for (;;) {
    const problem = urlProblem(current);
    if (problem) throw new SiteError('blocked', problem);
    const host = current.hostname;
    if (!call.resolved.has(host)) call.resolved.set(host, resolveHost(host, call.fetch));
    const resolution = await call.resolved.get(host)!.catch((error: unknown) => {
      throw error instanceof SiteError ? error : new SiteError('dns', messageOf(error));
    });
    if (resolution.kind === 'missing') throw new SiteError('dns', `${host} has no address`);
    if (resolution.kind === 'private')
      throw new SiteError('blocked', `${host} points to a private address (${resolution.address})`);
    if (obeyRobots && current.pathname !== '/robots.txt') {
      const robots = await robotsFor(current.origin, call);
      if (robots && !isAllowed(robots, current.toString(), AGENT))
        throw new SiteError('blocked', `robots.txt of ${current.host} does not allow ${current.pathname}`);
    }

    let response: Response;
    try {
      response = await call.fetch(current.toString(), {
        method: 'GET',
        redirect: 'manual',
        headers: {
          'user-agent': USER_AGENT,
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          // Ask for compression like a browser does, so the compression check sees what visitors get
          'accept-encoding': 'gzip, deflate, br',
          'accept-language': 'pl,en;q=0.8',
        },
        signal: AbortSignal.timeout(request.timeoutMs),
      });
    } catch (error) {
      throw new SiteError(codeOf(error), messageOf(error));
    }

    // Workers fetch other sites in Full (strict) TLS mode: a bad certificate comes back as 525 or 526
    if (response.status === 525 || response.status === 526) {
      await response.body?.cancel();
      throw new SiteError('tls', `The certificate of ${current.host} failed verification (${response.status})`);
    }
    const location = response.headers.get('location');
    if (response.status >= 300 && response.status < 400 && location && request.follow) {
      if (!URL.canParse(location, current)) {
        await response.body?.cancel();
        throw new SiteError('redirects', `${current} redirects to an address that is not valid`);
      }
      const next = new URL(location, current);
      // Off the audited sites the redirect is reported as the answer, not followed
      if (!request.sites || withinSites(next.hostname, request.sites)) {
        await response.body?.cancel();
        redirects.push({ from: current.toString(), to: next.toString(), status: response.status });
        if (redirects.length > request.maxRedirects || redirects.some((r) => r.from === next.toString()))
          throw new SiteError('redirects', `Too many redirects (${redirects.length}) starting at ${request.url}`);
        current = next;
        continue;
      }
    }

    const headers: Record<string, string> = {};
    response.headers.forEach((value, name) => (headers[name.toLowerCase()] = value));
    const contentType = headers['content-type'];
    const redirect = response.status >= 300 && response.status < 400;
    if (request.binary && request.method === 'GET' && !redirect) {
      const { bytes, truncated } = await readBytes(response, request.maxBytes);
      return { url: request.url, finalUrl: current.toString(), status: response.status, redirects, headers, contentType, body: '', bytes, truncated };
    }
    const readBody =
      request.method === 'GET' &&
      !(response.status >= 300 && response.status < 400) &&
      TEXT.test(contentType ?? 'text/html');
    let content = { body: '', truncated: false };
    if (readBody) content = await readCapped(response, request.maxBytes, contentType);
    else await response.body?.cancel();
    return {
      url: request.url,
      finalUrl: current.toString(),
      status: response.status,
      redirects,
      headers,
      contentType,
      ...content,
    };
  }
}
