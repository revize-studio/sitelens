import { hostProblem, siteOf, withinSites } from './address';
import { fetchSite, LIMITS, SiteError, type SiteDeps, type SiteRequest } from './fetch-site';
import { checkPass, issuePass } from './session';
import { verifyTurnstile } from './turnstile';

export interface Env {
  /** Set with `wrangler secret put TURNSTILE_SECRET`; also signs the audit passes */
  TURNSTILE_SECRET: string;
  /** Comma-separated origins allowed to call the proxy, e.g. https://sitelens.pl */
  ALLOWED_ORIGINS: string;
  /** "true" only on a developer's machine, where Cloudflare's always-pass test keys are used */
  TURNSTILE_TEST?: string;
  /** Workers Rate Limiting bindings: sessions per visitor address, fetches per pass */
  SESSION_LIMITER?: RateLimit;
  FETCH_LIMITER?: RateLimit;
}

interface RateLimit {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

// Long enough to crawl a site; PageSpeed Insights runs in the browser and needs no pass
const PASS_TTL_MS = 5 * 60_000;
// The domains a site's homepage redirects through join its pass, up to this many
const MAX_SITES = 4;

/**
 * What the brandbook may read through /asset, from any public host: stylesheets, fonts and small
 * images, each with its own size limit and accepted types. Never HTML.
 */
const ASSETS = {
  css: { maxBytes: 1_000_000, type: /^text\/(css|plain)$/ },
  font: {
    maxBytes: 500_000,
    type: /^(font\/[\w.+-]+|application\/(font-[\w.+-]+|x-font-[\w.+-]+|octet-stream|vnd\.ms-fontobject))$/,
  },
  image: { maxBytes: 600_000, type: /^image\/(png|jpeg|gif|webp|avif|svg\+xml|x-icon|vnd\.microsoft\.icon)$/ },
} as const;
type AssetKind = keyof typeof ASSETS;

// woff2, woff, OpenType and TrueType files start with these bytes; a font with another start is not one
const FONT_SIGNATURES = ['wOF2', 'wOFF', 'OTTO', 'true', '\u0000\u0001\u0000\u0000'];

function assetType(kind: AssetKind, contentType: string | undefined, bytes: Uint8Array): string | null {
  const type = (contentType ?? '').split(';')[0]!.trim().toLowerCase();
  const start = String.fromCharCode(...bytes.subarray(0, 64)).toLowerCase();
  if (start.includes('<!doctype html') || start.includes('<html')) return null;
  if (!ASSETS[kind].type.test(type)) return null;
  if (kind === 'font' && !FONT_SIGNATURES.includes(String.fromCharCode(...bytes.subarray(0, 4)))) return null;
  return kind === 'css' ? 'text/css' : type;
}

/** The audited site from what the visitor typed, or null when it is not a public domain. */
function siteFrom(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null;
  const text = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  if (!URL.canParse(text)) return null;
  const { hostname } = new URL(text);
  return hostProblem(hostname) ? null : siteOf(hostname);
}

/**
 * The sites a pass covers: the one typed and the domains its homepage redirects through, found once
 * here, so later fetches cannot widen the pass by redirecting somewhere else.
 */
async function sitesOf(site: string, deps: SiteDeps): Promise<string[]> {
  try {
    // Only https: a second attempt over http would need a second budget of subrequests in this call
    const { url, redirects } = await fetchSite(
      { url: `https://${site}/`, method: 'HEAD', follow: true, maxBytes: 0, timeoutMs: 10_000, maxRedirects: 5 },
      deps,
    );
    const hosts = [url, ...redirects.map((r) => r.to)].map((u) => siteOf(new URL(u).hostname));
    return [...new Set([site, ...hosts])].slice(0, MAX_SITES);
  } catch {
    // The audit's own first request reports why the site cannot be read
    return [site];
  }
}

function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

function siteRequest(body: unknown): SiteRequest | null {
  if (!body || typeof body !== 'object') return null;
  const { url, method = 'GET', follow = true, maxBytes, timeoutMs, maxRedirects } = body as Record<string, unknown>;
  if (typeof url !== 'string' || url.length > 2048 || !URL.canParse(url)) return null;
  if (method !== 'GET' && method !== 'HEAD') return null;
  if (typeof follow !== 'boolean') return null;
  const capped = (value: unknown, limit: number) =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.min(value, limit) : limit;
  return {
    url,
    method,
    follow,
    maxBytes: capped(maxBytes, LIMITS.maxBytes),
    timeoutMs: capped(timeoutMs, LIMITS.timeoutMs),
    maxRedirects: capped(maxRedirects, LIMITS.maxRedirects),
  };
}

export function createHandler(deps: SiteDeps) {
  return async function handle(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('origin') ?? '';
    const allowed = env.ALLOWED_ORIGINS.split(',')
      .map((o) => o.trim())
      .filter(Boolean);
    // Only our own pages may call the proxy, so other sites cannot use it to read the web
    if (!allowed.includes(origin)) return json({ error: 'origin' }, 403);
    const cors = { 'access-control-allow-origin': origin, vary: 'origin' };
    if (request.method === 'OPTIONS')
      return new Response(null, {
        status: 204,
        headers: {
          ...cors,
          'access-control-allow-methods': 'POST',
          'access-control-allow-headers': 'content-type, authorization',
          'access-control-max-age': '86400',
        },
      });
    if (request.method !== 'POST') return json({ error: 'method' }, 405, cors);

    const path = new URL(request.url).pathname;
    const ip = request.headers.get('cf-connecting-ip');

    const body = await request.json().catch(() => null);

    if (path === '/session') {
      const { turnstile: token, site: typed } = (body ?? {}) as { turnstile?: unknown; site?: unknown };
      if (typeof token !== 'string' || token.length > 4096) return json({ error: 'turnstile' }, 400, cors);
      const site = siteFrom(typed);
      if (!site) return json({ error: 'site' }, 400, cors);
      if (env.SESSION_LIMITER && !(await env.SESSION_LIMITER.limit({ key: ip ?? 'unknown' })).success)
        return json({ error: 'rate-limit' }, 429, cors);
      const settings = {
        secret: env.TURNSTILE_SECRET,
        hostnames: allowed.map((o) => (URL.canParse(o) ? new URL(o).hostname : '')),
        testing: env.TURNSTILE_TEST === 'true',
      };
      if (!(await verifyTurnstile(token, settings, ip, deps.fetch))) return json({ error: 'turnstile' }, 403, cors);
      const exp = deps.now() + PASS_TTL_MS;
      const sites = await sitesOf(site, deps);
      return json({ pass: await issuePass(env.TURNSTILE_SECRET, { exp, sites }), expiresAt: exp }, 200, cors);
    }

    if (path === '/fetch') {
      const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
      const pass = await checkPass(env.TURNSTILE_SECRET, token, deps.now());
      if (!pass) return json({ error: 'pass' }, 401, cors);
      if (env.FETCH_LIMITER && !(await env.FETCH_LIMITER.limit({ key: pass.id })).success)
        return json({ error: 'rate-limit' }, 429, cors);
      const site = siteRequest(body);
      if (!site) return json({ error: 'request' }, 400, cors);
      // The pass covers the audited site only, so the proxy cannot be used to read the rest of the web
      const host = new URL(site.url).hostname;
      if (!withinSites(host, pass.sites))
        return json(
          { ok: false, error: { code: 'blocked', message: `${host} is not part of the audited site` } },
          200,
          cors,
        );
      try {
        return json({ ok: true, result: await fetchSite({ ...site, sites: pass.sites }, deps) }, 200, cors);
      } catch (error) {
        // Whatever went wrong belongs to this one address; the audit goes on with the other pages
        const code = error instanceof SiteError ? error.code : 'network';
        const message = error instanceof Error ? error.message : String(error);
        return json({ ok: false, error: { code, message } }, 200, cors);
      }
    }

    if (path === '/asset') {
      const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
      const pass = await checkPass(env.TURNSTILE_SECRET, token, deps.now());
      if (!pass) return json({ error: 'pass' }, 401, cors);
      if (env.FETCH_LIMITER && !(await env.FETCH_LIMITER.limit({ key: pass.id })).success)
        return json({ error: 'rate-limit' }, 429, cors);
      const { url, kind } = (body ?? {}) as { url?: unknown; kind?: unknown };
      if (typeof url !== 'string' || url.length > 2048 || !URL.canParse(url) || typeof kind !== 'string' || !(kind in ASSETS))
        return json({ error: 'request' }, 400, cors);
      const limit = ASSETS[kind as AssetKind].maxBytes;
      // Assets often sit on CDNs and font services, so any public host is allowed, but only these types
      try {
        const answer = await fetchSite(
          {
            url,
            method: 'GET',
            follow: true,
            maxBytes: limit,
            timeoutMs: LIMITS.timeoutMs,
            maxRedirects: LIMITS.maxRedirects,
            binary: true,
            subresource: true,
          },
          deps,
        );
        // A file that cannot be had is an answer, not a failure of the proxy, as in /fetch
        if (answer.status !== 200) return json({ error: { code: 'status', message: String(answer.status) } }, 200, cors);
        if (answer.truncated) return json({ error: { code: 'too-large', message: `over ${limit} bytes` } }, 200, cors);
        const type = assetType(kind as AssetKind, answer.contentType, answer.bytes ?? new Uint8Array(0));
        if (!type) return json({ error: { code: 'type', message: answer.contentType ?? 'none' } }, 200, cors);
        return new Response(answer.bytes, {
          status: 200,
          headers: { ...cors, 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' },
        });
      } catch (error) {
        const code = error instanceof SiteError ? error.code : 'network';
        return json({ error: { code, message: error instanceof Error ? error.message : String(error) } }, 200, cors);
      }
    }

    return json({ error: 'not-found' }, 404, cors);
  };
}

const handle = createHandler({ fetch: (input, init) => fetch(input, init), now: () => Date.now() });

export default { fetch: (request: Request, env: Env) => handle(request, env) };
