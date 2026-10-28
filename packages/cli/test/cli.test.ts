import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findBrowser } from '@sitelens/collect-node';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { serveFixture } from '../../collect-node/test/server';

const cli = new URL('../dist/cli.js', import.meta.url).pathname;
const run = (args: string[], env: Record<string, string> = {}) =>
  spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', env: { ...process.env, NO_COLOR: '1', ...env } });

// The fixture server lives in this process, so the audit must not block it: spawn, not spawnSync
function runAsync(args: string[], env: Record<string, string> = {}) {
  return new Promise<{ status: number | null; stdout: string; stderr: string }>((resolve) => {
    const child = spawn(process.execPath, [cli, ...args], { env: { ...process.env, NO_COLOR: '1', ...env } });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('close', (status) => resolve({ status, stdout, stderr }));
  });
}

beforeAll(() => {
  execFileSync(process.execPath, [new URL('../build.mjs', import.meta.url).pathname]);
}, 60_000);

describe('sitelens command', () => {
  it('prints help and the version', () => {
    expect(run(['--help']).stdout).toContain('sitelens <adres strony>');
    expect(run(['--version', '--lang', 'en']).status).toBe(0);
  });
  it('writes commands the way the person started sitelens', () => {
    expect(run(['--help'], { npm_command: 'exec' }).stdout).toContain('npx sitelens <adres strony>');
    expect(run(['--help'], { npm_command: '' }).stdout).not.toContain('npx sitelens');
  });
  it('explains what is missing when there is no address', () => {
    const result = run([]);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('Podaj adres strony');
  });
  it('rejects a wrong option value with a usage message', () => {
    const result = run(['https://example.com', '--pages', 'dużo']);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('--pages wymaga liczby');
  });
});

describe.skipIf(!findBrowser())('a full audit from the command line', () => {
  let site: Awaited<ReturnType<typeof serveFixture>>;
  let dir: string;
  beforeAll(async () => {
    site = await serveFixture('broken');
    dir = mkdtempSync(join(tmpdir(), 'sitelens-'));
  });
  afterAll(async () => {
    await site.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('writes a paginated PDF and the JSON results', async () => {
    const out = join(dir, 'raport.pdf');
    const result = await runAsync([site.url, '--pages', '3', '--out', out, '--json'], {
      SITELENS_SKIP_LIGHTHOUSE: '1',
    });
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Raport zapisany');
    expect(result.stdout).toContain(out);
    const pdf = readFileSync(out);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g)?.length).toBeGreaterThanOrEqual(5);
    const json = JSON.parse(readFileSync(out.replace(/\.pdf$/, '.json'), 'utf8'));
    expect(json.schemaVersion).toBe(1);
    expect(json.findings.some((f: { checkId: string }) => f.checkId === 'seo/meta-description')).toBe(true);
  }, 120_000);

  it('fails a CI build when the score is under --fail-under', async () => {
    const result = await runAsync([site.url, '--pages', '2', '--out', join(dir, 'ci.pdf'), '--fail-under', '99'], {
      SITELENS_SKIP_LIGHTHOUSE: '1',
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('--fail-under');
  }, 120_000);
});

describe.skipIf(!findBrowser())('a brandbook from the command line', () => {
  let site: Awaited<ReturnType<typeof serveFixture>>;
  let dir: string;
  beforeAll(async () => {
    site = await serveFixture('brand');
    dir = mkdtempSync(join(tmpdir(), 'sitelens-brand-'));
  });
  afterAll(async () => {
    await site.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('writes the PDF, the HTML page, the tokens, the logo files with their sources and a zip', async () => {
    const out = join(dir, 'brandbook-dab');
    const result = await runAsync(['brand', site.url, '--out', out, '--format', 'pdf,html,tokens,zip,json']);
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Brandbook zapisany');
    const pdf = readFileSync(join(out, 'brandbook.pdf'));
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    // The fixture has a dark theme, so the brandbook gets its eighth page
    expect(pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g)?.length).toBe(8);
    const html = readFileSync(join(out, 'brandbook.html'), 'utf8');
    expect(html).toContain('<section class="sec" id="dark"');
    expect(html).not.toMatch(/(src|href)="https?:/);
    const tokens = JSON.parse(readFileSync(join(out, 'tokens.json'), 'utf8'));
    expect(tokens.color.accent.oak.$value.hex).toBe('#9C6B3C');
    expect(readFileSync(join(out, 'tokens.css'), 'utf8')).toContain('--localhost-paper: #f7f3ec;');
    expect(readFileSync(join(out, 'tailwind.css'), 'utf8')).toContain('--color-localhost-paper: #f7f3ec;');
    expect(readFileSync(join(out, 'logo', 'ZRODLA.md'), 'utf8')).toContain(`${site.url}logo.svg`);
    expect(readFileSync(join(out, 'logo', 'logo.svg'), 'utf8')).toContain('#9c6b3c');
    expect(readFileSync(join(out, 'zrzuty', 'komputer.jpg')).subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
    expect(readFileSync(join(out, 'README.md'), 'utf8')).toContain('propozycje');
    expect(readFileSync(`${out}.zip`).subarray(0, 2).toString()).toBe('PK');
  }, 180_000);
});
