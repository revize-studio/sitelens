import type { Lang } from './model';

// Advice texts are written once per language with placeholders, and the numbers go in here:
//   {count}                      a number in the reader's format
//   {lcp:s} {bytes:size} {t:ms}  a value with its unit: seconds, kilobytes/megabytes, milliseconds
//   {expires:date}               a date written out in words
//   {count|zdjęcie|zdjęcia|zdjęć} the right word form for the number (Polish one|few|many, English one|other)

const locales: Record<Lang, string> = { pl: 'pl-PL', en: 'en-GB' };

export function formatNumber(value: number, lang: Lang, digits = 0): string {
  return new Intl.NumberFormat(locales[lang], { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(
    value,
  );
}

export function formatSeconds(ms: number, lang: Lang): string {
  return `${formatNumber(Math.round(ms / 100) / 10, lang, 1)} s`;
}

export function formatBytes(bytes: number, lang: Lang): string {
  if (bytes >= 1_000_000) return `${formatNumber(Math.round(bytes / 100_000) / 10, lang, 1)} MB`;
  return `${formatNumber(Math.max(1, Math.round(bytes / 1000)), lang)} KB`;
}

export function formatDate(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(locales[lang], { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(iso),
  );
}

const pluralRules: Partial<Record<Lang, Intl.PluralRules>> = {};

export function plural(count: number, forms: string[], lang: Lang): string {
  const rules = (pluralRules[lang] ??= new Intl.PluralRules(locales[lang]));
  const category = rules.select(count);
  const order = lang === 'pl' ? ['one', 'few', 'many'] : ['one', 'other'];
  const index = order.indexOf(category);
  // Fractions are "other" in Polish and take the genitive, like "many"
  return forms[index === -1 ? forms.length - 1 : index] ?? forms[forms.length - 1] ?? '';
}

function formatValue(value: string | number, kind: string | undefined, lang: Lang): string {
  if (typeof value === 'string') return kind === 'date' ? formatDate(value, lang) : value;
  switch (kind) {
    case 's':
      return formatSeconds(value, lang);
    case 'ms':
      return `${formatNumber(Math.round(value), lang)} ms`;
    case 'size':
      return formatBytes(value, lang);
    case 'decimal':
      return formatNumber(value, lang, 2);
    default:
      return formatNumber(value, lang);
  }
}

export function fillTemplate(template: string, values: Record<string, string | number>, lang: Lang): string {
  return template.replace(
    /\{(\w+)(?::(\w+))?((?:\|[^|}]*)+)?\}/g,
    (whole, name: string, kind?: string, forms?: string) => {
      const value = values[name];
      if (value === undefined) return whole;
      if (forms) return plural(Number(value), forms.slice(1).split('|'), lang);
      return formatValue(value, kind, lang);
    },
  );
}
