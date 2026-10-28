import { findBrowser, launchBrowser } from '@sitelens/collect-node';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FRAME_CSP, sanitizeHtml } from '../src/brand/sanitize';

const browserInfo = findBrowser();
type Browser = Awaited<ReturnType<typeof launchBrowser>>;
type Page = Awaited<ReturnType<Browser['newPage']>>;

// Attempts to run code from the usual cheat sheets; none may survive the sanitiser
const HOSTILE = `<!doctype html><html><head>
<base href="https://evil.example/">
<meta http-equiv="refresh" content="0;url=javascript:parent.pwned=1">
<script>parent.pwned = 1</script>
<link rel="preload" href="https://evil.example/x.js" as="script">
<link rel="stylesheet" href="/style.css"><link rel="icon" href="/favicon.svg">
</head><body onload="parent.pwned=2">
<img src=x onerror="parent.pwned=3"><img src="/logo.svg" srcset="https://evil.example/a.png 2x">
<svg><script>parent.pwned=4</script><a href="javascript:parent.pwned=5"><rect/></a><animate attributeName="href" to="javascript:parent.pwned=6"/>
<foreignObject><iframe src="javascript:parent.pwned=7"></iframe></foreignObject></svg>
<iframe srcdoc="<script>parent.pwned=8</script>"></iframe><object data="https://evil.example/x.swf"></object><embed src="x.swf">
<a href=" java&#x09;script:parent.pwned=9">link</a><a href="data:text/html,<script>parent.pwned=10</script>">data</a>
<form action="https://evil.example/steal"><button formaction="javascript:parent.pwned=11">go</button></form>
<div style="background:url(https://tracker.example/pixel.png)">styled</div>
<noscript><img src="https://tracker.example/noscript.png"></noscript><template><script>parent.pwned=12</script></template>
<details open ontoggle="parent.pwned=13"><summary>s</summary></details>
</body></html>`;

describe.skipIf(!browserInfo)('sanitizeHtml in a real browser', () => {
  let browser: Browser;
  let page: Page;
  let clean: string;
  beforeAll(async () => {
    browser = await launchBrowser(browserInfo!.path);
    page = await browser.newPage();
    await page.setContent('<!doctype html><title>host</title>');
    // The function travels as source text, the way page.evaluate sends any function
    clean = await page.evaluate<string>(
      `(${sanitizeHtml})(${JSON.stringify(HOSTILE)}, 'https://firma.pl/', ${JSON.stringify(FRAME_CSP)})`,
    );
  });
  afterAll(() => browser?.close());

  it('leaves no script, handler, frame, plug-in, refresh or base', () => {
    expect(clean).not.toMatch(/<script|<iframe|<object|<embed|<base|<noscript|<template|<foreignObject|<animate|http-equiv="refresh"/i);
    expect(clean).not.toMatch(/\son[a-z]+=/i);
    expect(clean).not.toMatch(/javascript:|data:text\/html|srcset|formaction|action=/i);
    expect(clean).not.toMatch(/rel="preload"/);
  });

  it('puts the frame policy first and makes addresses absolute', () => {
    expect(clean).toMatch(/<head><meta http-equiv="Content-Security-Policy" content="default-src 'none';/);
    expect(clean).toContain('href="https://firma.pl/style.css"');
    expect(clean).toContain('src="https://firma.pl/logo.svg"');
    expect(clean).not.toContain('favicon.svg');
    expect(clean).not.toContain('tracker.example/pixel.png');
  });

  it('runs nothing when the result is shown in the sandboxed frame', async () => {
    await page.evaluate(async (html: string) => {
      (window as unknown as { pwned?: number }).pwned = 0;
      const frame = document.createElement('iframe');
      frame.setAttribute('sandbox', 'allow-same-origin');
      const loaded = new Promise((resolve) => frame.addEventListener('load', resolve, { once: true }));
      frame.srcdoc = html;
      document.body.append(frame);
      await loaded;
      frame.contentDocument!.querySelector('details')?.removeAttribute('open');
      for (const link of frame.contentDocument!.querySelectorAll('body > a')) (link as HTMLAnchorElement).click();
      await new Promise((resolve) => setTimeout(resolve, 300));
    }, clean);
    expect(await page.evaluate(() => (window as unknown as { pwned?: number }).pwned)).toBe(0);
  });
});
