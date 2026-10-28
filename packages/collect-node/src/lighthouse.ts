import { launch, type LaunchedChrome } from 'chrome-launcher';
import { fromLhr, type Lhr, type LighthouseResult } from '@sitelens/core';
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';

export interface LighthouseRunner {
  run(url: string, formFactor: 'mobile' | 'desktop'): Promise<LighthouseResult>;
  close(): Promise<void>;
  version: string;
}

/** One headless Chrome for all Lighthouse runs; runs go one after another, because parallel runs skew the timings. */
export async function startLighthouse(
  chromePath: string,
  options: { insecure?: boolean } = {},
): Promise<LighthouseRunner> {
  const flags = ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-extensions'];
  if (options.insecure) flags.push('--ignore-certificate-errors');
  const chrome: LaunchedChrome = await launch({ chromePath, chromeFlags: flags, logLevel: 'silent' });
  let version = '';
  return {
    get version() {
      return version;
    },
    async run(url, formFactor) {
      const result = await lighthouse(
        url,
        { port: chrome.port, output: 'json', logLevel: 'silent', onlyCategories: ['performance'] },
        formFactor === 'desktop' ? desktopConfig : undefined,
      );
      if (!result) throw new Error(`Lighthouse returned nothing for ${url}`);
      if (result.lhr.runtimeError)
        throw new Error(`Lighthouse: ${result.lhr.runtimeError.code} ${result.lhr.runtimeError.message}`);
      version = result.lhr.lighthouseVersion;
      // Local runs and PSI share the report format; core reads only the fields it knows
      return fromLhr(result.lhr as unknown as Lhr);
    },
    async close() {
      chrome.kill();
    },
  };
}
