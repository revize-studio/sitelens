import { describe, expect, it } from 'vitest';
import { createHandler, type Env } from '../src/index';
import { internet, SITES } from './internet';

const env: Env = { TURNSTILE_SECRET: 'test-secret', ALLOWED_ORIGINS: 'https://sitelens.pl' };
const ORIGIN = 'https://sitelens.pl';

function setup(sites = SITES) {
  const net = internet(sites);
  const handle = createHandler({ fetch: net.fetcher as typeof fetch, now: () => 1_000_000 });
  const call = (path: string, body: unknown, headers: Record<string, string> = {}) =>
    handle(
      new Request(`https://proxy.example${path}`, {
        method: 'POST',
        headers: { origin: ORIGIN, 'content-type': 'application/json', ...headers },
        body: JSON.stringify(body),
      }),
      env,
    );
  const pass = async (site = 'example.com') =>
    ((await (await call('/session', { turnstile: 'genuine', site })).json()) as { pass: string }).pass;
  // The pass is for the site of the address, unless that is not a domain a pass can be issued for
  const siteFor = (url: string) => {
    const host = URL.canParse(url) ? new URL(url).hostname : '';
    return /^[a-z0-9.-]+\.[a-z]+$/i.test(host) && host !== 'localhost' ? host : 'example.com';
  };
  // Opening a session reads the homepage, so only what /fetch requests is kept for the checks below
  const fetchUrl = async (url: string, extra: Record<string, unknown> = {}, token?: string) => {
    const authorization = `Bearer ${token ?? (await pass(siteFor(url)))}`;
    net.requests.length = 0;
    return (await (await call('/fetch', { url, ...extra }, { authorization })).json()) as {
      ok: boolean;
      result?: { status: number; body: string; truncated: boolean; finalUrl: string; redirects: unknown[] };
      error?: { code: string; message: string };
    };
  };
  return { net, handle, call, pass, fetchUrl };
}

describe('the proxy', () => {
  it('answers only pages on the allowed origins', async () => {
    const { handle } = setup();
    const response = await handle(
      new Request('https://proxy.example/fetch', {
        method: 'POST',
        headers: { origin: 'https://evil.com' },
        body: '{}',
      }),
      env,
    );
    expect(response.status).toBe(403);
    const preflight = await handle(
      new Request('https://proxy.example/fetch', { method: 'OPTIONS', headers: { origin: ORIGIN } }),
      env,
    );
    expect(preflight.headers.get('access-control-allow-origin')).toBe(ORIGIN);
  });

  it('hands out a pass only for a genuine Turnstile token', async () => {
    const { call } = setup();
    expect((await call('/session', { turnstile: 'genuine', site: 'example.com' })).status).toBe(200);
    expect((await call('/session', { turnstile: 'forged', site: 'example.com' })).status).toBe(403);
  });

  it("refuses Turnstile's always-pass test keys and tokens solved on another site", async () => {
    const { call } = setup();
    expect((await call('/session', { turnstile: 'from-test-keys', site: 'example.com' })).status).toBe(403);
    expect((await call('/session', { turnstile: 'other-site', site: 'example.com' })).status).toBe(403);
  });

  it('opens a session only for a public domain', async () => {
    const { call } = setup();
    for (const site of ['localhost', '10.0.0.1', 'printer.local', '', '..', 'localhost..'])
      expect((await call('/session', { turnstile: 'genuine', site })).status, site).toBe(400);
  });

  it('reads only the audited site, with or without www, so it cannot be used to read the rest of the web', async () => {
    const { fetchUrl, pass, net } = setup();
    const token = await pass('example.com');
    for (const url of ['https://other.example/', 'https://cdn.example.com/x'])
      expect(await fetchUrl(url, {}, token), url).toMatchObject({ ok: false, error: { code: 'blocked' } });
    expect(net.requests).toEqual([]);
    expect((await fetchUrl('https://www.example.com/', {}, token)).ok).toBe(true);
  });

  it('covers the domains the homepage redirects through, found when the session opens', async () => {
    const { fetchUrl, pass } = setup();
    const token = await pass('old.example');
    expect((await fetchUrl('https://new.example/oferta', {}, token)).ok).toBe(true);
  });

  it('reports a redirect off the audited site instead of following it', async () => {
    const { fetchUrl, pass, net } = setup();
    const answer = await fetchUrl('https://example.com/go', {}, await pass('example.com'));
    expect(answer.result).toMatchObject({ status: 302, finalUrl: 'https://example.com/go', body: '' });
    expect(net.requests.some((r) => r.url.startsWith('https://victim.example'))).toBe(false);
  });

  it('fetches nothing without a valid pass', async () => {
    const { call, net } = setup();
    expect((await call('/fetch', { url: 'https://example.com/' })).status).toBe(401);
    expect(
      (await call('/fetch', { url: 'https://example.com/' }, { authorization: 'Bearer forged.pass' })).status,
    ).toBe(401);
    expect(net.requests).toEqual([]);
  });

  it('reads a page with its status, final address and body, as sitelens and only with GET', async () => {
    const { fetchUrl, net } = setup();
    const answer = await fetchUrl('http://example.com/', { method: 'HEAD' });
    expect(answer.ok).toBe(true);
    expect(answer.result).toMatchObject({ status: 200, finalUrl: 'https://example.com/', body: '' });
    expect(answer.result!.redirects).toHaveLength(1);
    expect(net.requests.every((r) => r.method === 'GET' && r.userAgent?.includes('sitelens'))).toBe(true);
    // Asking for compression like a browser lets the compression check see what visitors get
    expect(net.requests.every((r) => r.encoding?.includes('gzip'))).toBe(true);
  });

  it.each([
    'http://localhost/',
    'http://127.0.0.1/',
    'http://[::1]/',
    'http://169.254.169.254/latest/meta-data/',
    'https://evil.example/',
    'https://sneaky.example/',
    'https://example.com:8080/',
    'file:///etc/passwd',
    'https://user:pw@example.com/',
  ])('refuses to fetch %s', async (url) => {
    const { fetchUrl, net } = setup();
    const answer = await fetchUrl(url);
    expect(answer.ok).toBe(false);
    expect(answer.error?.code).toBe('blocked');
    expect(net.requests.filter((r) => !r.url.endsWith('/robots.txt'))).toEqual([]);
  });

  it('never connects to a private address a redirect points to', async () => {
    const { fetchUrl, net } = setup();
    const answer = await fetchUrl('https://redirector.example/');
    expect(answer.result?.status).toBe(301);
    expect(net.requests.some((r) => r.url.startsWith('https://evil.example'))).toBe(false);
  });

  it('refuses a site whose robots.txt cannot be read, and does not remember the failure', async () => {
    const sites = { ...SITES };
    const { fetchUrl } = setup(sites);
    expect((await fetchUrl('https://flaky.example/')).error?.code).toBe('blocked');
    sites['https://flaky.example/robots.txt'] = {
      status: 200,
      body: 'User-agent: *\nDisallow:',
      headers: { 'content-type': 'text/plain' },
    };
    expect((await fetchUrl('https://flaky.example/')).ok).toBe(true);
  });

  it('turns a broken redirect or a broken body into an error of that page', async () => {
    const { fetchUrl } = setup();
    expect((await fetchUrl('https://example.com/bad-redirect')).error?.code).toBe('redirects');
    expect((await fetchUrl('https://example.com/broken-body')).ok).toBe(false);
  });

  it('obeys robots.txt', async () => {
    const { fetchUrl, net } = setup();
    expect((await fetchUrl('https://example.com/private')).error?.code).toBe('blocked');
    expect(net.requests.some((r) => r.url === 'https://example.com/private')).toBe(false);
  });

  it('cuts a large page at 2 MB and says so', async () => {
    const { fetchUrl } = setup();
    const answer = await fetchUrl('https://example.com/big');
    expect(answer.result?.truncated).toBe(true);
    expect(answer.result?.body.length).toBe(2_000_000);
  });

  it('does not read files that are not text', async () => {
    const { fetchUrl } = setup();
    expect((await fetchUrl('https://example.com/favicon.ico')).result).toMatchObject({ status: 200, body: '' });
  });

  it('reports a certificate Cloudflare refused as a certificate problem', async () => {
    const { fetchUrl } = setup();
    expect((await fetchUrl('https://badcert.example/')).error?.code).toBe('tls');
  });

  it('reports a name without addresses as a DNS problem', async () => {
    const { fetchUrl } = setup();
    expect((await fetchUrl('https://nowhere.example/')).error?.code).toBe('dns');
  });
});

