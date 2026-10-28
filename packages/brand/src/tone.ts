import rules from '../data/tone.json';
import type { ToneSection } from './model';
import type { RawButton, RawPage } from './raw';

interface ToneRules {
  secondPerson: string[];
  secondPersonVerb: string | null;
  verbExceptions: string[];
  formal: string[];
  formalNeedsCapital: boolean;
  titleCaseWords: string;
}
const LANGUAGES: Record<string, ToneRules> = { pl: rules.pl, en: rules.en };

const words = (text: string) => text.match(/[\p{L}'’]+/gu) ?? [];

function countWords(text: string, list: string[], needsCapital: boolean): number {
  const set = new Set(list.map((w) => w.toLowerCase()));
  return words(text).filter((w) => set.has(w.toLowerCase()) && (!needsCapital || /^\p{Lu}/u.test(w))).length;
}

/** The page language from its markup, or a guess from Polish letters when it does not say. */
export function siteLanguage(page: RawPage): string {
  const declared = page.meta.lang.toLowerCase().split('-')[0];
  if (declared) return declared;
  const text = [...page.texts.headings.map((h) => h.text), ...page.texts.paragraphs].join(' ');
  const polish = (text.match(/[ąćęłńóśźż]/gi) ?? []).length;
  return polish > text.length * 0.005 ? 'pl' : 'en';
}

function headingCase(page: RawPage, titlePattern: RegExp): ToneSection['headingCase'] {
  const headings = page.texts.headings.filter((h) => /\p{L}/u.test(h.text));
  if (!headings.length) return 'unknown';
  const kinds = headings.map((h) => {
    if (h.transform === 'uppercase' || (h.text === h.text.toUpperCase() && /\p{Lu}{2}/u.test(h.text))) return 'upper';
    if (titlePattern.test(` ${h.text}`)) return 'title';
    return /^\P{L}*\p{Lu}/u.test(h.text) ? 'sentence' : 'mixed';
  });
  const share = (kind: string) => kinds.filter((k) => k === kind).length / kinds.length;
  if (share('sentence') >= 0.7) return 'sentence';
  if (share('upper') >= 0.5) return 'upper';
  if (share('title') >= 0.5) return 'title';
  return 'mixed';
}

/** Labels of the emphasised buttons a visitor is asked to press; tabs and language switches left out. */
export function callsToAction(buttons: RawButton[]): string[] {
  const out: string[] = [];
  const code = new RegExp(rules.languageCode);
  for (const button of buttons) {
    if (button.isTab || button.inConsent || button.emphasis < 3) continue;
    const text = button.text.trim();
    if (text.length < rules.ctaMinLength || text.length > rules.ctaMaxLength || code.test(text)) continue;
    if (!out.includes(text)) out.push(text);
  }
  return out.slice(0, 5);
}

export function analyseTone(page: RawPage, others: RawPage[]): ToneSection {
  const language = siteLanguage(page);
  const r = LANGUAGES[language];
  const paragraphs = [...page.texts.paragraphs, ...others.flatMap((p) => p.texts.paragraphs)];
  const headings = page.texts.headings.map((h) => h.text);
  const buttonTexts = page.buttons.map((b) => b.text);
  const all = [...headings, ...paragraphs, ...buttonTexts].join(' ');

  let address: ToneSection['address'] = 'unknown';
  if (r) {
    let second = countWords(all, r.secondPerson, false);
    if (r.secondPersonVerb) {
      const exceptions = new Set(r.verbExceptions);
      second += (all.toLowerCase().match(new RegExp(r.secondPersonVerb, 'gu')) ?? []).filter((w) => !exceptions.has(w)).length;
    }
    const formal = countWords(all, r.formal, r.formalNeedsCapital);
    address = second === 0 && formal === 0 ? 'impersonal' : formal >= second ? 'formal' : 'informal';
  }

  const sentences = paragraphs
    .join(' ')
    .split(/[.!?…]+\s+/)
    .map((s) => words(s).length)
    .filter((n) => n > 2);
  const average = sentences.length ? Math.round((sentences.reduce((a, b) => a + b, 0) / sentences.length) * 10) / 10 : null;

  return {
    language,
    address,
    averageSentenceWords: average,
    headingCase: headingCase(page, new RegExp((r ?? rules.en).titleCaseWords, 'u')),
    examples: [...new Set(headings)].slice(0, 4),
    ctas: callsToAction(page.buttons),
  };
}
