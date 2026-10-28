import { request as httpRequest, type IncomingMessage } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { createBrotliDecompress, createGunzip, createInflate } from 'node:zlib';
import type { Readable } from 'node:stream';
import type { Redirect } from '@sitelens/core';
import { FetchError, type FetchErrorCode, type FetchOptions, type FetchResult } from '@sitelens/crawl';

export const SITELENS_URL = 'https://github.com/revize-studio/sitelens';
export const USER_AGENT = `Mozilla/5.0 (compatible; sitelens; +${SITELENS_URL})`;

const TEXT = /^(text\/|application\/(xhtml\+xml|xml|json|ld\+json|rss\+xml|atom\+xml))/i;

function errorCode(error: NodeJS.ErrnoException): FetchErrorCode {
  if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') return 'dns';
  if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET' || error.code === 'EHOSTUNREACH') return 'refused';
  if (error.code === 'ETIMEDOUT' || error.name === 'TimeoutError') return 'timeout';
  if (error.code?.startsWith('ERR_TLS') || error.code?.startsWith('ERR_SSL') || /CERT|SSL|TLS/.test(error.code ?? ''))
    return 'tls';
  return 'network';
}

function headersOf(response: IncomingMessage): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(response.headers)) {
    if (value !== undefined) headers[name.toLowerCase()] = Array.isArray(value) ? value.join(', ') : value;
  }
  return headers;
}

function decompressed(response: IncomingMessage): Readable {
  switch ((response.headers['content-encoding'] ?? '').toLowerCase()) {
    case 'gzip':
    case 'x-gzip':
      return response.pipe(createGunzip());
    case 'br':
      return response.pipe(createBrotliDecompress());
    case 'deflate':
      return response.pipe(createInflate());
    default:
      return response;
  }
}

function decode(bytes: Buffer, contentType: string | undefined): string {
  const charset = /charset=["']?([\w-]+)/i.exec(contentType ?? '')?.[1] ?? 'utf-8';
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    // An unknown charset label: UTF-8 is right for the vast majority of pages
    return new TextDecoder('utf-8').decode(bytes);
  }
}

function once(url: string, options: Required<Omit<FetchOptions, 'follow' | 'maxRedirects'>>, verify: boolean) {
  return new Promise<{ status: number; headers: Record<string, string>; body: string; truncated: boolean }>(
    (resolve, reject) => {
      const target = new URL(url);
      const send = target.protocol === 'https:' ? httpsRequest : httpRequest;
      const req = send(
        target,
        {
          method: options.method,
          headers: {
            'user-agent': USER_AGENT,
            accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'accept-encoding': 'gzip, deflate, br',
            'accept-language': 'pl,en;q=0.8',
          },
          rejectUnauthorized: verify,
          signal: AbortSignal.timeout(options.timeoutMs),
        },
        (response) => {
          const headers = headersOf(response);
          const status = response.statusCode ?? 0;
          if (
            options.method === 'HEAD' ||
            (status >= 300 && status < 400) ||
            !TEXT.test(headers['content-type'] ?? 'text/html')
          ) {
            response.resume();
            resolve({ status, headers, body: '', truncated: false });
            return;
          }
          const chunks: Buffer[] = [];
          let size = 0;
          let truncated = false;
          const stream = decompressed(response);
          stream.on('data', (chunk: Buffer) => {
            size += chunk.length;
            if (size > options.maxBytes) {
              truncated = true;
              stream.destroy();
              response.destroy();
              return;
            }
            chunks.push(chunk);
          });
          const finish = () =>
            resolve({ status, headers, body: decode(Buffer.concat(chunks), headers['content-type']), truncated });
          stream.on('end', finish);
          stream.on('close', () => truncated && finish());
          stream.on('error', (error) => (truncated ? finish() : reject(error)));
        },
      );
      req.on('error', reject);
      req.end();
    },
  );
}

/** GET (or HEAD) that records every redirect hop, so the checks can see chains and http → https moves. */
export async function fetchPage(url: string, options: FetchOptions = {}): Promise<FetchResult> {
  const settings = {
    method: options.method ?? 'GET',
    timeoutMs: options.timeoutMs ?? 20_000,
    maxBytes: options.maxBytes ?? 5_000_000,
  } as const;
  const maxRedirects = options.maxRedirects ?? 10;
  const redirects: Redirect[] = [];
  let current = url;
  let insecure = false;
  for (;;) {
    let answer;
    try {
      answer = await once(current, settings, !insecure);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      const code = errorCode(err);
      // A site with a broken certificate is still audited, read without verification;
      // sec/certificate reports the problem itself. Nothing is sent but a plain GET.
      if (code === 'tls' && !insecure) {
        insecure = true;
        continue;
      }
      throw new FetchError(code, current, err.message);
    }
    const location = answer.headers.location;
    if (answer.status >= 300 && answer.status < 400 && location && options.follow !== false) {
      if (!URL.canParse(location, current))
        throw new FetchError('redirects', current, `${current} redirects to an address that is not valid`);
      const next = new URL(location, current).toString();
      redirects.push({ from: current, to: next, status: answer.status });
      if (redirects.length > maxRedirects || redirects.some((r) => r.from === next))
        throw new FetchError('redirects', url, `Too many redirects (${redirects.length}) starting at ${url}`);
      current = next;
      continue;
    }
    return {
      url,
      finalUrl: current,
      status: answer.status,
      redirects,
      headers: answer.headers,
      contentType: answer.headers['content-type'],
      body: answer.body,
      truncated: answer.truncated,
      ...(insecure ? { insecure } : {}),
    };
  }
}
