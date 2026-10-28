import { noOrphans } from '../lib/typography';
import { en } from './en';
import { pl, type Dictionary } from './pl';
import { routes, type Lang } from './routes';

export { languages, routes, type Lang, type PageKey } from './routes';

// Copied commands and code must keep plain spaces.
const codeKeys = new Set(['command', 'code', 'yaml', 'card']);

function mapStrings<T>(value: T, fn: (s: string) => string): T {
  if (typeof value === 'string') return fn(value) as T;
  if (Array.isArray(value)) return value.map((v) => mapStrings(v, fn)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, codeKeys.has(k) ? v : mapStrings(v, fn)]),
    ) as T;
  }
  return value;
}

const dictionaries: Record<Lang, Dictionary> = {
  pl: mapStrings(pl, noOrphans),
  en,
};

export function useTranslations(lang: Lang): Dictionary {
  return dictionaries[lang];
}

/** Values for `{terminal}`, `{privacy}`, `{terms}`, `{audit}` and `{brandbook}` placeholders in dictionary texts. */
export function pageLinks(lang: Lang): Record<string, string> {
  return {
    terminal: routes.terminal[lang],
    privacy: routes.privacy[lang],
    terms: routes.terms[lang],
    audit: routes.audit[lang],
    brandbook: routes.brandbook[lang],
  };
}
