import type { Brandbook, DarkSection, Swatch, TextStyle } from '@sitelens/brand';
import { formatDate, type Lang } from '@sitelens/core';
import { defaultTheme } from '../theme';
import { brandbookStrings, type BrandbookStrings } from './i18n';
import { coverLogo, darkPairs, esc, fileLabel, isDarkHex, logoTiles, ROLES, safe, slug, variantImage } from './shared';

/** A file of a brand typeface the licence lets the PDF embed. */
export interface BrandbookFont {
  family: string;
  weight: string;
  style: string;
  unicodeRange: string | null;
  src: string;
}

export interface BrandbookAssets {
  /** Geist and Geist Mono, used where a brand typeface cannot be embedded */
  fontSans: string;
  fontMono: string;
  brandFonts: BrandbookFont[];
  /**
   * Pictures as data: URIs, by screenshot name (`desktop`, `mobile`, `dark`, `nav`, `logo`,
   * `button-<index>`, `type-<key>`) or by the address of a file from the site
   */
  images: Record<string, string>;
}

const c = defaultTheme.colors;
const SHEET_BG = c.page;

interface Context {
  book: Brandbook;
  t: BrandbookStrings;
  lang: Lang;
  assets: BrandbookAssets;
  date: string;
  embedded: Set<string>;
}

/** The CSS font stack for a brand family: the embedded file when the licence allows, Geist otherwise. */
const fontOf = (ctx: Context, family: string | null) =>
  family && ctx.embedded.has(family) ? `'bb-${slug(family)}', 'Geist', sans-serif` : `'Geist', sans-serif`;

function pageHead(ctx: Context): string {
  const icon = ctx.book.logo.variants.find((v) => v.kind === 'icon');
  const src = (icon && variantImage(ctx.assets.images, icon)) ?? ctx.assets.images.logo;
  return `<header class="ph">${src ? `<img src="${esc(src)}" alt="">` : '<span></span>'}<span>${esc(ctx.t.headerTitle(ctx.book.name))}</span></header>`;
}

function sheet(ctx: Context, title: string, lead: string, body: string, extraClass = ''): string {
  return `<section class="sheet ${extraClass}">${pageHead(ctx)}
<h2 data-title="${esc(title)}">${esc(title)}</h2>${lead ? `<p class="lead">${esc(lead)}</p>` : ''}
<div class="body">${body}</div>
<footer class="pf"><span>${esc(ctx.t.footer(ctx.book.host, ctx.date, ctx.t.mode[ctx.book.mode]))}</span><span class="num"></span></footer></section>`;
}

const tag = (text: string) => `<em class="tag">${esc(text)}</em>`;

function cover(ctx: Context): string {
  const { book, t } = ctx;
  const base = book.colors.base;
  const dark = isDarkHex(base);
  const fg = dark ? c.page : c.text;
  const logo = coverLogo(book, ctx.assets.images, 'cover-logo') ?? '<span></span>';
  const h1 = book.typography.styles.find((s) => s.key === 'h1');
  return `<section class="sheet cover" style="background:${safe.color(base)};color:${fg}">
${logo}
<div class="cover-t"><p class="kicker">${esc(t.brandbook)}</p>
<h1 style="font-family:${fontOf(ctx, book.typography.heading)};font-weight:${h1?.weight ?? 600}">${esc(book.name)}</h1>
<p class="cover-lead">${esc(t.coverLead(book.host))}</p>${book.approximate.includes('limited') ? `<p class="cover-note">${esc(t.limited)}</p>` : ''}</div>
<div class="cover-f" style="border-color:color-mix(in srgb, ${fg} 22%, transparent)"><span>${esc(ctx.date)}</span><span>${esc(t.generated)} · ${esc(t.mode[book.mode])}</span></div>
</section>`;
}

