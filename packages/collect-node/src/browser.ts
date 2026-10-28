import { existsSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import { chromium } from 'playwright-core';

export interface BrowserInfo {
  name: string;
  path: string;
}

function windowsCandidates(): BrowserInfo[] {
  const roots = [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA].filter(
    (root): root is string => Boolean(root),
  );
  const apps = [
    ['Google Chrome', 'Google\\Chrome\\Application\\chrome.exe'],
    ['Microsoft Edge', 'Microsoft\\Edge\\Application\\msedge.exe'],
    ['Brave', 'BraveSoftware\\Brave-Browser\\Application\\brave.exe'],
    ['Chromium', 'Chromium\\Application\\chrome.exe'],
  ];
  return roots.flatMap((root) => apps.map(([name, rel]) => ({ name: name!, path: join(root, rel!) })));
}

function macCandidates(): BrowserInfo[] {
  const apps = [
    ['Google Chrome', 'Google Chrome.app/Contents/MacOS/Google Chrome'],
    ['Microsoft Edge', 'Microsoft Edge.app/Contents/MacOS/Microsoft Edge'],
    ['Brave', 'Brave Browser.app/Contents/MacOS/Brave Browser'],
    ['Chromium', 'Chromium.app/Contents/MacOS/Chromium'],
    ['Google Chrome Canary', 'Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary'],
  ];
  const dirs = ['/Applications', join(process.env.HOME ?? '', 'Applications')];
  return dirs.flatMap((dir) => apps.map(([name, rel]) => ({ name: name!, path: join(dir, rel!) })));
}

function linuxCandidates(): BrowserInfo[] {
  const names = [
    'google-chrome',
    'google-chrome-stable',
    'chromium',
    'chromium-browser',
    'microsoft-edge',
    'brave-browser',
  ];
  const dirs = (process.env.PATH ?? '').split(delimiter).filter(Boolean);
  return dirs.flatMap((dir) => names.map((name) => ({ name, path: join(dir, name) })));
}

/**
 * Finds a Chromium-based browser already on the computer, so `npx sitelens` does not have to
 * download 150 MB. SITELENS_CHROME points at a specific one; Playwright's own Chromium is last.
 */
export function findBrowser(): BrowserInfo | null {
  const override = process.env.SITELENS_CHROME ?? process.env.CHROME_PATH;
  if (override) return existsSync(override) ? { name: 'SITELENS_CHROME', path: override } : null;
  const candidates =
    process.platform === 'win32'
      ? windowsCandidates()
      : process.platform === 'darwin'
        ? macCandidates()
        : linuxCandidates();
  candidates.push({ name: 'Chromium (Playwright)', path: chromium.executablePath() });
  return candidates.find((candidate) => existsSync(candidate.path)) ?? null;
}
