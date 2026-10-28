import type { Severity } from '../model';

export type WhoFixes = 'owner' | 'developer';
export type Effort = 'small' | 'medium' | 'large';

export interface CardText {
  /** Card heading; may hold numbers, e.g. "8 z 12 podstron nie ma opisu dla Google" */
  title: string;
  /** One sentence for the "five things to start with" list */
  summary: string;
  whatIsWrong: string;
  whyItMatters: string;
  howToFix: string[];
  /** The paragraph of a short card, used for minor problems */
  short: string;
  /** One line for the appendix table */
  technical: string;
}

export interface CardVariant {
  priority: Exclude<Severity, 'pass'>;
  pl: CardText;
  en: CardText;
}

export interface Card {
  id: string;
  whoFixes: WhoFixes;
  effort: Effort;
  /** Draft texts still wait for a human review */
  review: 'draft' | 'reviewed';
  variants: Record<string, CardVariant>;
  /** The line for "what works well" when the check passes */
  passed?: { pl: string; en: string };
}