function logoPage(ctx: Context): string {
  const { book, t } = ctx;
  const tiles = logoTiles(book, ctx.assets.images, t.logo.variant, { page: SHEET_BG, surface: c.surface }).map(
    (tile) =>
      `<figure class="lg ${tile.kind}" style="background:${safe.color(tile.background)}">${tile.picture}<figcaption style="color:${isDarkHex(tile.background) ? c.line : c.text2}">${esc(tile.caption)}</figcaption></figure>`,
  );

  const files = book.logo.files
    .slice(0, 9)
    .map((f) => `<li class="mono">${esc(f.url ? fileLabel(f.url, book.host) : t.logo.inline)}</li>`)
    .join('');
  const p = book.logo.proposals;
  const proposals = p
    ? `<div><h4>${esc(t.logo.clearSpace)} ${tag(t.proposal)}</h4><p class="small">${esc(t.logo.clearSpaceText(p.clearSpacePx))}</p>
<h4 class="gap">${esc(t.logo.minSize)} ${tag(t.proposal)}</h4><p class="small">${esc(t.logo.minSizeText(p.minWidthPx, p.markMinPx))}</p></div>
<div><h4>${esc(t.logo.dont)} ${tag(t.proposal)}</h4><ul class="small dash">${p.prohibitions.map((x) => `<li>${esc(t.logo.prohibitions[x] ?? x)}</li>`).join('')}</ul></div>`
    : '';
  const body = `${book.logo.found ? '' : `<p class="blk small">${esc(t.logo.none)}</p>`}
<div class="blk lgrid" style="grid-template-columns:repeat(${Math.max(tiles.length, 1)},minmax(0,1fr))">${tiles.join('')}</div>
<div class="blk cols3"><div><h4>${esc(t.logo.files)}</h4><ul class="small">${files}</ul></div>${proposals}</div>
<p class="blk note">${esc(t.logo.owner)}</p>`;
  return sheet(ctx, t.logo.title, t.logo.lead, body);
}

function swatch(ctx: Context, s: Swatch, showShare = true): string {
  const fg = isDarkHex(s.hex) ? c.page : c.text;
  const share = !showShare
    ? ''
    : s.share >= 0.01
      ? `<span>${esc(ctx.t.colors.share(Math.min(100, Math.round(s.share * 100)), s.role))}</span>`
      : `<span>${esc(ctx.t.colors.inTokens)}</span>`;
  return `<div class="sw"><div class="chip" style="background:${safe.color(s.hex)};color:${fg}"><b>${esc(s.name)}</b>${share}</div>
<dl><dt>HEX</dt><dd>${s.hex}</dd><dt>RGB</dt><dd>${s.rgb.join(', ')}</dd><dt>CMYK*</dt><dd>${s.cmyk.join(', ')}</dd></dl></div>`;
}

function colorsPage(ctx: Context): string {
  const { book, t } = ctx;
  const groups = ROLES
    .map((role) => [role, book.colors.groups[role] ?? []] as const)
    .filter(([, list]) => list.length)
    .map(
      ([role, list]) =>
        `<div class="blk cgroup${list.length > 4 ? ' wide' : ''}"><h4>${esc(t.colors.roles[role])}</h4><div class="swrow">${list.map((s) => swatch(ctx, s)).join('')}</div></div>`,
    );
  if (book.logo.colors.length)
    groups.push(
      `<div class="blk cgroup${book.logo.colors.length > 4 ? ' wide' : ''}"><h4>${esc(t.colors.logo)}</h4><div class="swrow">${book.logo.colors.map((s) => swatch(ctx, s, false)).join('')}</div></div>`,
    );
  groups.push(`<p class="blk note wide">${esc(t.colors.note(book.colors.hasTokens))}</p>`);
  return sheet(ctx, t.colors.title, book.colors.hasTokens ? t.colors.lead : t.colors.leadPalette, groups.join(''), 'grid2');
}

