import { FetchError, type Fetcher, type FetchErrorCode, type FetchResult } from '@sitelens/crawl';

export type ProxyProblem = 'pass' | 'rate-limit' | 'unavailable';

/** The proxy itself cannot help any more (pass expired, limit reached, down), so the audit stops. */
export class ProxyError extends Error {
  constructor(
    readonly problem: ProxyProblem,
    message: string,
  ) {
    super(message);
  }
}

export interface ProxySettings {
  /** e.g. https://sitelens-proxy.example.workers.dev */
  endpoint: string;
  /** The pass from /session, sent with every fetch */
  pass: string;
  fetch?: typeof fetch;
}

type ProxyAnswer = { ok: true; result: FetchResult } | { ok: false; error: { code: FetchErrorCode; message: string } };

/** Asks the proxy for a Turnstile-backed pass for auditing one site. */
export async function openSession(
  endpoint: string,
  turnstileToken: string,
  site: string,
  fetcher: typeof fetch = fetch,
): Promise<string> {
  let response: Response;
  try {
    response = await fetcher(`${endpoint}/session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ turnstile: turnstileToken, site }),
    });
  } catch (error) {
    throw new ProxyError('unavailable', error instanceof Error ? error.message : String(error));
  }
  if (response.status === 429) throw new ProxyError('rate-limit', 'Too many audits from this address');
  if (!response.ok)
    throw new ProxyError(response.status === 403 ? 'pass' : 'unavailable', `Session ${response.status}`);
  const { pass } = (await response.json()) as { pass: string };
  return pass;
}

/** A fetcher for the shared crawl that reads pages through the proxy instead of from Node. */
export function proxyFetcher({ endpoint, pass, fetch: fetcher = fetch }: ProxySettings): Fetcher {
  return async (url, options = {}) => {
    let response: Response;
    try {
      response = await fetcher(`${endpoint}/fetch`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${pass}` },
        body: JSON.stringify({
          url,
          method: options.method ?? 'GET',
          follow: options.follow ?? true,
          maxBytes: options.maxBytes,
          timeoutMs: options.timeoutMs,
          maxRedirects: options.maxRedirects,
        }),
      });
    } catch (error) {
      throw new ProxyError('unavailable', error instanceof Error ? error.message : String(error));
    }
    if (response.status === 401) throw new ProxyError('pass', 'The audit pass expired');
    if (response.status === 429) throw new ProxyError('rate-limit', 'The proxy is busy or its daily limit is used up');
    // Cloudflare answers with its own error page when the Worker's daily limit is used up
    const answer = (await response.json().catch(() => null)) as ProxyAnswer | null;
    if (!response.ok || !answer) throw new ProxyError('unavailable', `Proxy answered ${response.status}`);
    if (!answer.ok) throw new FetchError(answer.error.code, url, answer.error.message);
    return answer.result;
  };
}

export type AssetKind = 'css' | 'font' | 'image';

/**
 * Reads a stylesheet, a font or a picture for the brandbook through the proxy; null when the site does
 * not serve it, it is too large or of the wrong type.
 */
export async function fetchAsset(
  { endpoint, pass, fetch: fetcher = fetch }: ProxySettings,
  url: string,
  kind: AssetKind,
): Promise<{ bytes: Uint8Array; type: string } | null> {
  let response: Response;
  try {
    response = await fetcher(`${endpoint}/asset`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${pass}` },
      body: JSON.stringify({ url, kind }),
    });
  } catch (error) {
    throw new ProxyError('unavailable', error instanceof Error ? error.message : String(error));
  }
  if (response.status === 401) throw new ProxyError('pass', 'The brandbook pass expired');
  if (response.status === 429) throw new ProxyError('rate-limit', 'The proxy is busy or its daily limit is used up');
  if (response.status === 400) return null;
  if (!response.ok) throw new ProxyError('unavailable', `Proxy answered ${response.status}`);
  const type = response.headers.get('content-type') ?? '';
  // The proxy answers in JSON when the site would not give the file (missing, too large, wrong type)
  if (type.startsWith('application/json')) return null;
  return { bytes: new Uint8Array(await response.arrayBuffer()), type };
}
