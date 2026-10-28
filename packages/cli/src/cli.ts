import { spawn, spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import {
  collectSite,
  findBrowser,
  launchBrowser,
  parseTarget,
  PreflightError,
  renderPdf,
} from '@sitelens/collect-node';
import { runChecks, scoreAudit, scoredCategories, type CategoryScore, type Lang } from '@sitelens/core';
import { auditJson, buildReport, renderReport } from '@sitelens/report';
import { DEFAULT_PAGES, MAX_PAGES, parseCliArgs, UsageError, type CliOptions } from './args';
import { reportAssets } from './assets';
import { brand } from './brand';
import { messages, preflightMessage, type Messages, type Mode } from './messages';
import { ask, canPrompt, pressEnter, PromptCancelled, select } from './prompt';
import { bar, createProgress, fileLink, paint, scoreStyle } from './ui';

declare const SITELENS_VERSION: string;
const VERSION = typeof SITELENS_VERSION === 'string' ? SITELENS_VERSION : '0.0.0-dev';
const NODE_NEEDED = '22.19.0';

const enum Exit {
  Ok = 0,
  BelowThreshold = 1,
  Usage = 2,
  SiteUnavailable = 3,
  Environment = 4,
  Cancelled = 130,
}

const MODES: { mode: Mode; pages: number }[] = [
  { mode: 'quick', pages: 1 },
  { mode: 'standard', pages: DEFAULT_PAGES },
  { mode: 'thorough', pages: MAX_PAGES },
];

function nodeTooOld(): boolean {
  const [major = 0, minor = 0] = process.versions.node.split('.').map(Number);
  const [needMajor = 0, needMinor = 0] = NODE_NEEDED.split('.').map(Number);
  return major < needMajor || (major === needMajor && minor < needMinor);
}

function installBrowser(m: Messages): Exit {
  console.log(m.installing);
  // playwright-core ships its own installer; using it keeps the Chromium build in step with the library
  const cli = join(dirname(createRequire(import.meta.url).resolve('playwright-core/package.json')), 'cli.js');
  const result = spawnSync(process.execPath, [cli, 'install', 'chromium'], { stdio: 'inherit' });
  if (result.status !== 0) return Exit.Environment;
  console.log(m.installed);
  return Exit.Ok;
}


function printScores(categories: CategoryScore[], overall: number | null, m: Messages) {
  const width = Math.max(...scoredCategories.map((c) => m.categories[c as keyof Messages['categories']].length));
  console.log('');
  for (const { category, score } of categories) {
    const name = m.categories[category as keyof Messages['categories']].padEnd(width + 2);
    if (score === null) console.log(`${paint('dim', '–')} ${name}${paint('dim', m.notMeasured)}`);
    else
      console.log(
        `${paint('green', '✓')} ${name}${paint(scoreStyle(score), bar(score))}  ${paint(scoreStyle(score), String(score).padStart(3))}`,
      );
  }
  if (overall !== null) console.log(`\n${paint(['bold', scoreStyle(overall)], String(overall))} ${m.overall}`);
}

function defaultOut(lang: Lang) {
  return lang === 'en' ? 'report.pdf' : 'raport.pdf';
}

function systemLang(): Lang {
  // Someone in Poland gets Polish preselected even with an English system
  if (Intl.DateTimeFormat().resolvedOptions().timeZone === 'Europe/Warsaw') return 'pl';
  const locale =
    process.env.LC_ALL || process.env.LC_MESSAGES || process.env.LANG || Intl.DateTimeFormat().resolvedOptions().locale;
  return /^pl/i.test(locale) ? 'pl' : 'en';
}

/** `sitelens` on its own in a terminal asks for what the flags would say instead of failing. */
async function interview(): Promise<{ url: string; lang: Lang; pages: number }> {
  console.log(`${paint('bold', 'sitelens')} ${paint('dim', VERSION)}\n`);
  const lang = await select<Lang>(
    `${messages.pl.wizard.language} / ${messages.en.wizard.language}`,
    [
      { label: 'Polski', value: 'pl' },
      { label: 'English', value: 'en' },
    ],
    {
      initial: systemLang() === 'pl' ? 0 : 1,
      done: (choice) => `${messages[choice.value].wizard.language}: ${choice.label}`,
    },
  );
  const w = messages[lang].wizard;
  const url = await ask(
    w.address,
    (answer) => {
      if (!answer) return w.addressMissing;
      try {
        parseTarget(answer);
        return undefined;
      } catch {
        return messages[lang].errors.invalidUrl(answer);
      }
    },
    { hint: w.addressHint },
  );
  const pages = await select(
    w.mode,
    MODES.map(({ mode, pages }) => ({ label: w.modes[mode].label, hint: w.modes[mode].hint(pages), value: pages })),
    { initial: 1 },
  );
  console.log('');
  return { url, lang, pages };
}

function openReport(path: string, m: Messages) {
  // explorer.exe rather than `start`, which would need cmd.exe quoting for paths with spaces
  const [program, args]: [string, string[]] =
    process.platform === 'darwin'
      ? ['open', [path]]
      : process.platform === 'win32'
        ? ['explorer.exe', [path]]
        : ['xdg-open', [path]];
  const child = spawn(program, args, { detached: true, stdio: 'ignore' });
  child.on('error', () => console.log(m.wizard.openFailed(path)));
  child.unref();
}

async function offerToOpen(path: string, m: Messages) {
  console.log('');
  if (await pressEnter(m.openKey)) openReport(path, m);
}

async function audit(options: CliOptions & { url: string }, outPath: string, m: Messages): Promise<Exit> {
  const browserInfo = findBrowser();
  if (!browserInfo) {
    console.error(m.errors.noBrowser);
    return Exit.Environment;
  }
  for (const flag of options.later) console.log(paint('yellow', m.optionLater(flag)));

  const warnings: string[] = [];
  const progress = createProgress(m.stages);
  console.log(paint('dim', m.checking(options.pages)));
  const browser = await launchBrowser(browserInfo.path);
  const close = () => browser.close().catch(() => undefined);
  process.once('SIGINT', () => void close().then(() => process.exit(130)));

  try {
    const snapshot = await collectSite({
      input: { url: options.url, pages: options.pages, lang: options.lang },
      browser,
      browserPath: browserInfo.path,
      browserName: browserInfo.name,
      sitelensVersion: VERSION,
      lighthouse: process.env.SITELENS_SKIP_LIGHTHOUSE !== '1',
      onProgress: (p) => progress.update(p),
      onWarning: (message) => warnings.push(message),
    });
    const outcome = runChecks(snapshot);
    const scores = scoreAudit(snapshot, outcome);
    progress.update({ stage: 'report', done: 0, total: 1 });
    const html = renderReport(buildReport(snapshot, outcome, scores, options.lang), reportAssets());
    try {
      await renderPdf(browser, html, outPath);
      if (options.json) {
        const jsonPath = outPath.replace(/\.pdf$/i, '') + '.json';
        const result = auditJson({
          version: VERSION,
          url: options.url,
          pages: options.pages,
          lang: options.lang,
          snapshot,
          scores,
          outcome,
          warnings,
          finishedAt: new Date().toISOString(),
        });
        writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`);
      }
    } catch (error) {
      progress.stop();
      console.error(m.errors.write(outPath, (error as Error).message));
      return Exit.Environment;
    }
    progress.stop();

    printScores(scores.categories, scores.overall, m);
    // The full path, so people who opened a terminal for the first time can find the file
    console.log(`${paint('green', '✓')} ${m.saved}:\n  ${paint('cyan', fileLink(outPath))}`);
    if (options.json)
      console.log(
        `${paint('green', '✓')} ${m.savedJson}:\n  ${paint('cyan', fileLink(outPath.replace(/\.pdf$/i, '') + '.json'))}`,
      );
    if (warnings.length) console.log(paint('dim', m.warnings(warnings.length)));

    if (options.failUnder !== undefined && scores.overall !== null && scores.overall < options.failUnder) {
      console.error(paint('red', m.failUnder(scores.overall, options.failUnder)));
      return Exit.BelowThreshold;
    }
    return Exit.Ok;
  } catch (error) {
    progress.stop();
    if (error instanceof PreflightError) {
      console.error(paint('red', preflightMessage(error, m)));
      return Exit.SiteUnavailable;
    }
    throw error;
  } finally {
    await close();
  }
}

async function main(argv: string[]): Promise<Exit> {
  let options: CliOptions;
  try {
    options = parseCliArgs(argv);
  } catch (error) {
    if (error instanceof UsageError) {
      console.error(error.message);
      return Exit.Usage;
    }
    throw error;
  }
  let m = messages[options.lang];
  if (nodeTooOld()) {
    console.error(m.errors.oldNode(process.versions.node, NODE_NEEDED));
    return Exit.Environment;
  }
  if (options.help) {
    console.log(options.command === 'brand' ? m.brand.help(VERSION) : m.help(VERSION));
    return Exit.Ok;
  }
  if (options.version) {
    console.log(VERSION);
    return Exit.Ok;
  }
  if (options.installBrowser) return installBrowser(m);
  if (options.command === 'brand') {
    if (!options.url) {
      console.error(m.errors.noUrl);
      return Exit.Usage;
    }
    try {
      const result = await brand(
        { url: options.url, lang: options.lang, pages: options.pages, out: options.out, formats: options.formats, version: VERSION },
        m,
      );
      return result === 'ok' ? Exit.Ok : result === 'site-unavailable' ? Exit.SiteUnavailable : Exit.Environment;
    } catch (error) {
      console.error(m.errors.unexpected(error instanceof Error ? error.message : String(error)));
      return Exit.Environment;
    }
  }
  const interactive = !options.url && argv.length === 0 && canPrompt();
  if (interactive) {
    try {
      options = { ...options, ...(await interview()) };
    } catch (error) {
      if (error instanceof PromptCancelled) return Exit.Cancelled;
      throw error;
    }
    m = messages[options.lang];
  }
  if (!options.url) {
    console.error(m.errors.noUrl);
    return Exit.Usage;
  }
  const outPath = resolve(options.out ?? defaultOut(options.lang));
  let exit: Exit;
  try {
    exit = await audit({ ...options, url: options.url }, outPath, m);
  } catch (error) {
    console.error(m.errors.unexpected(error instanceof Error ? error.message : String(error)));
    return Exit.Environment;
  }
  // Waiting for a key only makes sense with a person at the keyboard, never in CI or a pipe
  if ((exit === Exit.Ok || exit === Exit.BelowThreshold) && canPrompt() && !process.env.CI)
    await offerToOpen(outPath, m);
  return exit;
}

process.exitCode = await main(process.argv.slice(2));
