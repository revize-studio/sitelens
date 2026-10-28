import type { Browser } from 'playwright-core';

/** Prints the report page to an A4 PDF once its own layout script says the pages are ready. */
export async function renderPdf(browser: Browser, html: string, path: string): Promise<void> {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    await page.waitForFunction(
      () => (window as unknown as { sitelensReady?: boolean }).sitelensReady === true,
      undefined,
      {
        timeout: 30_000,
      },
    );
    await page.pdf({ path, preferCSSPageSize: true, printBackground: true });
  } finally {
    await context.close();
  }
}