describe('the brandbook assets', () => {
  const asset = async (url: string, kind: string, token?: string) => {
    const { call, pass } = setup();
    const authorization = `Bearer ${token ?? (await pass('example.com'))}`;
    return call('/asset', { url, kind }, { authorization });
  };

  it('serves stylesheets, fonts and images from any public host with a valid pass', async () => {
    const css = await asset('https://cdn.example/site.css', 'css');
    expect(css.status).toBe(200);
    expect(css.headers.get('content-type')).toBe('text/css');
    expect(css.headers.get('access-control-allow-origin')).toBe(ORIGIN);
    expect(await css.text()).toBe('body{color:#111}');
    const font = await asset('https://cdn.example/font.woff2', 'font');
    expect(font.status).toBe(200);
    expect(new Uint8Array(await font.arrayBuffer()).subarray(0, 4)).toEqual(new Uint8Array([0x77, 0x4f, 0x46, 0x32]));
    expect((await asset('https://cdn.example/logo.svg', 'image')).headers.get('content-type')).toBe('image/svg+xml');
  });

  it('never returns HTML, whatever kind is asked for', async () => {
    expect((await (await asset('https://cdn.example/page', 'css')).json()) as object).toEqual({ error: { code: 'type', message: 'text/css' } });
    expect((await asset('https://example.com/', 'image')).headers.get('content-type')).toContain('application/json');
  });

  it('checks a font by its first bytes, not by its declared type', async () => {
    const answer = await asset('https://cdn.example/fake.woff2', 'font');
    expect(await answer.json()).toEqual({ error: { code: 'type', message: 'font/woff2' } });
  });

  it('refuses a file over the size limit of its kind', async () => {
    expect(await (await asset('https://cdn.example/big.png', 'image')).json()).toEqual({
      error: { code: 'too-large', message: 'over 600000 bytes' },
    });
  });

  it('loads the files a page needs even where robots.txt closes them to crawlers, like a browser', async () => {
    const answer = await asset('https://cdn.example/private/site.css', 'css');
    expect(answer.headers.get('content-type')).toBe('text/css');
  });

  it('never connects to a private address for a file', async () => {
    expect(((await (await asset('https://evil.example/x.css', 'css')).json()) as { error: { code: string } }).error.code).toBe('blocked');
  });

  it('serves nothing without a valid pass or for an unknown kind', async () => {
    expect((await asset('https://cdn.example/site.css', 'css', 'forged')).status).toBe(401);
    expect((await asset('https://cdn.example/site.css', 'script')).status).toBe(400);
  });
});
