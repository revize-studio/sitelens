// Sets the response headers after the build: dist/_headers (Cloudflare/Netlify format, also read
// by the local preview server) and, on Vercel, the Build Output API config with the same rules.
// The CSP lists a hash for every inline script and style Astro emitted, so it needs no 'unsafe-inline'.
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
const vercelOutput = new URL('../.vercel/output/', import.meta.url).pathname;

function* htmlFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(path);
    else if (entry.name.endsWith('.html')) yield path;
  }
}

const hash = (text) => `'sha256-${createHash('sha256').update(text, 'utf8').digest('base64')}'`;
const scripts = new Set();
const styles = new Set();

for (const file of htmlFiles(dist)) {
  const html = readFileSync(file, 'utf8');
  for (const [, attrs, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/\bsrc=/.test(attrs) || /application\/ld\+json/.test(attrs) || !body) continue;
    scripts.add(hash(body));
  }
  for (const [, body] of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)) styles.add(hash(body));
  if (/\sstyle="/.test(html)) throw new Error(`${file} has a style attribute; CSP would block it.`);
}

// The online audit (on when its three PUBLIC_ variables are set) talks to the proxy, to PageSpeed
// Insights and to Cloudflare Turnstile; without it the policy stays as strict as before
try {
  process.loadEnvFile(new URL('../.env', import.meta.url).pathname);
} catch {
  // No .env file: the variables come from the environment, as on Vercel
}
const { PUBLIC_PROXY_URL, PUBLIC_TURNSTILE_SITE_KEY, PUBLIC_PSI_KEY } = process.env;
const online = Boolean(PUBLIC_PROXY_URL && PUBLIC_TURNSTILE_SITE_KEY && PUBLIC_PSI_KEY);
const turnstile = 'https://challenges.cloudflare.com';
const onlineSources = online ? ` ${new URL(PUBLIC_PROXY_URL).origin} https://www.googleapis.com` : '';

// The brandbook page renders a site's own styles (inline, and fonts and logos as local blob: copies)
// in a sandboxed frame that inherits this policy, so its styles cannot be listed by hash. Scripts stay
// hash-only there too; a hash next to 'unsafe-inline' would make browsers ignore 'unsafe-inline'.
const policy = ({ brandbook = false } = {}) => [
  "default-src 'self'",
  `script-src 'self' ${[...scripts].join(' ')}${online ? ` ${turnstile}` : ''}`,
  brandbook ? "style-src 'self' 'unsafe-inline' blob: data:" : `style-src 'self' ${[...styles].join(' ')}`,
  `img-src 'self' data:${brandbook ? ' blob:' : ''}`,
  `font-src 'self'${brandbook ? ' blob: data:' : ''}`,
  `connect-src 'self'${onlineSources}`,
  ...(online ? [`frame-src 'self' ${turnstile}`] : []),
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');
const csp = policy();

// The installers are piped into sh and PowerShell; Windows PowerShell 5.1 decodes text without a
// charset as Latin-1, which would garble the Polish messages
const installer = { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' };
const rules = [
  {
    path: '/*',
    headers: {
      'Content-Security-Policy': csp,
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
  { path: '/brandbook*', headers: { 'Content-Security-Policy': policy({ brandbook: true }) } },
  { path: '/en/brandbook*', headers: { 'Content-Security-Policy': policy({ brandbook: true }) } },
  { path: '/_astro/*', headers: { 'Cache-Control': 'public, max-age=31536000, immutable' } },
  { path: '/install.sh', headers: installer },
  { path: '/install.ps1', headers: installer },
];

writeFileSync(
  join(dist, '_headers'),
  rules.map(({ path, headers }) => `${path}\n${Object.entries(headers).map(([k, v]) => `  ${k}: ${v}\n`).join('')}`).join('\n'),
);
console.log(`_headers: ${scripts.size} script and ${styles.size} style hashes${online ? ', online audit on' : ''}`);

// Vercel ignores _headers. A build that leaves .vercel/output behind is deployed as is, so the
// same rules go into its routes, and the static copy leaves the _headers file out.
if (process.env.VERCEL) {
  const pattern = (path) => `^${path.replaceAll('.', '\\.').replace('*', '(.*)')}$`;
  rmSync(vercelOutput, { recursive: true, force: true });
  cpSync(dist, join(vercelOutput, 'static'), { recursive: true, filter: (source) => !source.endsWith('/_headers') });
  mkdirSync(vercelOutput, { recursive: true });
  const config = {
    version: 3,
    routes: [
      ...rules.map(({ path, headers }) => ({ src: pattern(path), headers, continue: true })),
      { handle: 'filesystem' },
      { src: '^/(.*)$', status: 404, dest: '/404.html' },
    ],
  };
  writeFileSync(join(vercelOutput, 'config.json'), `${JSON.stringify(config, null, 2)}\n`);
  console.log(`.vercel/output: ${rules.length} header rules`);
}
