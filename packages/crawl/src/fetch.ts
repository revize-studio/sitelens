import type { Redirect } from '@sitelens/core';

export type FetchErrorCode = 'dns' | 'refused' | 'timeout' | 'tls' | 'redirects' | 'network' | 'blocked';

/** A request that never got an HTTP answer; the code says why, in terms the person running the audit can be told. */
export class FetchError extends Error {
  constructor(
    readonly code: FetchErrorCode,
    readonly url: string,
    message: string,
  ) {
    super(message);
  }
}

export interface FetchResult {
  url: string;
  finalUrl: string;
  status: number;
  redirects: Redirect[];
  headers: Record<string, string>;
  contentType?: string;
  body: string;
  truncated: boolean;
  /** The certificate failed verification and the page was read anyway, so the audit can report it */
  insecure?: boolean;
}

export interface FetchOptions {
  method?: 'GET' | 'HEAD';
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  /** Follow redirects (the default) or stop at the first answer, for probing http/www variants */
  follow?: boolean;
}

/** Fetches one address for the audit: the CLI does it from Node, the online audit through the proxy. */
export type Fetcher = (url: string, options?: FetchOptions) => Promise<FetchResult>;

/** Runs tasks with at most `limit` in flight, keeping the input order in the results. */
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index]!, index);
    }
  });
  await Promise.all(workers);
  return results;
}
