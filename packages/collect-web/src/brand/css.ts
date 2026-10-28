export type CssRefKind = 'import' | 'font' | 'image';

export interface CssRef {
  url: string;
  kind: CssRefKind;
}

const COMMENT = /\/\*[\s\S]*?\*\//g;
const IMPORT = /@import\s+(?:url\(\s*)?(["']?)([^"')\s;]+)\1\s*\)?\s*([^;]*);?/gi;
const URL_REF = /url\(\s*(["']?)([^"')]*)\1\s*\)/gi;
const FONT_FACE = /@font-face\s*{[^}]*}/gi;

const absolute = (url: string, base: string) => {
  try {
    return new URL(url, base).href;
  } catch {
    return null;
  }
};

/** The stylesheets a stylesheet imports, its font files and its other pictures, as absolute addresses. */
export function cssRefs(css: string, base: string): CssRef[] {
  const text = css.replace(COMMENT, '');
  const refs: CssRef[] = [];
  const add = (url: string | null, kind: CssRefKind) => {
    if (url && /^https?:/.test(url) && !refs.some((r) => r.url === url && r.kind === kind)) refs.push({ url, kind });
  };
  for (const [, , url] of text.matchAll(IMPORT)) add(absolute(url!, base), 'import');
  const fonts = (text.match(FONT_FACE) ?? []).join('\n');
  for (const [, , url] of fonts.matchAll(URL_REF)) add(absolute(url!, base), 'font');
  for (const [, , url] of text.replace(IMPORT, '').replace(FONT_FACE, '').matchAll(URL_REF))
    add(absolute(url!, base), 'image');
  return refs;
}

export interface Rewrite {
  /** The CSS text of an imported stylesheet, already rewritten, or null to drop the import */
  imported: (url: string) => string | null;
  /** A local (blob:) address for a font or picture, or null to load nothing in its place */
  local: (url: string, kind: 'font' | 'image') => string | null;
}

/**
 * The stylesheet as the sandboxed frame may load it: imports inlined, fonts and pictures pointing at
 * local copies or at nothing, and the scripting hooks of old browsers removed.
 */
export function rewriteCss(css: string, base: string, rewrite: Rewrite): string {
  let text = css.replace(COMMENT, '');
  text = text.replace(IMPORT, (_whole, _quote, url: string, condition: string) => {
    const href = absolute(url, base);
    const imported = href ? rewrite.imported(href) : null;
    if (imported === null) return '';
    const layer = /layer\(([^)]+)\)/.exec(condition)?.[1];
    const media = condition.replace(/layer(\([^)]*\))?/, '').replace(/supports\([^)]*\)/, '').trim();
    let wrapped = imported;
    if (media) wrapped = `@media ${media} {\n${wrapped}\n}`;
    if (layer) wrapped = `@layer ${layer} {\n${wrapped}\n}`;
    return wrapped;
  });
  const swap = (kind: 'font' | 'image') => (_whole: string, _quote: string, url: string) => {
    const value = url.trim();
    // Fonts and pictures written into the stylesheet are already here and load nothing from the network
    if (/^data:/i.test(value) && !/^data:text\/html/i.test(value)) return `url("${value}")`;
    const href = absolute(value, base);
    const local = href && /^https?:/.test(href) ? rewrite.local(href, kind) : null;
    return `url("${local ?? 'data:,'}")`;
  };
  const faces: string[] = [];
  text = text.replace(FONT_FACE, (block) => {
    const face = block.replace(URL_REF, swap('font'));
    // A face left with no file would only make the browser warn that it cannot decode the font
    faces.push([...face.matchAll(URL_REF)].every(([, , url]) => url === 'data:,') ? '' : face);
    return `@@sitelens-face-${faces.length - 1}@@`;
  });
  text = text.replace(URL_REF, swap('image')).replace(/@@sitelens-face-(\d+)@@/g, (_whole, i: string) => faces[Number(i)]!);
  return text.replace(/expression\s*\(/gi, 'none(').replace(/-moz-binding\s*:[^;}]*/gi, '').replace(/behavior\s*:[^;}]*/gi, '');
}

/**
 * Makes `prefers-color-scheme` queries match the scheme asked for, whatever the visitor's own system
 * says, so the frame can show the site's light and dark theme in turn.
 */
export function forceScheme(css: string, scheme: 'light' | 'dark'): string {
  const always = '(min-width: 0px)';
  // A negative width never matches, which is what a query for the other scheme should do
  const never = '(max-width: -1px)';
  return css.replace(/\(\s*prefers-color-scheme\s*:\s*(dark|light)\s*\)/gi, (_whole, asked: string) =>
    asked.toLowerCase() === scheme ? always : never,
  );
}