function practicePage(ctx: Context): string {
  const { book, t } = ctx;
  const bar = book.colors.proportions
    .map((p) => `<i style="flex:${Number(p.use) || 0};background:${safe.color(p.hex)}" title="${esc(p.name)}"></i>`)
    .join('');
  const legend = book.colors.proportions
    .slice(0, 8)
    .map((p) => `<span><i style="background:${safe.color(p.hex)}"></i>${esc(p.name)} ${Math.round(p.use * 100)}%</span>`)
    .join('');
  const { texts, backgrounds, cells } = book.colors.contrast;
  const rows = texts
    .map((text) => {
      const row = backgrounds
        .map((background) => {
          const cell = cells.find((x) => x.text === text && x.background === background);
          if (!cell) return '<td></td>';
          return `<td><span class="pair" style="background:${safe.color(cell.backgroundHex)};color:${safe.color(cell.textHex)}">Aa</span> ${esc(new Intl.NumberFormat(ctx.lang, { maximumFractionDigits: 1 }).format(cell.ratio))}:1 <b class="${cell.level === 'fail' ? 'bad' : 'ok'}">${esc(t.practice.levels[cell.level])}</b></td>`;
        })
        .join('');
      return `<tr><th>${esc(text)}</th>${row}</tr>`;
    })
    .join('');
  const body = `<div class="blk"><h4>${esc(t.practice.proportions)}</h4><div class="ubar">${bar}</div><p class="legend small">${legend}</p>
<p class="small muted">${esc(t.practice.proportionsNote)}</p></div>
${rows ? `<div class="blk"><h4>${esc(t.practice.contrast)}</h4><table class="ct"><thead><tr><th></th>${backgrounds.map((b) => `<th>${esc(b)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>
<p class="small muted">${esc(t.practice.contrastNote)}</p></div>` : ''}`;
  return sheet(ctx, t.practice.title, '', body);
}

function typeSample(ctx: Context, style: TextStyle): { html: string; image: boolean } {
  const shown = Math.min(style.sizePx, { h1: 46, h2: 34, h3: 26, p: 17, a: 17 }[style.key]);
  if (ctx.embedded.has(style.family)) {
    const spacing = style.letterSpacing === null ? 'normal' : `${style.letterSpacing / 100}em`;
    return {
      image: false,
      html: `<div class="tsample" style="font-family:${fontOf(ctx, style.family)};font-weight:${safe.weight(style.weight)};font-size:${Number(shown) || 16}px;letter-spacing:${spacing};text-transform:${safe.transform(style.transform)}">${esc(style.sample || style.family)}</div>`,
    };
  }
  const picture = ctx.assets.images[`type-${style.key}`];
  if (picture) return { image: true, html: `<div class="tsample"><img src="${esc(picture)}" alt="${esc(style.sample)}"></div>` };
  return { image: false, html: `<div class="tsample" style="font-size:${shown}px">${esc(style.sample)}</div>` };
}

function typographyPage(ctx: Context): string {
  const { book, t, lang } = ctx;
  const ty = book.typography;
  let images = false;
  const rows = ty.styles
    .filter((s) => s.key !== 'a')
    .map((style) => {
      const sample = typeSample(ctx, style);
      images ||= sample.image;
      const size = new Intl.NumberFormat(lang, { maximumFractionDigits: 2 }).format(style.sizePx);
      const line = style.lineHeight === null ? 'normal' : new Intl.NumberFormat(lang, { minimumFractionDigits: 2 }).format(style.lineHeight);
      return `<div class="blk trow"><div class="tmeta"><b>${esc(t.type.styles[style.key])}</b><span>${esc(style.family)} ${style.weight}</span><span>${size} px / ${line}</span><span>${esc(t.type.spacing(style.letterSpacing, lang))}</span></div>${sample.html}</div>`;
    })
    .join('');
  const families = ty.families
    .slice(0, 5)
    .map(
      (f) =>
        `<tr><td><b style="font-family:${fontOf(ctx, f.name)}">${esc(f.name)}</b></td><td>${esc(t.type.shareOfText(Math.round(f.share * 100)))}</td></tr>`,
    )
    .join('');
  const sources = [...new Set(ty.families.map((f) => t.type.sources[f.source]))].join(', ');
  const side = `<div class="blk"><h4>${esc(t.type.families)}</h4><table class="kv">${families}</table>
<p class="small">${esc(t.type.weights(ty.weights.join(', ')))} ${esc(t.type.source(sources))}</p>
<p class="small">${esc(t.type.sizes(ty.sizes.length, ty.sizes.slice(0, 16).join(', ')))}</p>
<p class="note">${esc(t.type.licence)}${images ? ` ${esc(t.type.images)}` : ''}</p></div>`;
  return sheet(ctx, t.type.title, t.type.lead(ty.heading, ty.body), `<div class="cols2"><div>${rows}</div><div>${side}</div></div>`);
}

function uiPage(ctx: Context): string {
  const { book, t } = ctx;
  const base = book.colors.base;
  const accent = safe.color(book.colors.groups.accent?.[0]?.hex, c.accent);
  const buttons = book.ui.buttons
    .map((b) => {
      const picture = ctx.assets.images[`button-${b.index}`];
      if (picture) return `<img class="btnshot" src="${esc(picture)}" alt="${esc(b.text)}">`;
      // A gradient button is rebuilt in the brand's main accent, the nearest flat colour there is
      const background = b.background ?? (b.gradient ? accent : null);
      return `<span class="btnx" style="background:${safe.color(background)};color:${safe.color(b.color, 'inherit')};${safe.border(b.border)}border-radius:${safe.length(b.radius)};font-family:${fontOf(ctx, b.family)};font-weight:${safe.weight(b.weight)};text-transform:${safe.transform(b.transform)}">${esc(b.text)}</span>`;
    })
    .join('');
  const nav = ctx.assets.images.nav;
  const radii = book.ui.radii
    .map((r) => `<div><i style="border-radius:${safe.length(r)};border-color:${accent}"></i><span>${esc(r)}</span></div>`)
    .join('');
  const desktop = ctx.assets.images.desktop;
  const mobile = ctx.assets.images.mobile;
  const rebuilt = book.approximate.includes('buttons') && book.ui.buttons.some((b) => !ctx.assets.images[`button-${b.index}`]);
  const left = `${buttons ? `<div class="blk"><h4>${esc(t.ui.buttons)}${rebuilt ? ` ${tag(t.approximate)}` : ''}</h4><div class="btns" style="background:${safe.color(base)}">${buttons}</div>${rebuilt ? `<p class="small muted gap">${esc(t.ui.rebuilt)}</p>` : ''}</div>` : ''}
${nav ? `<div class="blk"><h4>${esc(t.ui.nav)}</h4><div class="navshot" style="background:${safe.color(base)}"><img src="${esc(nav)}" alt=""></div></div>` : ''}
${radii ? `<div class="blk"><h4>${esc(t.ui.radii)}</h4><div class="radii">${radii}</div></div>` : ''}`;
  const right = `${desktop || mobile ? `<div class="blk"><h4>${esc(t.ui.screens)}</h4><div class="shots">${desktop ? `<img class="desk" src="${esc(desktop)}" alt="">` : ''}${mobile ? `<img class="mob" src="${esc(mobile)}" alt="">` : ''}</div></div>` : ''}
<div class="blk"><h4>${esc(t.ui.character)} ${tag(t.proposal)}</h4><p class="small">${esc(t.character(book.ui.character))}</p></div>`;
  return sheet(ctx, t.ui.title, '', `<div class="cols2"><div>${left}</div><div>${right}</div></div>`);
}

// One A4 page holds about this many rows next to the screenshot; the rest are in the token files
const PAIRS_SHOWN = 12;

function darkPage(ctx: Context, dark: DarkSection): string {
  const { book, t } = ctx;
  const chip = (hex: string) => `<i style="background:${safe.color(hex)}"></i>${esc(hex)}`;
  const all = darkPairs(book);
  const pairs = all
    .slice(0, PAIRS_SHOWN)
    .map((s) => `<tr><th>${esc(s.name)}</th><td>${chip(s.hex)}</td><td>${chip(s.dark!)}</td></tr>`)
    .join('');
  const more = all.length > PAIRS_SHOWN ? `<p class="small muted gap">${esc(t.dark.more(all.length - PAIRS_SHOWN))}</p>` : '';
  const palette = dark.swatches
    .slice(0, 10)
    .map((s) => swatch(ctx, s, false))
    .join('');
  const left = pairs
    ? `<div class="blk"><h4>${esc(t.dark.pairs)}</h4><table class="ct pairs"><thead><tr><th></th><th>${esc(t.dark.light)}</th><th>${esc(t.dark.dark)}</th></tr></thead><tbody>${pairs}</tbody></table>${more}</div>`
    : `<div class="blk"><h4>${esc(t.dark.palette)}</h4><div class="swrow">${palette}</div></div>`;
  const shot = ctx.assets.images.dark;
  const approximate = book.approximate.includes('dark') && !shot;
  const right = `<div class="blk"><h4>${esc(t.dark.screen)}${approximate ? ` ${tag(t.approximate)}` : ''}</h4>${
    shot ? `<div class="shots"><img class="desk" src="${esc(shot)}" alt=""></div>` : `<p class="small muted">${esc(t.dark.noShot)}</p>`
  }<p class="small gap">${esc(t.dark.base(dark.base))}</p></div>`;
  return sheet(ctx, t.dark.title, t.dark.lead(dark.toggle), `<div class="cols2"><div>${left}</div><div>${right}</div></div>`);
}

function tonePage(ctx: Context): string {
  const { book, t, lang } = ctx;
  const tone = book.tone;
  const left = `<div class="blk"><h4>${esc(t.tone.how)}</h4><table class="kv">
<tr><td>${esc(t.tone.address)}</td><td>${esc(t.tone.addressValue[tone.address])}</td></tr>
${tone.averageSentenceWords !== null ? `<tr><td>${esc(t.tone.sentence)}</td><td>${esc(t.tone.words(tone.averageSentenceWords, lang))}</td></tr>` : ''}
<tr><td>${esc(t.tone.headings)}</td><td>${esc(t.tone.caseValue[tone.headingCase])}</td></tr></table></div>
${tone.examples.length ? `<div class="blk"><h4>${esc(t.tone.examples)}</h4><ul class="quotes">${tone.examples.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></div>` : ''}
${tone.ctas.length ? `<div class="blk"><h4>${esc(t.tone.ctas)}</h4><p class="ctas">${tone.ctas.map((x) => `<span>${esc(x)}</span>`).join('')}</p></div>` : ''}`;
  const notes = book.consistency.map((s) => `<li>${esc(t.suggestion(s, lang))}</li>`).join('');
  const right = `<div class="blk"><h4>${esc(t.tone.consistency)} ${tag(t.suggestions)}</h4><ul class="notes">${notes || `<li>${esc(t.tone.none)}</li>`}</ul></div>`;
  return sheet(ctx, t.tone.title, '', `<div class="cols2"><div>${left}</div><div>${right}</div></div>`);
}

function fontFaces(ctx: Context): string {
  const faces = [
    `@font-face { font-family: 'Geist'; src: url("${ctx.assets.fontSans}") format("woff2"); font-weight: 100 900; }`,
    `@font-face { font-family: 'Geist Mono'; src: url("${ctx.assets.fontMono}") format("woff2"); font-weight: 100 900; }`,
  ];
  for (const font of ctx.assets.brandFonts) {
    const src = safe.dataUri(font.src) || (/^[\w./-]+$/.test(font.src) ? font.src : '');
    if (!src) continue;
    const range = safe.unicodeRange(font.unicodeRange);
    faces.push(
      `@font-face { font-family: 'bb-${slug(font.family)}'; src: url("${src}"); font-weight: ${safe.weight(font.weight)}; font-style: ${safe.fontStyle(font.style)};${range ? ` unicode-range: ${range};` : ''} }`,
    );
  }
  return faces.join('\n');
}

function styles(ctx: Context): string {
  const heading = fontOf(ctx, ctx.book.typography.heading);
  const body = fontOf(ctx, ctx.book.typography.body);
  const h1 = ctx.book.typography.styles.find((s) => s.key === 'h1');
  return `${fontFaces(ctx)}
@page { size: A4 landscape; margin: 0; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
html, body { margin: 0; }
body { background: ${c.canvas}; color: ${c.text}; font: 400 12.5px/1.5 ${body}; -webkit-font-smoothing: antialiased; }
h1, h2, h3, h4, p, ul, dl, figure { margin: 0; }
.sheet { position: relative; display: flex; flex-direction: column; width: 297mm; height: 210mm; padding: 38px 52px 50px; overflow: hidden; background: ${SHEET_BG}; break-after: page; }
@media screen { .sheet { margin: 8mm auto; box-shadow: 0 2mm 8mm color-mix(in srgb, ${c.text} 12%, transparent); } }
.ph { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid ${c.line}; font-size: 11px; color: ${c.text2}; }
.ph img { height: 20px; max-width: 120px; object-fit: contain; }
h2 { font-family: ${heading}; font-size: 30px; font-weight: ${h1?.weight ?? 600}; letter-spacing: -0.02em; line-height: 1.1; }
h4 { margin-bottom: 8px; font-size: 12px; font-weight: 600; }
.tag { margin-left: 6px; padding: 1px 8px; border-radius: 99px; background: ${c.surface}; color: ${c.text2}; font-size: 10.5px; font-style: normal; font-weight: 500; }
.lead { max-width: 760px; margin-top: 6px; color: ${c.text2}; font-size: 13.5px; }
.body { flex: 1; min-height: 0; margin-top: 18px; overflow: hidden; }
.blk + .blk { margin-top: 18px; }
.gap { margin-top: 14px; }
.pf { position: absolute; left: 52px; right: 52px; bottom: 20px; display: flex; justify-content: space-between; color: ${c.text2}; font-size: 10.5px; }
.small { font-size: 11.5px; }
.muted { color: ${c.text2}; }
.mono { font-family: 'Geist Mono', ui-monospace, monospace; font-size: 10.5px; }
.note { margin-top: 10px; color: ${c.text2}; font-size: 10.5px; }
ul.small { padding-left: 14px; }
ul.dash { padding-left: 14px; }
.cover { padding: 56px 64px; }
.cover-logo { align-self: flex-start; height: 56px; max-width: 320px; object-fit: contain; object-position: left center; }
.cover-t { margin-top: auto; }
.kicker { opacity: 0.72; font-size: 14px; }
.cover h1 { margin: 6px 0 16px; font-size: 96px; letter-spacing: -0.04em; line-height: 1; overflow-wrap: anywhere; }
.cover-lead { max-width: 600px; opacity: 0.78; font-size: 14px; }
.cover-note { max-width: 600px; margin-top: 10px; opacity: 0.78; font-size: 11.5px; }
.cover-f { display: flex; justify-content: space-between; margin-top: 52px; padding-top: 14px; border-top: 1px solid; opacity: 0.8; font-size: 12px; }
.lgrid { display: grid; gap: 12px; }
.lg { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; height: 210px; padding: 18px; border-radius: 18px; box-shadow: inset 0 0 0 1px color-mix(in srgb, ${c.text} 8%, transparent); }
.lg img, .lg .layers { max-width: 82%; max-height: 120px; object-fit: contain; }
.layers { position: relative; display: inline-grid; }
.layers img { grid-area: 1 / 1; width: 100%; height: 100%; object-fit: contain; }
.cover .layers img { height: 56px; width: auto; }
.lg.icon img { max-height: 96px; border-radius: 18px; }
.lg.share img { max-height: 140px; border-radius: 8px; }
.lg figcaption { font-size: 10.5px; }
.cols3 { display: grid; grid-template-columns: 1.3fr 1fr 1fr; gap: 28px; }
.cols2 { display: grid; grid-template-columns: 1.1fr 1fr; gap: 36px; height: 100%; }
.grid2 .body { display: grid; grid-template-columns: 1fr 1fr; align-content: start; gap: 14px 28px; }
.grid2 .body .blk + .blk { margin-top: 0; }
.cgroup.wide, .note.wide { grid-column: span 2; }
.swrow { display: flex; flex-wrap: wrap; gap: 8px; }
.sw { width: 104px; }
.sw .chip { display: flex; flex-direction: column; justify-content: space-between; height: 50px; padding: 8px 10px; border-radius: 12px; box-shadow: inset 0 0 0 1px color-mix(in srgb, ${c.text} 10%, transparent); font-size: 10.5px; }
.sw .chip b { overflow: hidden; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.sw .chip span { opacity: 0.82; font-size: 9.5px; }
.sw dl { display: grid; grid-template-columns: auto 1fr; gap: 0 6px; margin-top: 5px; color: ${c.text2}; font-size: 9.5px; line-height: 1.35; }
.sw dd { margin: 0; color: ${c.text}; overflow-wrap: anywhere; }
.ubar { display: flex; height: 44px; overflow: hidden; border-radius: 12px; box-shadow: inset 0 0 0 1px color-mix(in srgb, ${c.text} 10%, transparent); }
.ubar i { display: block; }
.legend { display: flex; flex-wrap: wrap; gap: 4px 14px; margin: 8px 0 4px; }
.legend span { display: inline-flex; align-items: center; gap: 5px; }
.legend i { width: 9px; height: 9px; border-radius: 50%; box-shadow: inset 0 0 0 1px color-mix(in srgb, ${c.text} 20%, transparent); }
.ct { border-collapse: collapse; font-size: 11.5px; }
.ct th, .ct td { padding: 7px 14px 7px 0; border-bottom: 1px solid ${c.line}; text-align: left; white-space: nowrap; }
.pair { display: inline-block; width: 34px; margin-right: 4px; padding: 3px 0; border-radius: 6px; box-shadow: inset 0 0 0 1px color-mix(in srgb, ${c.text} 10%, transparent); font-weight: 600; text-align: center; }
.pairs i { display: inline-block; width: 22px; height: 16px; margin-right: 8px; vertical-align: -3px; border-radius: 5px; box-shadow: inset 0 0 0 1px color-mix(in srgb, ${c.text} 14%, transparent); }
.pairs td { font-family: 'Geist Mono', ui-monospace, monospace; font-size: 10.5px; }
.ok { color: ${c.good}; font-weight: 600; }
.bad { color: ${c.critical}; font-weight: 600; }
.trow { display: grid; grid-template-columns: 150px minmax(0, 1fr); align-items: center; gap: 16px; padding: 10px 0; border-bottom: 1px solid ${c.line}; }
.trow + .trow { margin-top: 0; }
.tmeta { display: flex; flex-direction: column; color: ${c.text2}; font-size: 10.5px; }
.tmeta b { color: ${c.text}; font-size: 11.5px; }
.tsample { overflow: hidden; line-height: 1.15; text-overflow: ellipsis; white-space: nowrap; }
.tsample img { display: block; max-width: 100%; max-height: 64px; object-fit: contain; object-position: left center; }
.kv { width: 100%; margin-bottom: 10px; border-collapse: collapse; font-size: 12px; }
.kv td { padding: 6px 0; border-bottom: 1px solid ${c.line}; }
.kv td:last-child { text-align: right; }
.btns, .navshot { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 18px; border-radius: 16px; box-shadow: inset 0 0 0 1px color-mix(in srgb, ${c.text} 8%, transparent); }
.btnshot { max-height: 52px; max-width: 240px; object-fit: contain; }
.btnx { display: inline-block; padding: 10px 20px; font-size: 14px; }
.navshot img { display: block; max-width: 100%; }
.radii { display: flex; flex-wrap: wrap; gap: 14px; }
.radii div { display: flex; flex-direction: column; align-items: center; gap: 4px; color: ${c.text2}; font-size: 10px; }
.radii i { display: block; width: 48px; height: 36px; border: 2px solid; }
.shots { position: relative; height: 300px; }
.shots .desk { width: 86%; border-radius: 12px; box-shadow: 0 12px 30px color-mix(in srgb, ${c.text} 18%, transparent); }
.shots .mob { position: absolute; right: 0; bottom: 0; width: 25%; border-radius: 16px; box-shadow: 0 12px 30px color-mix(in srgb, ${c.text} 25%, transparent); }
.quotes { padding-left: 16px; font-size: 12.5px; }
.quotes li { margin-bottom: 4px; }
.ctas span { display: inline-block; margin: 0 6px 6px 0; padding: 4px 12px; border: 1px solid ${c.line}; border-radius: 99px; font-size: 11.5px; font-weight: 600; }
.notes { padding-left: 16px; font-size: 12px; }
.notes li { margin-bottom: 9px; }
`;
}

// Moves blocks that do not fit to a continuation page with the same heading, then numbers the pages
const PAGINATE = `
(async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].map((img) => (img.decode ? img.decode().catch(() => undefined) : undefined)));
  const continued = document.body.dataset.continued;
  const settle = (sheet) => {
    const body = sheet.querySelector('.body');
    if (!body) return;
    const moved = [];
    const blocks = () => body.querySelectorAll('.blk');
    while (body.scrollHeight > body.clientHeight + 1 && blocks().length > 1) {
      const last = blocks()[blocks().length - 1];
      moved.unshift(last);
      last.remove();
    }
    if (!moved.length) return;
    const next = sheet.cloneNode(true);
    const nextBody = next.querySelector('.body');
    nextBody.replaceChildren(...moved);
    const title = next.querySelector('h2');
    title.textContent = title.dataset.title + ' (' + continued + ')';
    next.querySelector('.lead')?.remove();
    sheet.after(next);
    settle(next);
  };
  for (const sheet of [...document.querySelectorAll('.sheet:not(.cover)')]) settle(sheet);
  const all = document.querySelectorAll('.sheet');
  all.forEach((sheet, i) => {
    const num = sheet.querySelector('.num');
    if (num) num.textContent = (i + 1) + ' / ' + all.length;
  });
  window.sitelensReady = true;
})();
`;

/** The brandbook's inline script, so a page with a strict Content Security Policy can allow it by hash. */
export const brandbookInlineScript = () => PAGINATE;

/** The brandbook as one self-contained HTML document of A4 landscape pages, ready to print. */
export function renderBrandbook(book: Brandbook, assets: BrandbookAssets, lang: Lang): string {
  const ctx: Context = {
    book,
    t: brandbookStrings[lang],
    lang,
    assets,
    date: formatDate(book.generatedAt, lang),
    embedded: new Set(assets.brandFonts.map((f) => f.family)),
  };
  const pages = [
    cover(ctx),
    logoPage(ctx),
    colorsPage(ctx),
    practicePage(ctx),
    typographyPage(ctx),
    uiPage(ctx),
    ...(book.dark ? [darkPage(ctx, book.dark)] : []),
    tonePage(ctx),
  ];
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(ctx.t.headerTitle(book.name))}</title>
<style>${styles(ctx)}</style>
</head>
<body data-continued="${esc(ctx.t.continued)}">
${pages.join('\n')}
<script>${PAGINATE}</script>
</body>
</html>`;
}
