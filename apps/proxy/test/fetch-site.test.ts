import { describe, expect, it } from 'vitest';
import { fetchSite, LIMITS, type SiteRequest } from '../src/fetch-site';
import { internet, SITES } from './internet';

const request = (url: string): SiteRequest => ({ url, method: 'GET', follow: true, ...LIMITS });

describe('fetchSite', () => {
  it.each([
    'http://localhost/',
    'http://127.0.0.1/',
    'http://2130706433/',
    'http://[::1]/',
    'http://169.254.169.254/latest/meta-data/',
    'https://evil.example/',
    'https://sneaky.example/',
    'https://example.com:8080/',
    'https://user:pw@example.com/',
    'ftp://example.com/',
  ])('never connects to %s', async (url) => {
    const net = internet(SITES);
    await expect(fetchSite(request(url), { fetch: net.fetcher as typeof fetch, now: () => 0 })).rejects.toMatchObject({
      code: 'blocked',
    });
    expect(net.requests.filter((r) => !r.url.endsWith('/robots.txt'))).toEqual([]);
  });
});
