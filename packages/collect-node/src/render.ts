import axe from 'axe-core';
import type { AxeResults as AxeRun, RunOptions } from 'axe-core';
import type { AxeResults, ConsoleEntry, CookieEntry, NetworkEntry, RenderedPage } from '@sitelens/core';
import { chromium, type Browser, type Request } from 'playwright-core';
import { SITELENS_URL } from './http';

const AXE_OPTIONS: RunOptions = {
  runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
  resultTypes: ['violations', 'passes'],
};

export const axeVersion = axe.version;

export function launchBrowser(executablePath: string): Promise<Browser> {
  return chromium.launch({ executablePath, headless: true, args: ['--no-first-run', '--no-default-browser-check'] });
}

const userAgents = new WeakMap<Browser, Promise<string>>();

// Some servers answer "HeadlessChrome" with an error page, so present the regular Chrome it is and say who is asking
export function userAgentFor(browser: Browser): Promise<string> {
  let agent = userAgents.get(browser);
  if (!agent) {
    agent = browser.newPage().then(async (page) => {
      const own = await page.evaluate(() => navigator.userAgent);
      await page.close();
      return `${own.replace('HeadlessChrome', 'Chrome')} sitelens (+${SITELENS_URL})`;
    });
    userAgents.set(browser, agent);
  }
  return agent;
}

function toAxeResults(run: AxeRun): AxeResults {
  return {
    violations: run.violations.map((v) => ({
      id: v.id,
      impact: v.impact ?? 'minor',
      help: v.help,
      tags: v.tags,
      count: v.nodes.length,
      nodes: v.nodes.slice(0, 20).map((node) => {
        const data = node.any[0]?.data as
          { contrastRatio?: number; expectedContrastRatio?: string; fgColor?: string; bgColor?: string } | undefined;
        return {
          target: node.target.map(String).join(' '),
          html: node.html.slice(0, 300),
          summary: node.failureSummary?.slice(0, 300),
          ...(data?.contrastRatio && data.fgColor && data.bgColor
            ? {
                contrast: {
                  ratio: data.contrastRatio,
                  expected: Number.parseFloat(data.expectedContrastRatio ?? '4.5'),
                  fg: data.fgColor,
                  bg: data.bgColor,
                },
              }
            : {}),
        };
      }),
    })),
    passes: run.passes.map((p) => p.id),
  };
}

export interface RenderOptions {
  /** The site's certificate failed verification; render it anyway so the rest can be audited */
  insecure?: boolean;
}

/** Opens the page like a visitor on a laptop and records what the browser saw. */
export async function renderPage(browser: Browser, url: string, options: RenderOptions = {}): Promise<RenderedPage> {
  const context = await browser.newContext({
    userAgent: await userAgentFor(browser),
    viewport: { width: 1366, height: 900 },
    ignoreHTTPSErrors: options.insecure ?? false,
    locale: 'pl-PL',
  });
  const page = await context.newPage();
  const network: NetworkEntry[] = [];
  const consoleEntries: ConsoleEntry[] = [];
  const pending: Promise<void>[] = [];

  page.on('console', (message) => {
    const type = message.type();
    if (type === 'error' || type === 'warning') consoleEntries.push({ type, text: message.text().slice(0, 500) });
  });
  page.on('pageerror', (error) => consoleEntries.push({ type: 'error', text: error.message.slice(0, 500) }));
  const record = async (request: Request) => {
    const response = await request.response();
    const sizes = await request.sizes().catch(() => null);
    network.push({
      url: request.url(),
      type: request.resourceType(),
      status: response?.status() ?? 0,
      transferSize: sizes ? sizes.responseBodySize + sizes.responseHeadersSize : undefined,
      mimeType: response?.headers()['content-type'],
    });
  };
  page.on('requestfinished', (request) => pending.push(record(request)));
  page.on('requestfailed', (request) =>
    network.push({
      url: request.url(),
      type: request.resourceType(),
      status: 0,
      failed: request.failure()?.errorText ?? 'failed',
    }),
  );

  try {
    const response = await page.goto(url, { waitUntil: 'load', timeout: 45_000 });
    // Auditing an error page the browser alone was shown would describe the wrong page
    if (response && response.status() >= 400)
      throw new Error(
        `the server answered the browser with HTTP ${response.status()}, so this page was not checked in the browser`,
      );
    // Late requests (lazy images, analytics) count too; a page that never goes quiet is not an error
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);
    // Scroll like a visitor, so lazy images load and scroll-triggered content appears, then let
    // entrance animations finish: axe should judge what people see, not a half-faded first frame
    await page.evaluate(async () => {
      const step = innerHeight * 0.9;
      for (let y = 0, i = 0; y < document.documentElement.scrollHeight && i < 12; y += step, i++) {
        scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 120));
      }
      scrollTo(0, 0);
    });
    await page.waitForLoadState('networkidle', { timeout: 3_000 }).catch(() => undefined);
    await page.evaluate(() =>
      Promise.race([
        Promise.all(
          document
            .getAnimations()
            .filter((animation) => animation.effect?.getComputedTiming().endTime !== Infinity)
            .map((animation) => animation.finished.catch(() => undefined)),
        ),
        new Promise((resolve) => setTimeout(resolve, 3_000)),
      ]),
    );
    const html = await page.content();
    const cookies: CookieEntry[] = (await context.cookies()).map((c) => ({
      name: c.name,
      domain: c.domain,
      path: c.path,
      expires: c.expires > 0 ? c.expires : undefined,
      secure: c.secure,
      httpOnly: c.httpOnly,
      sameSite: c.sameSite,
    }));
    await page.evaluate(axe.source);
    const run = await page.evaluate(
      (opts) => (window as unknown as { axe: typeof axe }).axe.run(document, opts),
      AXE_OPTIONS,
    );
    await Promise.allSettled(pending);
    return { html, network, cookies, console: consoleEntries, axe: toAxeResults(run) };
  } finally {
    await context.close();
  }
}
