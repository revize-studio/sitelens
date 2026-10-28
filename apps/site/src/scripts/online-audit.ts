// Runs the online audit in the browser: Turnstile, then the proxy and PageSpeed Insights through
// @sitelens/collect-web, then the same checks and report as the CLI. The heavy modules load only
// when an audit starts, so the page itself stays light.
import type { OnlineProgress, OnlineStage, PsiProblem } from '@sitelens/collect-web';
import type { Lang, SiteSnapshot } from '@sitelens/core';
import type { ReportAssets } from '@sitelens/report';
import {
  confirmHuman,
  domainOf,
  fill,
  fitFrame,
  loadIntoFrame,
  NotConfirmed,
  printFrame,
  PSI_KEY_STORAGE,
  saveFile,
  storedKey,
} from './online-shared';

interface Strings {
  progress: string;
  done: string;
  overall: string;
  notMeasured: string;
  categories: Record<string, string>;
  categoryNotMeasured: string;
  warnings: string;
  errors: Record<string, string>;
  pagespeed: { quota: string; key: string };
  keys: { saved: string };
}

interface Config {
  proxyUrl: string;
  turnstileSiteKey: string;
  psiKey: string;
  lang: Lang;
  version: string;
  assets: ReportAssets;
  strings: Strings;
}

type Step = 'human' | OnlineStage | 'report';
const STEPS: Step[] = ['human', 'preflight', 'discover', 'pages', 'pagespeed', 'report'];
const PAGES = 10;

function storeKey(key: string | null) {
  try {
    if (key) sessionStorage.setItem(PSI_KEY_STORAGE, key);
    else sessionStorage.removeItem(PSI_KEY_STORAGE);
  } catch {
    // Storage can be off (private mode); the key then works for this page view only
  }
}

