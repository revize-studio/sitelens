import { parseArgs } from 'node:util';
import type { Lang } from '@sitelens/core';
import { messages } from './messages';

export type BrandFormat = 'pdf' | 'html' | 'tokens' | 'zip' | 'json';
export const BRAND_FORMATS: BrandFormat[] = ['pdf', 'html', 'tokens', 'zip', 'json'];

export interface CliOptions {
  command: 'audit' | 'brand';
  url?: string;
  pages: number;
  lang: Lang;
  out?: string;
  json: boolean;
  failUnder?: number;
  help: boolean;
  version: boolean;
  installBrowser: boolean;
  /** Options from the spec that a later version implements; the audit runs without them */
  later: string[];
  /** What `sitelens brand` writes; json is only written when asked for */
  formats: BrandFormat[];
}

/** Wrong use of the command; the message is already in the user's language. */
export class UsageError extends Error {}

export const MAX_PAGES = 50;
export const DEFAULT_PAGES = 10;
export const BRAND_DEFAULT_PAGES = 2;
export const BRAND_MAX_PAGES = 10;

function number(value: string | undefined, flag: string, lang: Lang): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new UsageError(messages[lang].errors.badNumber(flag));
  return parsed;
}

export function parseCliArgs(argv: string[]): CliOptions {
  // Known before parsing, so even a parsing error is reported in the language asked for
  const langIndex = argv.indexOf('--lang');
  const lang: Lang = argv.includes('--lang=en') || (langIndex !== -1 && argv[langIndex + 1] === 'en') ? 'en' : 'pl';
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        pages: { type: 'string' },
        lang: { type: 'string' },
        out: { type: 'string' },
        json: { type: 'boolean', default: false },
        'fail-under': { type: 'string' },
        help: { type: 'boolean', short: 'h', default: false },
        version: { type: 'boolean', short: 'v', default: false },
        'install-browser': { type: 'boolean', default: false },
        'psi-key': { type: 'string' },
        ai: { type: 'boolean' },
        brand: { type: 'string' },
        owner: { type: 'boolean' },
        format: { type: 'string' },
      },
    });
  } catch (error) {
    throw new UsageError(`${(error as Error).message}\n${messages[lang].errors.usage}`);
  }
  const { values, positionals } = parsed;
  if (values.lang !== undefined && values.lang !== 'pl' && values.lang !== 'en')
    throw new UsageError(messages[lang].errors.badLang);
  // A website address is never a single word, so "brand" in front can only mean the brandbook tool
  const command = positionals[0] === 'brand' ? 'brand' : 'audit';
  const url = command === 'brand' ? positionals[1] : positionals[0];
  const pages =
    command === 'brand'
      ? Math.min(BRAND_MAX_PAGES, Math.max(0, number(values.pages, '--pages', lang) ?? BRAND_DEFAULT_PAGES))
      : Math.min(MAX_PAGES, Math.max(1, number(values.pages, '--pages', lang) ?? DEFAULT_PAGES));
  const formats = (values.format ?? 'pdf,html,tokens,zip')
    .split(',')
    .map((f) => f.trim().toLowerCase())
    .filter(Boolean);
  for (const format of formats)
    if (!BRAND_FORMATS.includes(format as BrandFormat)) throw new UsageError(messages[lang].brand.errors.badFormat(format));
  return {
    command,
    url,
    pages,
    lang,
    out: values.out,
    json: values.json,
    failUnder: number(values['fail-under'], '--fail-under', lang),
    help: values.help,
    version: values.version,
    installBrowser: values['install-browser'],
    later: (['psi-key', 'ai', 'brand', 'owner'] as const)
      .filter((flag) => values[flag] !== undefined)
      .map((flag) => `--${flag}`),
    formats: formats as BrandFormat[],
  };
}
