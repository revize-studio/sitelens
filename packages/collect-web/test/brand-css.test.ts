import { describe, expect, it } from 'vitest';
import { cssRefs, forceScheme, rewriteCss } from '../src/brand/css';

const base = 'https://firma.pl/css/main.css';

describe('stylesheets for the frame', () => {
  it('finds imports, font files and pictures as absolute addresses', () => {
    const css = `@import url("theme.css") screen;
@font-face { font-family: Dab; src: url(../fonts/dab.woff2) format("woff2"); }
.hero { background: url('/img/hero.jpg') }
.icon { background: url(data:image/png;base64,AAAA) }`;
    expect(cssRefs(css, base)).toEqual([
      { url: 'https://firma.pl/css/theme.css', kind: 'import' },
      { url: 'https://firma.pl/fonts/dab.woff2', kind: 'font' },
      { url: 'https://firma.pl/img/hero.jpg', kind: 'image' },
    ]);
  });

  it('inlines imports with their media, points fonts at local copies and loads no other pictures', () => {
    const css = `@import url(theme.css) (min-width: 600px);
@font-face { font-family: Dab; src: url(../fonts/dab.woff2) format("woff2"); }
.hero { background: url('/img/hero.jpg') no-repeat; }
.icon { background: url("data:image/svg+xml,%3Csvg%3E%3C/svg%3E"); }`;
    const out = rewriteCss(css, base, {
      imported: (url) => (url === 'https://firma.pl/css/theme.css' ? ':root{--dab:#9c6b3c}' : null),
      local: (url, kind) => (kind === 'font' && url.endsWith('dab.woff2') ? 'blob:https://sitelens.pl/font-1' : null),
    });
    expect(out).toContain('@media (min-width: 600px) {\n:root{--dab:#9c6b3c}\n}');
    expect(out).toContain('src: url("blob:https://sitelens.pl/font-1") format("woff2")');
    expect(out).toContain('background: url("data:,") no-repeat;');
    expect(out).toContain('url("data:image/svg+xml,%3Csvg%3E%3C/svg%3E")');
  });

  it('drops font faces left without a file, so the browser has nothing to fail to decode', () => {
    const css = `@font-face { font-family: Dab; src: url(dab-cyrillic.woff2); unicode-range: U+0400-045F; }
@font-face { font-family: Dab; src: url(dab-latin.woff2); }`;
    const out = rewriteCss(css, base, { imported: () => null, local: (url) => (url.endsWith('latin.woff2') ? 'blob:x' : null) });
    expect(out).not.toContain('cyrillic');
    expect(out).toContain('src: url("blob:x")');
  });

  it('drops imports it could not read and the scripting hooks of old browsers', () => {
    const out = rewriteCss('@import "gone.css";\n.a{width:expression(alert(1));-moz-binding:url(x.xml#y);behavior:url(x.htc)}', base, {
      imported: () => null,
      local: () => null,
    });
    expect(out).not.toMatch(/gone\.css|expression\(|-moz-binding|behavior/);
  });

  it('makes the colour scheme queries match the scheme asked for', () => {
    const css = '@media (prefers-color-scheme: dark) { :root { --bg: #000 } }\n@media (prefers-color-scheme:light){:root{--bg:#fff}}';
    expect(forceScheme(css, 'dark')).toBe('@media (min-width: 0px) { :root { --bg: #000 } }\n@media (max-width: -1px){:root{--bg:#fff}}');
    expect(forceScheme(css, 'light')).toBe('@media (max-width: -1px) { :root { --bg: #000 } }\n@media (min-width: 0px){:root{--bg:#fff}}');
  });
});