function init(root: HTMLElement) {
  const config = JSON.parse(root.dataset.config ?? '{}') as Config;
  const s = config.strings;
  const $ = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const form = $<HTMLFormElement>('form.url-form');
  const input = form.querySelector<HTMLInputElement>('input[name="url"]')!;
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const human = $('[data-human]');
  const progress = $('[data-progress]');
  const announce = $('[data-announce]');
  const problem = $('[data-error]');
  const result = $('[data-result]');
  const frame = $<HTMLIFrameElement>('[data-report]');
  const pagespeedBox = $('[data-pagespeed]');
  const pagespeedForm = $<HTMLFormElement>('[data-pagespeed-form]');
  const keyForm = $<HTMLFormElement>('[data-key-form]');
  const keyRemove = $<HTMLButtonElement>('[data-key-remove]');
  const keyStatus = $('[data-key-status]');
  const languages = [...root.querySelectorAll<HTMLInputElement>('[data-report-lang]')];
  const reportLang = () => (languages.find((option) => option.checked)?.value ?? config.lang) as Lang;

  let running = false;
  let lastAddress = '';
  let current: { snapshot: SiteSnapshot; warnings: string[]; address: string } | undefined;
  let reportHtml = '';

  const setStep = (step: Step, state: 'waiting' | 'active' | 'done' | 'skipped', count = '') => {
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
  const onProgress = ({ stage, done, total }: OnlineProgress) =>
    reach(stage, stage === 'preflight' ? '' : `${done}/${total}`);

  const showError = (key: string, detail = '') => {
    progress.hidden = true;
    human.hidden = true;
    result.hidden = true;
    $('[data-error-text]').textContent = fill(s.errors[key] ?? s.errors.unknown!, { detail });
    problem.hidden = false;
  };

  const messageFor = async (error: unknown): Promise<[string, string]> => {
    const { PreflightError, ProxyError } = await import('@sitelens/collect-web');
    if (error instanceof NotConfirmed) return ['human', ''];
    if (error instanceof ProxyError) return [error.problem === 'pass' ? 'pass' : 'limit', ''];
    if (error instanceof PreflightError) {
      if (error.code === 'blocked') return [/robots\.txt/.test(error.detail) ? 'robots' : 'blocked', ''];
      return [error.code, error.detail];
    }
    return ['unknown', error instanceof Error ? error.message : String(error)];
  };

  const fitReport = () => fitFrame(frame);

  const showReport = async (snapshot: SiteSnapshot, warnings: string[], address: string, missing?: PsiProblem) => {
    reach('report');
    const [{ runChecks, scoreAudit }, { auditJson, buildReport, renderReport }] = await Promise.all([
      import('@sitelens/core'),
      import('@sitelens/report'),
    ]);
    const lang = snapshot.input.lang;
    const outcome = runChecks(snapshot);
    const scores = scoreAudit(snapshot, outcome);
    reportHtml = renderReport(buildReport(snapshot, outcome, scores, lang), config.assets);
    const domain = domainOf(snapshot.site.finalUrl);

    // The report measures its blocks to lay out the pages, so the frame has to be rendered, only unseen
    result.style.visibility = 'hidden';
    result.hidden = false;
    await loadIntoFrame(frame, reportHtml);

    setStep('report', 'done');
    progress.hidden = true;
    $('[data-result-title]').textContent = fill(s.done, { domain });
    $('[data-overall]').textContent =
      scores.overall === null ? s.notMeasured : fill(s.overall, { score: scores.overall });
    $('[data-scores]').replaceChildren(
      ...scores.categories.map(({ category, score }) => {
        const item = document.createElement('li');
        const value = document.createElement('b');
        item.textContent = s.categories[category] ?? category;
        value.textContent = score === null ? s.categoryNotMeasured : String(score);
        item.append(value);
        return item;
      }),
    );
    const warningsNote = $('[data-warnings]');
    warningsNote.hidden = !warnings.length;
    warningsNote.textContent = fill(s.warnings, { count: warnings.length });
    pagespeedBox.hidden = !missing;
    if (missing) $('[data-pagespeed-text]').textContent = s.pagespeed[missing === 'key' ? 'key' : 'quota'];

    $<HTMLButtonElement>('[data-json]').onclick = () =>
      saveFile(
        `sitelens-${domain}.json`,
        `${JSON.stringify(
          auditJson({
            version: config.version,
            url: address,
            pages: PAGES,
            lang,
            snapshot,
            scores,
            outcome,
            warnings,
            finishedAt: new Date().toISOString(),
          }),
          null,
          2,
        )}\n`,
        'application/json',
      );
    fitReport();
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
    const warnings: string[] = [];
    try {
      // Start downloading the audit code while the visitor is being confirmed
      const collect = import('@sitelens/collect-web');
      reach('human');
      const token = await confirmHuman(human, config.turnstileSiteKey, config.lang);
      const { collectOnline, openSession } = await collect;
      reach('preflight');
      const pass = await openSession(config.proxyUrl, token, address);
      const audit = await collectOnline({
        input: { url: address, pages: PAGES, lang: reportLang() },
        proxy: { endpoint: config.proxyUrl, pass },
        psi: { key: storedKey() ?? config.psiKey },
        sitelensVersion: config.version,
        onProgress,
        onWarning: (message) => warnings.push(message),
      });
      current = { snapshot: audit.snapshot, warnings, address };
      await showReport(audit.snapshot, warnings, address, audit.pagespeedProblem);
    } catch (error) {
      const [key, detail] = await messageFor(error);
      showError(key, detail);
    } finally {
      running = false;
      submit.disabled = false;
    }
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const address = input.value.trim();
    if (!address) return;
    const query = new URLSearchParams({ url: address, lang: reportLang() });
    history.replaceState(null, '', `?${query}`);
    void start(address);
  });

  $<HTMLButtonElement>('[data-retry]').addEventListener('click', () => lastAddress && void start(lastAddress));

  $<HTMLButtonElement>('[data-pdf]').addEventListener('click', () => printFrame(frame, reportHtml, 840));

  pagespeedForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const key = new FormData(pagespeedForm).get('key')?.toString().trim();
    if (!key || !current || running) return;
    storeKey(key);
    running = true;
    progress.hidden = false;
    result.hidden = true;
    try {
      const { addPagespeed } = await import('@sitelens/collect-web');
      const missing = await addPagespeed(current.snapshot, { key, lang: current.snapshot.input.lang }, onProgress, (message) =>
        current!.warnings.push(message),
      );
      await showReport(current.snapshot, current.warnings, current.address, missing);
    } catch (error) {
      const [message, detail] = await messageFor(error);
      showError(message, detail);
    } finally {
      running = false;
    }
  });

  const showKeyState = () => {
    keyRemove.hidden = !storedKey();
    keyStatus.textContent = storedKey() ? s.keys.saved : '';
  };
  keyForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const key = new FormData(keyForm).get('key')?.toString().trim();
    if (!key) return;
    storeKey(key);
    keyForm.reset();
    showKeyState();
  });
  keyRemove.addEventListener('click', () => {
    storeKey(null);
    showKeyState();
  });
  showKeyState();

  new ResizeObserver(() => !result.hidden && fitReport()).observe(frame.parentElement!);

  const params = new URLSearchParams(location.search);
  // Without a language in the address, the report is in Polish for visitors in Poland, else English
  const wanted = params.get('lang') ?? document.documentElement.dataset.localLang;
  const requestedLang = languages.find((option) => option.value === wanted);
  if (requestedLang) requestedLang.checked = true;
  const requested = params.get('url')?.trim();
  if (requested) {
    input.value = requested;
    void start(requested);
  }
}

const root = document.querySelector<HTMLElement>('[data-online-audit]');
if (root) init(root);
