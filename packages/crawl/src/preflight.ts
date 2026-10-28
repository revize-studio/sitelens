import type { HostProbe } from '@sitelens/core';
import { FetchError, type Fetcher, type FetchResult } from './fetch';

export type PreflightErrorCode = 'invalid-url' | 'dns' | 'unreachable' | 'blocked' | 'tls' | 'http-error' | 'not-html';

/** The site cannot be audited at all; the message is meant for the person who typed the address. */
export class PreflightError extends Error {
  constructor(
    readonly code: PreflightErrorCode,
    readonly detail: string,
  ) {
    super(detail);
  }
}

export interface Preflight {
  homepage: FetchResult;
  /** Where the site really lives, e.g. https://www.example.com */
  origin: string;
  hosts: HostProbe[];
}

export interface PreflightOptions {
  fetcher: Fetcher;
  /** Rejects a name that does not resolve before anything is fetched; the CLI asks the system resolver */
  resolves?: (hostname: string) => Promise<boolean>;
}

/** Accepts what people type: example.com, www.example.com/oferta, http://example.com. */
export function parseTarget(input: string): URL {
  const trimmed = input.trim();
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    throw new PreflightError('invalid-url', trimmed);
  }
  if (!/^https?:$/.test(url.protocol) || (!url.hostname.includes('.') && url.hostname !== 'localhost'))
    throw new PreflightError('invalid-url', trimmed);
  url.hash = '';
  return url;
}

async function probe(url: string, fetcher: Fetcher): Promise<HostProbe> {
  try {
    const answer = await fetcher(url, { timeoutMs: 15_000, maxBytes: 200_000 });
    return { url, finalUrl: answer.finalUrl, status: answer.status, redirects: answer.redirects };
  } catch (error) {
    if (!(error instanceof FetchError)) throw error;
    return { url, redirects: [], error: error.code };
  }
}

function unreachable(error: unknown, target: URL): unknown {
  if (!(error instanceof FetchError)) return error;
  if (error.code === 'dns') return new PreflightError('dns', target.hostname);
  if (error.code === 'blocked') return new PreflightError('blocked', error.message);
  // Only the online audit gets here: the CLI reads a site with a bad certificate anyway and reports it
  if (error.code === 'tls') return new PreflightError('tls', error.message);
  return new PreflightError('unreachable', error.message);
}

/** Checks the site answers, follows it to its final address and tries the http/https × www variants. */
export async function preflight(input: string, { fetcher, resolves }: PreflightOptions): Promise<Preflight> {
  const target = parseTarget(input);
  if (resolves && !(await resolves(target.hostname))) throw new PreflightError('dns', target.hostname);

  let homepage: FetchResult;
  try {
    homepage = await fetcher(target.toString());
  } catch (error) {
    // Typed without a scheme and https does not answer: give plain http a chance
    if (
      error instanceof FetchError &&
      error.code !== 'dns' &&
      error.code !== 'blocked' &&
      error.code !== 'tls' &&
      !/^https?:\/\//i.test(input.trim()) &&
      target.protocol === 'https:'
    ) {
      target.protocol = 'http:';
      homepage = await fetcher(target.toString()).catch((second: unknown) => {
        throw unreachable(second, target);
      });
    } else {
      throw unreachable(error, target);
    }
  }
  if (homepage.status >= 400) throw new PreflightError('http-error', String(homepage.status));
  if (homepage.contentType && !/html/i.test(homepage.contentType))
    throw new PreflightError('not-html', homepage.contentType);

  const final = new URL(homepage.finalUrl);
  const bare = final.hostname.replace(/^www\./, '');
  const variants =
    final.hostname === 'localhost' || /^[\d.]+$/.test(final.hostname)
      ? []
      : ['http', 'https'].flatMap((scheme) => [`${scheme}://${bare}/`, `${scheme}://www.${bare}/`]);
  const hosts = await Promise.all(variants.map((url) => probe(url, fetcher)));
  return { homepage, origin: final.origin, hosts };
}
