// What the online audit and the online brandbook share: Turnstile, the preview frame, printing to
// PDF and saving files.

interface Turnstile {
  render(container: HTMLElement, options: Record<string, unknown>): string;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

/** Thrown when Turnstile could not confirm a person is there. */
export class NotConfirmed extends Error {}

export const PSI_KEY_STORAGE = 'sitelens-psi-key';

export const fill = (text: string, values: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (whole, name: string) => String(values[name] ?? whole));

export function domainOf(address: string): string {
  try {
    return new URL(/^https?:\/\//i.test(address) ? address : `https://${address}`).hostname.replace(/^www\./, '');
  } catch {
    return address;
  }
}

/** The visitor's own PageSpeed Insights key, if they saved one for this tab. */
export function storedKey(): string | null {
  try {
    return sessionStorage.getItem(PSI_KEY_STORAGE);
  } catch {
    return null;
  }
}

let turnstileScript: Promise<Turnstile> | undefined;

function loadTurnstile(): Promise<Turnstile> {
  turnstileScript ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new NotConfirmed()));
    script.onerror = () => reject(new NotConfirmed());
    document.head.append(script);
  });
  return turnstileScript;
}

/** A Turnstile token; the widget shows itself only when Cloudflare needs the visitor to click. */
export async function confirmHuman(container: HTMLElement, siteKey: string, lang: string): Promise<string> {
  const turnstile = await loadTurnstile();
  container.hidden = false;
  return new Promise((resolve, reject) => {
    const fail = () => {
      reject(new NotConfirmed());
      return true;
    };
    const widget = turnstile.render(container, {
      sitekey: siteKey,
      language: lang,
      appearance: 'interaction-only',
      theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
      callback: (token: string) => {
        turnstile.remove(widget);
        container.hidden = true;
        resolve(token);
      },
      'error-callback': fail,
      'expired-callback': fail,
      'timeout-callback': fail,
    });
  });
}

export function saveFile(name: string, data: BlobPart, type: string) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([data], { type }));
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

/** The document is a stack of A4 pages; on a narrow screen the whole stack is scaled down to fit. */
export function fitFrame(frame: HTMLIFrameElement) {
  const doc = frame.contentDocument;
  if (!doc?.documentElement) return;
  doc.documentElement.style.zoom = '';
  const width = doc.documentElement.scrollWidth;
  const height = doc.documentElement.scrollHeight;
  const scale = Math.min(1, frame.clientWidth / width);
  doc.documentElement.style.zoom = String(scale);
  frame.style.height = `${Math.ceil(height * scale)}px`;
}

/** Shows the document in the preview frame and waits until it has laid out its pages. */
export async function loadIntoFrame(frame: HTMLIFrameElement, html: string) {
  frame.style.height = '';
  frame.srcdoc = html;
  await new Promise<void>((resolve) => frame.addEventListener('load', () => resolve(), { once: true }));
  const started = Date.now();
  // The document paginates itself after its fonts load and says so with window.sitelensReady
  while (!(frame.contentWindow as (Window & { sitelensReady?: boolean }) | null)?.sitelensReady && Date.now() - started < 15_000)
    await new Promise((resolve) => setTimeout(resolve, 100));
}

/**
 * Opens the print dialog for the document in the frame, so the visitor can save it as PDF. On a phone
 * the page width is the document's own (840 for portrait A4, 1180 for landscape).
 */
export function printFrame(frame: HTMLIFrameElement, html: string, pageWidth: number) {
  // Phones print the whole page around a frame (iOS) or shrink it, so there the document opens in a
  // tab of its own and prints from there. A blob address cannot resolve the font paths, hence the
  // base; the fixed viewport fits a whole A4 page to the phone's width instead of scrolling sideways.
  const standalone = html
    .replace('<head>', `<head>\n<base href="${location.origin}/">`)
    .replace('content="width=device-width, initial-scale=1"', `content="width=${pageWidth}"`);
  const tab = matchMedia('(pointer: coarse)').matches
    ? window.open(URL.createObjectURL(new Blob([standalone], { type: 'text/html' })), '_blank')
    : null;
  if (tab) {
    const started = Date.now();
    const printWhenReady = () => {
      if ((tab as Window & { sitelensReady?: boolean }).sitelensReady) tab.print();
      else if (Date.now() - started < 15_000) setTimeout(printWhenReady, 200);
    };
    printWhenReady();
    return;
  }
  const win = frame.contentWindow;
  const doc = frame.contentDocument;
  if (!win || !doc) return;
  // Print at full size; the preview scaling is only for the screen
  doc.documentElement.style.zoom = '';
  win.addEventListener('afterprint', () => fitFrame(frame), { once: true });
  win.print();
}
