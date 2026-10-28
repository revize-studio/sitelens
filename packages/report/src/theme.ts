import tokens from '../../../public/brand/tokens.json';

/**
 * Everything brand-specific in the report, so it can be swapped for another brand (white label).
 * The default is sitelens, from public/brand/tokens.json.
 */
export interface ReportTheme {
  colors: {
    page: string;
    surface: string;
    line: string;
    text: string;
    text2: string;
    accent: string;
    accentSoft: string;
    critical: string;
    important: string;
    minor: string;
    good: string;
    /** Behind the pages in the on-screen preview only; never printed */
    canvas: string;
  };
  fonts: { sans: string; mono: string };
  brandName: string;
  /** The short note about Revize Studio under weak results; a white-label report turns it off. */
  studioNote: boolean;
}

const light = tokens.theme.light;

export const defaultTheme: ReportTheme = {
  colors: {
    page: light.surface,
    surface: light.surface2,
    line: light.line,
    text: light.text,
    text2: light.text2,
    accent: light.accent,
    accentSoft: light.accentSoft,
    critical: light.priority.critical,
    important: light.priority.important,
    minor: light.priority.minor,
    good: light.priority.good,
    canvas: light.line,
  },
  fonts: { sans: tokens.font.sans, mono: tokens.font.mono },
  brandName: 'sitelens',
  studioNote: true,
};
