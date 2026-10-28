// Runs the brandbook generator in the browser: Turnstile, a proxy pass, the site rendered in a
// sandboxed frame and read by the shared extraction, then the same analysis and brandbook as the
// CLI. The heavy modules load only when a brandbook starts, so the page itself stays light.
import type { BrandOnlineProgress, BrandOnlineResult, BrandOnlineStage } from '@sitelens/collect-web';
import type { Lang } from '@sitelens/core';
import {
  confirmHuman,
  domainOf,
  fill,
  fitFrame,
  loadIntoFrame,
  NotConfirmed,
  printFrame,
  saveFile,
  storedKey,
} from './online-shared';

interface Config {
  proxyUrl: string;
  turnstileSiteKey: string;
  psiKey: string;
  lang: Lang;
  version: string;
  fonts: { sans: string; mono: string };
  strings: { progress: string; done: string; summary: string; errors: Record<string, string> };
}

type Step = 'human' | BrandOnlineStage | 'brandbook';
const STEPS: Step[] = ['human', 'page', 'styles', 'render', 'pages', 'screenshots', 'brandbook'];
// The CLI's default; the CLI can read up to 10, but online every page is another round of requests through the proxy
const PAGES = 2;

const base64 = (bytes: Uint8Array) => {
  let text = '';
  for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(text);
};
const dataUri = (bytes: Uint8Array, type: string) => `data:${type};base64,${base64(bytes)}`;
// The HTML brandbook in the package has to work offline, so it carries Geist inside itself
const fontData = async (url: string) => dataUri(new Uint8Array(await (await fetch(url)).arrayBuffer()), 'font/woff2');

