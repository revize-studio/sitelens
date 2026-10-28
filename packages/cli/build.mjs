// Bundles the CLI and the workspace packages into one file; heavy runtime dependencies stay
// external and are installed from npm with the package.
import { copyFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { build } from 'esbuild';

const root = new URL('../../', import.meta.url);
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const dist = new URL('./dist/', import.meta.url);

rmSync(dist, { recursive: true, force: true });
await build({
  entryPoints: [new URL('./src/cli.ts', import.meta.url).pathname],
  outfile: new URL('cli.js', dist).pathname,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  banner: { js: '#!/usr/bin/env node' },
  external: Object.keys(pkg.dependencies),
  define: { SITELENS_VERSION: JSON.stringify(pkg.version) },
  legalComments: 'none',
  logLevel: 'warning',
});

mkdirSync(new URL('assets/', dist), { recursive: true });
for (const [from, to] of [
  ['public/fonts/InstrumentSans-Variable.woff2', 'InstrumentSans-Variable.woff2'],
  ['public/fonts/GeistMono-Variable.woff2', 'GeistMono-Variable.woff2'],
  ['public/fonts/OFL-InstrumentSans.txt', 'OFL-InstrumentSans.txt'],
  ['public/fonts/OFL-GeistMono.txt', 'OFL-GeistMono.txt'],
  ['public/logo/sitelens-logo.svg', 'sitelens-logo.svg'],
  ['packages/report/fonts/Geist-Variable.woff2', 'Geist-Variable.woff2'],
  ['packages/report/fonts/OFL-Geist.txt', 'OFL-Geist.txt'],
])
  copyFileSync(new URL(from, root), new URL(`assets/${to}`, dist));
console.log(`dist/cli.js (sitelens ${pkg.version})`);
