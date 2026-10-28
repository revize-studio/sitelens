// A pretend internet for the proxy tests: DNS over HTTPS, Turnstile and a few sites.

export const DNS: Record<string, string[]> = {
  'example.com': ['93.184.216.34'],
  'www.example.com': ['93.184.216.34'],
  'redirector.example': ['93.184.216.35'],
  'evil.example': ['10.0.0.5'],
  'sneaky.example': ['93.184.216.36', 'fd00::1'],
  'badcert.example': ['93.184.216.37'],
  'old.example': ['93.184.216.38'],
  'new.example': ['93.184.216.39'],
  'flaky.example': ['93.184.216.40'],
  'cdn.example': ['93.184.216.41'],
};

export type Route = { status: number; body?: string | Uint8Array<ArrayBuffer>; headers?: Record<string, string> };

/** A pretend internet: DNS over HTTPS, Turnstile and a few sites. It records every site request. */
export function internet(sites: Record<string, Route>) {
  const requests: { url: string; method: string; userAgent: string | null; encoding: string | null }[] = [];
  const fetcher = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = new URL(String(input));
    if (url.hostname === 'cloudflare-dns.com') {
      const name = url.searchParams.get('name')!;
      const type = Number(url.searchParams.get('type'));
      const records = (DNS[name] ?? []).filter((ip) => (type === 28) === ip.includes(':'));
      return Response.json({ Status: 0, Answer: records.map((data) => ({ type, data })) });
    }
    if (url.hostname === 'challenges.cloudflare.com') {
      const form = init?.body as FormData;
      const token = form.get('response');
      if (token === 'from-test-keys')
        return Response.json({ success: true, hostname: 'example.com', metadata: { result_with_testing_key: true } });
      if (token === 'other-site') return Response.json({ success: true, hostname: 'evil.com' });
      return Response.json({
        success: token === 'genuine' && form.get('secret') === 'test-secret',
        hostname: 'sitelens.pl',
      });
    }
    requests.push({
      url: url.toString(),
      method: init?.method ?? 'GET',
      userAgent: new Headers(init?.headers).get('user-agent'),
      encoding: new Headers(init?.headers).get('accept-encoding'),
    });
    if (url.toString() === 'https://example.com/broken-body')
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('<!doctype html>'));
            controller.error(new Error('connection reset'));
          },
        }),
        { status: 200, headers: { 'content-type': 'text/html' } },
      );
    const route = sites[url.toString()] ?? { status: 404, body: 'Not found', headers: { 'content-type': 'text/html' } };
    return new Response(route.body ?? null, { status: route.status, headers: route.headers });
  };
  return { fetcher, requests };
}

export const html = (text: string): Route => ({
  status: 200,
  body: `<!doctype html><title>${text}</title>`,
  headers: { 'content-type': 'text/html; charset=utf-8' },
});

export const SITES: Record<string, Route> = {
  'https://example.com/robots.txt': {
    status: 200,
    body: 'User-agent: *\nDisallow: /private',
    headers: { 'content-type': 'text/plain' },
  },
  'https://example.com/': html('Example'),
  'https://example.com/private': html('Secret'),
  'https://example.com/big': {
    status: 200,
    body: new Uint8Array(3_000_000).fill(97),
    headers: { 'content-type': 'text/html' },
  },
  'https://example.com/favicon.ico': {
    status: 200,
    body: new Uint8Array([0, 1, 2]),
    headers: { 'content-type': 'image/x-icon' },
  },
  'https://redirector.example/': { status: 301, headers: { location: 'https://evil.example/' } },
  'http://example.com/': { status: 301, headers: { location: 'https://example.com/' } },
  'https://old.example/': { status: 301, headers: { location: 'https://new.example/' } },
  'https://example.com/go': { status: 302, headers: { location: 'https://victim.example/private-page' } },
  'https://example.com/bad-redirect': { status: 301, headers: { location: 'http://[' } },
  'https://flaky.example/robots.txt': { status: 503, body: 'Unavailable', headers: { 'content-type': 'text/plain' } },
  'https://flaky.example/': html('Flaky'),
  'https://new.example/': html('New'),
  'https://new.example/oferta': html('Oferta'),
  'https://cdn.example/robots.txt': { status: 200, body: 'User-agent: *\nDisallow: /private', headers: { 'content-type': 'text/plain' } },
  'https://cdn.example/site.css': { status: 200, body: 'body{color:#111}', headers: { 'content-type': 'text/css; charset=utf-8' } },
  'https://cdn.example/private/site.css': { status: 200, body: 'body{}', headers: { 'content-type': 'text/css' } },
  'https://cdn.example/font.woff2': {
    status: 200,
    body: new Uint8Array([0x77, 0x4f, 0x46, 0x32, 0, 1, 2, 3]),
    headers: { 'content-type': 'application/octet-stream' },
  },
  'https://cdn.example/fake.woff2': { status: 200, body: 'not a font at all', headers: { 'content-type': 'font/woff2' } },
  'https://cdn.example/logo.svg': { status: 200, body: '<svg xmlns="http://www.w3.org/2000/svg"/>', headers: { 'content-type': 'image/svg+xml' } },
  'https://cdn.example/page': { status: 200, body: '<!doctype html><title>x</title>', headers: { 'content-type': 'text/css' } },
  'https://cdn.example/big.png': { status: 200, body: new Uint8Array(700_000), headers: { 'content-type': 'image/png' } },
  'https://badcert.example/': {
    status: 526,
    body: 'Invalid SSL certificate',
    headers: { 'content-type': 'text/html' },
  },
};