function init(root: HTMLElement) {
  const config = JSON.parse(root.dataset.config ?? '{}') as Config;
  const s = config.strings;
  const $ = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const form = root.querySelector<HTMLFormElement>('form.url-form');
  if (!form) return;
  const input = form.querySelector<HTMLInputElement>('input[name="url"]')!;
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const human = $('[data-human]');
  const progress = $('[data-progress]');
  const announce = $('[data-announce]');
  const problem = $('[data-error]');
  const result = $('[data-result]');
  const frame = $<HTMLIFrameElement>('[data-preview]');
  const printable = $<HTMLIFrameElement>('[data-print]');
  const stage = $('[data-stage]');
  const sample = document.querySelector<HTMLElement>('[data-sample]');

  let running = false;
  let lastAddress = '';
  let pdfHtml = '';
  let pageSize: ResizeObserver | undefined;

  const setStep = (step: Step, state: 'waiting' | 'active' | 'done', count = '') => {
    const item = progress.querySelector<HTMLElement>(`[data-step="${step}"]`)!;
    item.dataset.state = state;
    item.querySelector<HTMLElement>('[data-count]')!.textContent = count;
    if (state === 'active') announce.textContent = item.querySelector('.label')!.textContent ?? '';
  };
  const reach = (step: Step, count = '') => {
    const index = STEPS.indexOf(step);
    STEPS.forEach((other, i) => {
      if (i < index) setStep(other, 'done');
    });
    setStep(step, 'active', count);
  };
  const onProgress = ({ stage: step, done, total }: BrandOnlineProgress) =>
    reach(step, step === 'pages' ? `${done + 1}/${total}` : '');

  const showError = (key: string, detail = '') => {
    progress.hidden = true;
    human.hidden = true;
    result.hidden = true;
    $('[data-error-text]').textContent = fill(s.errors[key] ?? s.errors.unknown!, { detail });
    problem.hidden = false;
  };

  const messageFor = async (error: unknown): Promise<[string, string]> => {
    const { BotCheckError, PreflightError, ProxyError } = await import('@sitelens/collect-web');
    if (error instanceof NotConfirmed) return ['human', ''];
    if (error instanceof BotCheckError) return ['bot', ''];
    if (error instanceof ProxyError) return [error.problem === 'pass' ? 'pass' : 'limit', ''];
    if (error instanceof PreflightError) {
      if (error.code === 'blocked') return [/robots\.txt/.test(error.detail) ? 'robots' : 'blocked', ''];
      return [error.code, error.detail];
    }
    return ['unknown', error instanceof Error ? error.message : String(error)];
  };

  const showBrandbook = async (collected: BrandOnlineResult) => {
    reach('brandbook');
    const [{ analyseBrand, familyName, isOpenFont }, { brandbookPackage, renderBrandbook, renderInteractiveBrandbook }, { zipSync }, fonts] =
      await Promise.all([
        import('@sitelens/brand'),
        import('@sitelens/report'),
        import('fflate'),
        Promise.all([fontData(config.fonts.sans), fontData(config.fonts.mono)]),
      ]);
    const book = analyseBrand(collected.raw, { lang: config.lang });
    const shown = new Set([book.typography.heading, book.typography.body, ...book.typography.styles.map((x) => x.family)]);
    // Only typefaces under an open licence are embedded; the rest of the brandbook is set in Geist
    const open = new Set(
      book.typography.families.filter((f) => shown.has(f.name) && (f.openLicence || isOpenFont(f.name))).map((f) => f.name),
    );
    const images: Record<string, string> = {};
    for (const [name, bytes] of collected.shots) images[name] = dataUri(bytes, name === 'nav' ? 'image/png' : 'image/jpeg');
    for (const [url, bytes] of collected.files) images[url] = dataUri(bytes, collected.types.get(url) || 'application/octet-stream');
    const [fontSans, fontMono] = fonts;
    pdfHtml = renderBrandbook(
      book,
      {
        fontSans,
        fontMono,
        brandFonts: collected.fonts
          .filter((f) => open.has(familyName(f.family)))
          .map((f) => ({ ...f, family: familyName(f.family), src: dataUri(f.bytes, f.type) })),
        images,
      },
      config.lang,
    );
    const pageHtml = renderInteractiveBrandbook(book, { fontSans, fontMono, images }, config.lang);

    // The A4 version measures its blocks to lay out the pages, so it waits laid out but out of sight
    result.style.visibility = 'hidden';
    result.hidden = false;
    await Promise.all([loadIntoFrame(frame, pageHtml), loadIntoFrame(printable, pdfHtml)]);
    // Colour formats and token tabs change the page's height
    pageSize?.disconnect();
    pageSize = new ResizeObserver(() => fitFrame(frame));
    pageSize.observe(frame.contentDocument!.body);
    setStep('brandbook', 'done');
    progress.hidden = true;
    if (sample) sample.hidden = true;

    const colours = Object.values(book.colors.groups).reduce((sum, list) => sum + list.length, 0);
    $('[data-result-title]').textContent = fill(s.done, { name: book.name });
    $('[data-summary]').textContent = fill(s.summary, {
      colors: colours,
      fonts: book.typography.families.slice(0, 3).map((f) => f.name).join(', '),
    });
    $('[data-limited]').hidden = !collected.raw.limited;
    $('[data-no-shots]').hidden = collected.shots.has('desktop');

    const files = brandbookPackage(book, { files: collected.files, types: collected.types, shots: collected.shots }, config.lang, {
      pdf: false,
      html: true,
      tokens: true,
      json: false,
    });
    files.unshift({ path: 'brandbook.html', data: pageHtml });
    const encoder = new TextEncoder();
    const zip = (entries: typeof files, folder: string) =>
      zipSync(
        Object.fromEntries(entries.map((e) => [`${folder}/${e.path}`, typeof e.data === 'string' ? encoder.encode(e.data) : e.data])),
        { level: 6 },
      );
    $<HTMLButtonElement>('[data-tokens]').onclick = () =>
      saveFile(
        `tokens-${book.host}.zip`,
        zip(files.filter((f) => /^(tokens\.(css|json)|tailwind\.css)$/.test(f.path)), `tokens-${book.host}`) as BlobPart,
        'application/zip',
      );
    $<HTMLButtonElement>('[data-zip]').onclick = () =>
      saveFile(`brandbook-${book.host}.zip`, zip(files, `brandbook-${book.host}`) as BlobPart, 'application/zip');

    fitFrame(frame);
    result.style.visibility = '';
    $('[data-result-title]').focus();
  };

  const start = async (address: string) => {
    if (running) return;
    running = true;
    submit.disabled = true;
    lastAddress = address;
    problem.hidden = true;
    result.hidden = true;
    progress.hidden = false;
    STEPS.forEach((step) => setStep(step, 'waiting'));
    $('[data-progress-title]').textContent = fill(s.progress, { domain: domainOf(address) });
    try {
      // Start downloading the generator while the visitor is being confirmed
      const collect = import('@sitelens/collect-web');
      reach('human');
      const token = await confirmHuman(human, config.turnstileSiteKey, config.lang);
      const { collectBrandOnline, openSession, releaseBrandFiles } = await collect;
      releaseBrandFiles();
      reach('page');
      const pass = await openSession(config.proxyUrl, token, address);
      const collected = await collectBrandOnline({
        url: address,
        pages: PAGES,
        proxy: { endpoint: config.proxyUrl, pass },
        psi: { key: storedKey() ?? config.psiKey, lang: config.lang },
        stage,
        sitelensVersion: config.version,
        onProgress,
      });
      await showBrandbook(collected);
    } catch (error) {
      const [key, detail] = await messageFor(error);
      showError(key, detail);
    } finally {
      stage.replaceChildren();
      running = false;
      submit.disabled = false;
    }
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const address = input.value.trim();
    if (!address) return;
    history.replaceState(null, '', `?${new URLSearchParams({ url: address })}`);
    void start(address);
  });
  $<HTMLButtonElement>('[data-retry]').addEventListener('click', () => lastAddress && void start(lastAddress));
  $<HTMLButtonElement>('[data-pdf]').addEventListener('click', () => printFrame(printable, pdfHtml, 1180));
  new ResizeObserver(() => !result.hidden && fitFrame(frame)).observe(frame.parentElement!);

  const requested = new URLSearchParams(location.search).get('url')?.trim();
  if (requested) {
    input.value = requested;
    void start(requested);
  }
}

const root = document.querySelector<HTMLElement>('[data-brandbook]');
if (root) init(root);
