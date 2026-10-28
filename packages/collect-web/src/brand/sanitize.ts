/** The policy inside the frame: styles and the local copies of fonts and pictures, nothing else. */
export const FRAME_CSP =
  "default-src 'none'; style-src 'unsafe-inline' blob: data:; font-src blob: data:; img-src blob: data:; form-action 'none'";

/**
 * A site's HTML made safe to render in the sandboxed frame: no scripts, event handlers, frames,
 * plug-ins, refreshes or script addresses, every address made absolute, and a strict CSP first in
 * <head>. It uses nothing from outside its own body, so tests can run it in a real browser.
 */
export function sanitizeHtml(html: string, pageUrl: string, csp: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const REMOVE =
    'script, noscript, iframe, frame, frameset, object, embed, applet, portal, base, template, meta[http-equiv], ' +
    'picture > source, video source, audio source, svg foreignObject, svg animate, svg set, svg animateMotion, svg animateTransform';
  for (const el of [...doc.querySelectorAll(REMOVE)]) el.remove();
  for (const link of [...doc.querySelectorAll('link')]) if (!/(^|\s)stylesheet(\s|$)/i.test(link.rel)) link.remove();

  const URL_ATTRIBUTES = /^(href|src|xlink:href|action|formaction|poster|data|cite|background|lowsrc|dynsrc|codebase|ping)$/i;
  const DROP = /^(on.*|srcdoc|srcset|sizes|formaction|action|ping|imagesrcset|nonce|integrity)$/i;
  // Browsers ignore tabs, newlines and other control characters inside a URL scheme
  const scheme = (value: string) => [...value].filter((ch) => ch.charCodeAt(0) > 32).join('').toLowerCase();
  for (const el of doc.querySelectorAll('*')) {
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase();
      if (DROP.test(name)) {
        el.removeAttribute(attr.name);
        continue;
      }
      if (URL_ATTRIBUTES.test(name)) {
        const value = scheme(attr.value);
        if (/^(javascript|vbscript):/.test(value) || /^data:(text\/html|application\/)/.test(value)) {
          el.removeAttribute(attr.name);
          continue;
        }
        if (!attr.value.startsWith('#') && !/^data:/.test(value)) {
          try {
            el.setAttribute(attr.name, new URL(attr.value, pageUrl).href);
          } catch {
            el.removeAttribute(attr.name);
          }
        }
      }
      // An inline style may still name a picture on the network; the frame's policy would block it anyway
      if (name === 'style' && /url\(/i.test(attr.value)) el.setAttribute('style', attr.value.replace(/url\([^)]*\)/gi, 'none'));
    }
  }

  const meta = doc.createElement('meta');
  meta.setAttribute('http-equiv', 'Content-Security-Policy');
  meta.setAttribute('content', csp);
  doc.head.prepend(meta);
  return `<!doctype html>\n${doc.documentElement.outerHTML}`;
}
