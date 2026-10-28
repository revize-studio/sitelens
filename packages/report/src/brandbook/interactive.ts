import { parseColor, toCmyk, toCss, toDtcg, toRgb255, toTailwind, type Brandbook, type Swatch, type TextStyle } from '@sitelens/brand';
import { formatDate, type Lang } from '@sitelens/core';
import { defaultTheme } from '../theme';
import type { BrandbookAssets } from './html';
import { brandbookStrings, type BrandbookStrings } from './i18n';
import { coverLogo, darkPairs, esc, fileLabel, isDarkHex, logoTiles, ROLES, safe, variantImage } from './shared';

/** What the interactive brandbook needs: Geist for its own text and the pictures. It embeds no brand fonts. */
export type InteractiveAssets = Pick<BrandbookAssets, 'fontSans' | 'fontMono' | 'images'>;

const c = defaultTheme.colors;

interface Context {
  book: Brandbook;
  t: BrandbookStrings;
  lang: Lang;
  images: Record<string, string>;
  date: string;
}

const tag = (text: string) => `<em class="tag">${esc(text)}</em>`;
// The same clean-up as the token files, so a copied stack is valid CSS whatever the site called its font
const familyStack = (family: string) =>
  `"${[...family].filter((ch) => ch.charCodeAt(0) >= 32 && !'"\\{};'.includes(ch)).join('')}", system-ui, sans-serif`;

function section(id: string, title: string, lead: string, body: string): string {
  return `<section class="sec" id="${id}" aria-labelledby="${id}-title"><div class="wrap">
<h2 id="${id}-title" tabindex="-1">${title}</h2>${lead ? `<p class="lead">${esc(lead)}</p>` : ''}
${body}
</div></section>`;
}

/** A colour as a button that copies its value in the format picked above the palette. */
function colorButton(hex: string, name: string, detail: string): string {
  const color = parseColor(hex);
  if (!color) return '';
  const [r, g, b] = toRgb255(color);
  const [cy, m, y, k] = toCmyk(color);
  return `<button type="button" class="sw" data-swatch data-hex="${esc(hex)}" data-rgb="rgb(${r}, ${g}, ${b})" data-cmyk="C${cy} M${m} Y${y} K${k}">
<span class="chip" style="background:${safe.color(hex)}"></span><span class="sw-name">${esc(name)}</span>${detail ? `<span class="sw-detail">${esc(detail)}</span>` : ''}<span class="sw-value" data-label>${esc(hex)}</span></button>`;
}

const copyButton = (label: string, attributes: string) =>
  `<button type="button" class="btn-copy" ${attributes}><span data-label>${esc(label)}</span></button>`;

function hero(ctx: Context): string {
  const { book, t } = ctx;
  const base = book.colors.base;
  const fg = isDarkHex(base) ? c.page : c.text;
  const logo = coverLogo(book, ctx.images, 'hero-logo') ?? '';
  return `<header class="hero" style="background:${safe.color(base)};color:${fg}"><div class="wrap">
${logo}
<p class="kicker">${esc(t.brandbook)}</p>
<h1>${esc(book.name)}</h1>
<p class="hero-lead">${esc(t.coverLead(book.host))}</p>
${book.approximate.includes('limited') ? `<p class="hero-note">${esc(t.limited)}</p>` : ''}
<p class="hero-meta" style="border-color:color-mix(in srgb, ${fg} 24%, transparent)"><span>${esc(ctx.date)}</span><span>${esc(t.generated)} · ${esc(t.mode[book.mode])}</span></p>
</div></header>`;
}

function logoSection(ctx: Context): string {
  const { book, t } = ctx;
  const tiles = logoTiles(book, ctx.images, t.logo.variant, { page: c.page, surface: c.surface })
    .map(
      (tile) =>
        `<figure class="tile ${tile.kind}" style="background:${safe.color(tile.background)}">${tile.picture}<figcaption style="color:${isDarkHex(tile.background) ? c.line : c.text2}">${esc(tile.caption)}</figcaption></figure>`,
    )
    .join('');
  const files = book.logo.files.map((f) => `<li class="mono">${esc(f.url ? fileLabel(f.url, book.host) : t.logo.inline)}</li>`).join('');
  const p = book.logo.proposals;
  const proposals = p
    ? `<div><h3>${esc(t.logo.clearSpace)} ${tag(t.proposal)}</h3><p>${esc(t.logo.clearSpaceText(p.clearSpacePx))}</p>
<h3>${esc(t.logo.minSize)} ${tag(t.proposal)}</h3><p>${esc(t.logo.minSizeText(p.minWidthPx, p.markMinPx))}</p></div>
<div><h3>${esc(t.logo.dont)} ${tag(t.proposal)}</h3><ul class="list">${p.prohibitions.map((x) => `<li>${esc(t.logo.prohibitions[x] ?? x)}</li>`).join('')}</ul></div>`
    : '';
  const body = `${book.logo.found ? '' : `<p class="note">${esc(t.logo.none)}</p>`}
${tiles ? `<div class="tiles">${tiles}</div>` : ''}
<div class="cols"><div><h3>${esc(t.logo.files)}</h3><ul class="files">${files}</ul></div>${proposals}</div>
<p class="note">${esc(t.logo.owner)}</p>`;
  return section('logo', esc(t.logo.title), t.logo.lead, body);
}

function shareLabel(ctx: Context, s: Swatch): string {
  return s.share >= 0.01 ? ctx.t.colors.share(Math.min(100, Math.round(s.share * 100)), s.role) : ctx.t.colors.inTokens;
}

function colorsSection(ctx: Context): string {
  const { book, t } = ctx;
  const p = t.page;
  const groups = ROLES.map((role) => [role, book.colors.groups[role] ?? []] as const)
    .filter(([, list]) => list.length)
    .map(
      ([role, list]) =>
        `<h3>${esc(t.colors.roles[role])}</h3><div class="swatches">${list.map((s) => colorButton(s.hex, s.name, s.token ?? shareLabel(ctx, s))).join('')}</div>`,
    );
  if (book.logo.colors.length)
    groups.push(`<h3>${esc(t.colors.logo)}</h3><div class="swatches">${book.logo.colors.map((s) => colorButton(s.hex, s.name, '')).join('')}</div>`);
  const formats = (['hex', 'rgb', 'cmyk'] as const)
    .map((f, i) => `<button type="button" data-format="${f}" aria-pressed="${i === 0}">${f.toUpperCase()}</button>`)
    .join('');
  const body = `<div class="tools"><div class="seg" role="group" aria-label="${esc(p.format)}">${formats}</div><p class="small muted">${esc(p.copyHint)}</p></div>
${groups.join('\n')}
<p class="note">${esc(t.colors.note(book.colors.hasTokens))}</p>`;
  return section('colors', esc(t.colors.title), book.colors.hasTokens ? t.colors.lead : t.colors.leadPalette, body);
}

function practiceSection(ctx: Context): string {
  const { book, t, lang } = ctx;
  const bar = book.colors.proportions
    .map((p) => `<i style="flex:${Number(p.use) || 0};background:${safe.color(p.hex)}" title="${esc(p.name)}"></i>`)
    .join('');
  const legend = book.colors.proportions
    .slice(0, 10)
    .map((p) => `<span><i style="background:${safe.color(p.hex)}"></i>${esc(p.name)} ${Math.round(p.use * 100)}%</span>`)
    .join('');
  const { texts, backgrounds, cells } = book.colors.contrast;
  const ratio = new Intl.NumberFormat(lang, { maximumFractionDigits: 1 });
  const rows = texts
    .map((text) => {
      const row = backgrounds
        .map((background) => {
          const cell = cells.find((x) => x.text === text && x.background === background);
          if (!cell) return '<td></td>';
          return `<td><span class="pair" style="background:${safe.color(cell.backgroundHex)};color:${safe.color(cell.textHex)}">Aa</span> ${esc(ratio.format(cell.ratio))}:1 <b class="${cell.level === 'fail' ? 'bad' : 'ok'}">${esc(t.practice.levels[cell.level])}</b></td>`;
        })
        .join('');
      return `<tr><th scope="row">${esc(text)}</th>${row}</tr>`;
    })
    .join('');
  const body = `<h3>${esc(t.practice.proportions)}</h3><div class="ubar" aria-hidden="true">${bar}</div><p class="legend">${legend}</p>
<p class="small muted">${esc(t.practice.proportionsNote)}</p>
${rows ? `<h3>${esc(t.practice.contrast)}</h3><div class="scroll"><table class="ct"><thead><tr><td></td>${backgrounds.map((b) => `<th scope="col">${esc(b)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>
<p class="small muted">${esc(t.practice.contrastNote)}</p>` : ''}`;
  return section('practice', esc(t.practice.title), '', body);
}

function typeSample(ctx: Context, style: TextStyle): { html: string; image: boolean } {
  const picture = ctx.images[`type-${style.key}`];
  if (picture) return { image: true, html: `<div class="tsample"><img src="${esc(picture)}" alt="${esc(style.sample)}"></div>` };
  const shown = Math.min(style.sizePx, { h1: 52, h2: 38, h3: 28, p: 18, a: 18 }[style.key]);
  return {
    image: false,
    html: `<div class="tsample" style="font-size:${Number(shown) || 16}px;font-weight:${safe.weight(style.weight)};text-transform:${safe.transform(style.transform)}">${esc(style.sample || style.family)}</div>`,
  };
}

function typeSection(ctx: Context): string {
  const { book, t, lang } = ctx;
  const ty = book.typography;
  let missing = false;
  const rows = ty.styles
    .filter((s) => s.key !== 'a')
    .map((style) => {
      const sample = typeSample(ctx, style);
      missing ||= !sample.image;
      const size = new Intl.NumberFormat(lang, { maximumFractionDigits: 2 }).format(style.sizePx);
      const line = style.lineHeight === null ? 'normal' : new Intl.NumberFormat(lang, { minimumFractionDigits: 2 }).format(style.lineHeight);
      return `<div class="trow"><div class="tmeta"><b>${esc(t.type.styles[style.key])}</b><span>${esc(style.family)} ${style.weight}</span><span>${size} px / ${line}</span><span>${esc(t.type.spacing(style.letterSpacing, lang))}</span></div>${sample.html}</div>`;
    })
    .join('');
  const families = ty.families
    .slice(0, 6)
    .map(
      (f) =>
        `<li class="fam"><span><b>${esc(f.name)}</b> <span class="muted">${esc(t.type.shareOfText(Math.round(f.share * 100)))}</span></span>${copyButton(t.page.copyStack, `data-copy="${esc(familyStack(f.name))}"`)}</li>`,
    )
    .join('');
  const sources = [...new Set(ty.families.map((f) => t.type.sources[f.source]))].join(', ');
  const body = `<div class="cols type"><div>${rows}${missing ? `<p class="note">${esc(t.page.noTypeImage)}</p>` : ''}</div>
<div><h3>${esc(t.type.families)}</h3><ul class="fams">${families}</ul>
<p class="small">${esc(t.type.weights(ty.weights.join(', ')))} ${esc(t.type.source(sources))}</p>
<p class="small">${esc(t.type.sizes(ty.sizes.length, ty.sizes.slice(0, 16).join(', ')))}</p>
<p class="note">${esc(t.type.licence)}</p></div></div>`;
  return section('type', esc(t.type.title), t.type.lead(ty.heading, ty.body), body);
}

function uiSection(ctx: Context): string {
  const { book, t } = ctx;
  const base = book.colors.base;
  const accent = safe.color(book.colors.groups.accent?.[0]?.hex, c.accent);
  const buttons = book.ui.buttons
    .map((b) => {
      const picture = ctx.images[`button-${b.index}`];
      if (picture) return `<img class="btnshot" src="${esc(picture)}" alt="${esc(b.text)}">`;
      // A gradient button is rebuilt in the brand's main accent, the nearest flat colour there is
      const background = b.background ?? (b.gradient ? accent : null);
      return `<span class="btnx" style="background:${safe.color(background)};color:${safe.color(b.color, 'inherit')};${safe.border(b.border)}border-radius:${safe.length(b.radius)};font-weight:${safe.weight(b.weight)};text-transform:${safe.transform(b.transform)}">${esc(b.text)}</span>`;
    })
    .join('');
  const rebuilt = book.approximate.includes('buttons') && book.ui.buttons.some((b) => !ctx.images[`button-${b.index}`]);
  const nav = ctx.images.nav;
  const radii = book.ui.radii
    .map((r) => `<div><i style="border-radius:${safe.length(r)};border-color:${accent}"></i><span>${esc(r)}</span></div>`)
    .join('');
  const { desktop, mobile } = ctx.images;
  const body = `<div class="cols"><div>
${buttons ? `<h3>${esc(t.ui.buttons)}${rebuilt ? ` ${tag(t.approximate)}` : ''}</h3><div class="stage" style="background:${safe.color(base)}">${buttons}</div>${rebuilt ? `<p class="small muted">${esc(t.ui.rebuilt)}</p>` : ''}` : ''}
${nav ? `<h3>${esc(t.ui.nav)}</h3><div class="stage navshot" style="background:${safe.color(base)}"><img src="${esc(nav)}" alt=""></div>` : ''}
${radii ? `<h3>${esc(t.ui.radii)}</h3><div class="radii">${radii}</div>` : ''}
</div><div>
<h3>${esc(t.ui.character)} ${tag(t.proposal)}</h3><p>${esc(t.character(book.ui.character))}</p>
</div></div>
${desktop || mobile ? `<h3>${esc(t.ui.screens)}</h3><div class="screens">${desktop ? `<img src="${esc(desktop)}" alt="">` : ''}${mobile ? `<img class="mob" src="${esc(mobile)}" alt="">` : ''}</div>` : ''}`;
  return section('ui', esc(t.ui.title), '', body);
}

function darkSection(ctx: Context): string {
  const { book, t } = ctx;
  const dark = book.dark!;
  const pairs = darkPairs(book)
    .map(
      (s) =>
        `<div class="drow"><span class="drow-name">${esc(s.name)}</span>${colorButton(s.hex, t.dark.light, '')}${colorButton(s.dark!, t.dark.dark, '')}</div>`,
    )
    .join('');
  const palette = dark.swatches.map((s) => colorButton(s.hex, s.name, '')).join('');
  const shot = ctx.images.dark;
  const approximate = book.approximate.includes('dark') && !shot;
  const body = `${pairs ? `<h3>${esc(t.dark.pairs)}</h3><div class="drows">${pairs}</div>` : `<h3>${esc(t.dark.palette)}</h3><div class="swatches">${palette}</div>`}
<p class="small">${esc(t.dark.base(dark.base))}</p>
<h3>${esc(t.dark.screen)}${approximate ? ` ${tag(t.approximate)}` : ''}</h3>
${shot ? `<div class="screens one"><img src="${esc(shot)}" alt=""></div>` : `<p class="small muted">${esc(t.dark.noShot)}</p>`}`;
  return section('dark', esc(t.dark.title), t.dark.lead(dark.toggle), body);
}

function toneSection(ctx: Context): string {
  const { book, t, lang } = ctx;
  const tone = book.tone;
  const notes = book.consistency.map((s) => `<li>${esc(t.suggestion(s, lang))}</li>`).join('');
  const body = `<div class="cols"><div>
<h3>${esc(t.tone.how)}</h3><table class="kv">
<tr><td>${esc(t.tone.address)}</td><td>${esc(t.tone.addressValue[tone.address])}</td></tr>
${tone.averageSentenceWords !== null ? `<tr><td>${esc(t.tone.sentence)}</td><td>${esc(t.tone.words(tone.averageSentenceWords, lang))}</td></tr>` : ''}
<tr><td>${esc(t.tone.headings)}</td><td>${esc(t.tone.caseValue[tone.headingCase])}</td></tr></table>
${tone.examples.length ? `<h3>${esc(t.tone.examples)}</h3><ul class="list quotes">${tone.examples.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>` : ''}
${tone.ctas.length ? `<h3>${esc(t.tone.ctas)}</h3><p class="ctas">${tone.ctas.map((x) => `<span>${esc(x)}</span>`).join('')}</p>` : ''}
</div><div>
<h3>${esc(t.tone.consistency)} ${tag(t.suggestions)}</h3><ul class="list notes">${notes || `<li>${esc(t.tone.none)}</li>`}</ul>
</div></div>`;
  return section('tone', esc(t.tone.title), '', body);
}

function tokensSection(ctx: Context): string {
  const { book, t } = ctx;
  const p = t.page.tokens;
  const css = toCss(book);
  const tailwind = toTailwind(book);
  const files = [
    { id: 'css', label: 'CSS', file: 'tokens.css', type: 'text/css', text: css, usage: p.usage.css(/--[\w-]+(?=:)/.exec(css)?.[0] ?? '--brand') },
    { id: 'json', label: 'JSON', file: 'tokens.json', type: 'application/json', text: `${JSON.stringify(toDtcg(book), null, 2)}\n`, usage: p.usage.json },
    {
      id: 'tailwind',
      label: 'Tailwind 4',
      file: 'tailwind.css',
      type: 'text/css',
      text: tailwind,
      usage: p.usage.tailwind(`bg-${/--color-([\w-]+):/.exec(tailwind)?.[1] ?? 'brand'}`),
    },
  ];
  const tabs = files
    .map(
      (f, i) =>
        `<button type="button" role="tab" id="tab-${f.id}" aria-controls="panel-${f.id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-tab>${f.label}</button>`,
    )
    .join('');
  const panels = files
    .map(
      (f, i) => `<div class="panel" role="tabpanel" id="panel-${f.id}" aria-labelledby="tab-${f.id}"${i ? ' hidden' : ''}>
<p class="small muted">${esc(f.usage)}</p>
<pre tabindex="0"><code id="code-${f.id}">${esc(f.text)}</code></pre>
<div class="row"><span class="mono small">${f.file}</span><span class="acts">${copyButton(t.page.copy, `data-copy-from="code-${f.id}"`)}${copyButton(p.download, `data-download="${f.file}" data-from="code-${f.id}" data-type="${f.type}"`)}</span></div>
</div>`,
    )
    .join('');
  return section('tokens', esc(p.title), p.lead, `<div class="seg tabs" role="tablist" aria-label="${esc(p.title)}">${tabs}</div>${panels}`);
}

// Copies colours and font stacks, switches the colour format and the token tabs, and saves token files.
// No imports and no inline handlers, so a page with a strict CSP can allow it by its hash.
const SCRIPT = `
(() => {
  const live = document.querySelector('[data-live]');
  const copied = document.body.dataset.copied;
  const tabs = [...document.querySelectorAll('[data-tab]')];
  const timers = new WeakMap();
  let format = 'hex';

  const label = (el) => el.querySelector('[data-label]');
  const restore = (el) => {
    el.classList.remove('done');
    label(el).textContent = el.hasAttribute('data-swatch') ? el.dataset[format] : label(el).dataset.text;
  };
  const write = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.className = 'offscreen';
      document.body.append(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
  };
  const copy = async (el, text) => {
    await write(text);
    live.textContent = copied + ': ' + text;
    label(el).dataset.text ??= label(el).textContent;
    label(el).textContent = copied;
    el.classList.add('done');
    clearTimeout(timers.get(el));
    timers.set(el, setTimeout(() => restore(el), 1400));
  };
  const select = (tab) => {
    for (const other of tabs) {
      const on = other === tab;
      other.setAttribute('aria-selected', String(on));
      other.tabIndex = on ? 0 : -1;
      document.getElementById(other.getAttribute('aria-controls')).hidden = !on;
    }
  };

  document.addEventListener('click', (event) => {
    const el = event.target.closest('[data-swatch], [data-copy], [data-copy-from], [data-format], [data-tab], [data-download], nav a');
    if (!el) return;
    if (el.matches('nav a')) {
      const target = document.getElementById(el.getAttribute('href').slice(1));
      if (!target) return;
      event.preventDefault();
      const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
      target.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
      target.querySelector('h2').focus({ preventScroll: true });
    } else if (el.dataset.format) {
      format = el.dataset.format;
      document.querySelectorAll('[data-format]').forEach((b) => b.setAttribute('aria-pressed', String(b === el)));
      document.querySelectorAll('[data-swatch]').forEach(restore);
    } else if (el.hasAttribute('data-tab')) {
      select(el);
    } else if (el.dataset.download) {
      const link = document.createElement('a');
      const text = document.getElementById(el.dataset.from).textContent;
      link.href = URL.createObjectURL(new Blob([text], { type: el.dataset.type }));
      link.download = el.dataset.download;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    } else if (el.hasAttribute('data-swatch')) {
      copy(el, el.dataset[format]);
    } else {
      copy(el, el.dataset.copy ?? document.getElementById(el.dataset.copyFrom).textContent);
    }
  });

  document.querySelector('[role="tablist"]')?.addEventListener('keydown', (event) => {
    const i = tabs.indexOf(document.activeElement);
    const next = { ArrowRight: tabs[(i + 1) % tabs.length], ArrowLeft: tabs[(i + tabs.length - 1) % tabs.length], Home: tabs[0], End: tabs[tabs.length - 1] }[event.key];
    if (i < 0 || !next) return;
    event.preventDefault();
    select(next);
    next.focus();
  });

  window.sitelensReady = true;
})();
`;

/** The interactive brandbook's inline script, so a page with a strict Content Security Policy can allow it by hash. */
export const interactiveBrandbookScript = () => SCRIPT;

function styles(assets: InteractiveAssets): string {
  return `@font-face { font-family: 'Geist'; src: url("${assets.fontSans}") format("woff2"); font-weight: 100 900; }
@font-face { font-family: 'Geist Mono'; src: url("${assets.fontMono}") format("woff2"); font-weight: 100 900; }
:root { --page: ${c.page}; --surface: ${c.surface}; --line: ${c.line}; --text: ${c.text}; --text2: ${c.text2}; --accent: ${c.accent}; --good: ${c.good}; --bad: ${c.critical}; }
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; scroll-padding-top: 64px; }
body { margin: 0; background: var(--page); color: var(--text); font: 400 15px/1.55 'Geist', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
h1, h2, h3, p, ul, figure { margin: 0; }
img { max-width: 100%; }
.wrap { width: min(1120px, 100% - 40px); margin-inline: auto; }
.mono, code, pre { font-family: 'Geist Mono', ui-monospace, monospace; }
.small { font-size: 13px; }
.muted { color: var(--text2); }
.note { max-width: 760px; margin-top: 20px; color: var(--text2); font-size: 13px; }
.tag { margin-left: 6px; padding: 1px 9px; border-radius: 99px; background: var(--surface); color: var(--text2); font-size: 12px; font-style: normal; font-weight: 500; vertical-align: 2px; }
a, button { -webkit-tap-highlight-color: transparent; }
:is(a, button, pre):focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
.bar { position: sticky; top: 0; z-index: 2; display: flex; align-items: center; gap: 16px; padding: 10px max(20px, (100% - 1120px) / 2); border-bottom: 1px solid var(--line); background: var(--page); font-size: 13px; }
.bar b { flex: none; font-weight: 600; }
.bar nav { display: flex; gap: 2px; min-width: 0; overflow-x: auto; scrollbar-width: none; }
.bar nav a { padding: 6px 10px; border-radius: 99px; color: var(--text2); text-decoration: none; white-space: nowrap; }
.bar nav a:hover { background: var(--surface); color: var(--text); }
.hero { padding: 64px 0 48px; }
.hero-logo { display: block; height: 56px; max-width: 280px; object-fit: contain; object-position: left center; }
.hero .layers img { height: 56px; width: auto; }
.kicker { margin-top: 64px; opacity: 0.74; font-size: 15px; }
.hero h1 { margin: 4px 0 16px; font-size: clamp(48px, 10vw, 104px); font-weight: 600; letter-spacing: -0.04em; line-height: 1; overflow-wrap: anywhere; }
.hero-lead { max-width: 620px; opacity: 0.82; font-size: 17px; }
.hero-note { max-width: 620px; margin-top: 12px; opacity: 0.82; font-size: 14px; }
.hero-meta { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 4px 24px; margin-top: 40px; padding-top: 14px; border-top: 1px solid; opacity: 0.8; font-size: 13px; }
.sec { padding: 64px 0; border-top: 1px solid var(--line); }
.sec h2 { font-size: clamp(28px, 4vw, 40px); font-weight: 600; letter-spacing: -0.025em; line-height: 1.1; }
.sec h2:focus { outline: none; }
.lead { max-width: 680px; margin-top: 10px; color: var(--text2); font-size: 16px; }
h3 { margin: 32px 0 12px; font-size: 15px; font-weight: 600; }
.cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr)); gap: 0 48px; }
.list { padding-left: 18px; }
.list li + li { margin-top: 6px; }
.tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 230px), 1fr)); gap: 12px; margin-top: 28px; }
.tile { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; min-height: 220px; padding: 24px; border-radius: 18px; box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--text) 8%, transparent); }
.tile img, .tile .layers { max-width: 80%; max-height: 120px; object-fit: contain; }
.tile.icon img { max-height: 96px; border-radius: 18px; }
.tile.share img { max-height: 140px; border-radius: 8px; }
.tile figcaption { font-size: 12px; text-align: center; }
.layers { position: relative; display: inline-grid; }
.layers img { grid-area: 1 / 1; width: 100%; height: 100%; object-fit: contain; }
.files { padding: 0; list-style: none; font-size: 12.5px; }
.files li { padding: 7px 0; border-bottom: 1px solid var(--line); overflow-wrap: anywhere; }
.tools { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 20px; margin-top: 28px; }
.seg { display: inline-flex; max-width: 100%; padding: 3px; overflow-x: auto; border-radius: 99px; background: var(--surface); }
.seg button { flex: none; padding: 7px 14px; border: 0; border-radius: 99px; background: none; color: var(--text2); font: inherit; font-size: 13px; font-weight: 500; cursor: pointer; }
.seg button:is([aria-pressed="true"], [aria-selected="true"]) { background: var(--page); color: var(--text); box-shadow: 0 1px 3px color-mix(in srgb, var(--text) 16%, transparent); }
.swatches { display: grid; grid-template-columns: repeat(auto-fill, minmax(148px, 1fr)); gap: 16px 12px; }
.sw { display: flex; flex-direction: column; min-width: 0; padding: 0; border: 0; border-radius: 14px; background: none; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.sw .chip { height: 80px; margin-bottom: 8px; border-radius: 14px; box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--text) 10%, transparent); transition: transform 160ms cubic-bezier(0.2, 0, 0, 1); }
.sw:hover .chip { transform: translateY(-2px); }
.sw:active .chip { transform: scale(0.97); }
.sw-name, .sw-detail, .sw-value { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sw-name { font-size: 13.5px; font-weight: 600; }
.sw-detail { color: var(--text2); font-size: 12px; }
.sw-value { font-family: 'Geist Mono', ui-monospace, monospace; font-size: 12.5px; }
.done [data-label] { color: var(--good); }
.ubar { display: flex; height: 48px; overflow: hidden; border-radius: 12px; box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--text) 10%, transparent); }
.ubar i { display: block; }
.legend { display: flex; flex-wrap: wrap; gap: 6px 16px; margin: 10px 0 6px; font-size: 13px; }
.legend span { display: inline-flex; align-items: center; gap: 6px; }
.legend i { width: 10px; height: 10px; border-radius: 50%; box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--text) 20%, transparent); }
.scroll { overflow-x: auto; }
.ct { border-collapse: collapse; font-size: 13px; }
.ct th, .ct td { padding: 9px 18px 9px 0; border-bottom: 1px solid var(--line); text-align: left; white-space: nowrap; }
.pair { display: inline-block; width: 38px; margin-right: 6px; padding: 3px 0; border-radius: 6px; box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--text) 10%, transparent); font-weight: 600; text-align: center; }
.ok { color: var(--good); font-weight: 600; }
.bad { color: var(--bad); font-weight: 600; }
.cols.type { grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); }
.trow { display: grid; grid-template-columns: 170px minmax(0, 1fr); align-items: center; gap: 20px; padding: 16px 0; border-bottom: 1px solid var(--line); }
.tmeta { display: flex; flex-direction: column; color: var(--text2); font-size: 12.5px; }
.tmeta b { color: var(--text); font-size: 13.5px; }
.tsample { overflow: hidden; line-height: 1.15; text-overflow: ellipsis; white-space: nowrap; }
.tsample img { display: block; max-height: 72px; object-fit: contain; object-position: left center; }
.fams { margin-bottom: 14px; padding: 0; list-style: none; }
.fam { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--line); font-size: 14px; }
.btn-copy { flex: none; padding: 6px 12px; border: 1px solid var(--line); border-radius: 99px; background: var(--page); color: var(--text); font: inherit; font-size: 12.5px; font-weight: 500; white-space: nowrap; cursor: pointer; }
.btn-copy:hover { background: var(--surface); }
.btn-copy:active { transform: scale(0.97); }
.stage { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 20px; border-radius: 16px; box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--text) 8%, transparent); }
.btnshot { max-height: 52px; object-fit: contain; }
.btnx { display: inline-block; padding: 10px 20px; font-size: 15px; }
.navshot img { display: block; }
.radii { display: flex; flex-wrap: wrap; gap: 16px; }
.radii div { display: flex; flex-direction: column; align-items: center; gap: 4px; color: var(--text2); font-size: 12px; }
.radii i { display: block; width: 52px; height: 40px; border: 2px solid; }
.screens { display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 1fr); align-items: end; gap: 20px; }
.screens.one { grid-template-columns: minmax(0, 1fr); max-width: 860px; }
.screens img { display: block; width: 100%; border-radius: 12px; box-shadow: 0 12px 30px color-mix(in srgb, var(--text) 16%, transparent); }
.screens .mob { border-radius: 18px; }
.drows { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 248px), 1fr)); gap: 24px 16px; }
.drow { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 4px 8px; }
.drow-name { grid-column: 1 / -1; font-size: 13.5px; font-weight: 600; overflow-wrap: anywhere; }
.drow .chip { height: 52px; margin-bottom: 6px; }
.drow .sw-name { color: var(--text2); font-size: 12px; font-weight: 400; }
.kv { width: 100%; border-collapse: collapse; font-size: 14px; }
.kv td { padding: 8px 0; border-bottom: 1px solid var(--line); }
.kv td:last-child { padding-left: 16px; text-align: right; }
.ctas span { display: inline-block; margin: 0 6px 6px 0; padding: 5px 14px; border: 1px solid var(--line); border-radius: 99px; font-size: 13px; font-weight: 600; }
.tabs { margin-top: 28px; }
.panel { margin-top: 16px; }
.panel pre { height: 380px; margin: 12px 0 0; padding: 16px 18px; overflow: auto; border-radius: 14px; background: var(--surface); font-size: 12.5px; line-height: 1.6; tab-size: 2; }
.row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; margin-top: 12px; }
.acts { display: flex; flex-wrap: wrap; gap: 8px; }
.foot { padding: 40px 0 56px; border-top: 1px solid var(--line); color: var(--text2); font-size: 13px; }
.foot p + p { margin-top: 6px; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.offscreen { position: fixed; top: 0; left: -9999px; }
@media (max-width: 760px) {
  .cols.type { grid-template-columns: minmax(0, 1fr); }
  .trow { grid-template-columns: minmax(0, 1fr); gap: 8px; }
  .screens { grid-template-columns: minmax(0, 1fr); }
  .screens .mob { width: 50%; }
  .sec { padding: 48px 0; }
}
@media (prefers-reduced-motion: reduce) {
  .sw .chip { transition: none; }
}
`;
}

/**
 * The brandbook as one self-contained, interactive HTML page that works offline: the same sections
 * as the PDF, colours that copy their value, font stacks and token files to copy or save.
 */
export function renderInteractiveBrandbook(book: Brandbook, assets: InteractiveAssets, lang: Lang): string {
  const t = brandbookStrings[lang];
  const ctx: Context = { book, t, lang, images: assets.images, date: formatDate(book.generatedAt, lang) };
  const sections = [
    ['logo', t.logo.title, logoSection],
    ['colors', t.colors.title, colorsSection],
    ['practice', t.practice.title, practiceSection],
    ['type', t.type.title, typeSection],
    ['ui', t.ui.title, uiSection],
    ...(book.dark ? [['dark', t.dark.title, darkSection] as const] : []),
    ['tone', t.tone.title, toneSection],
    ['tokens', t.page.tokens.title, tokensSection],
  ] as const;
  const icon = book.logo.variants.find((v) => v.kind === 'icon');
  const iconSrc = (icon && variantImage(assets.images, icon)) ?? null;
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t.headerTitle(book.name))}</title>
${iconSrc ? `<link rel="icon" href="${esc(iconSrc)}">` : ''}
<style>${styles(assets)}</style>
</head>
<body data-copied="${esc(t.page.copied)}">
<div class="bar"><b>${esc(t.headerTitle(book.name))}</b><nav aria-label="${esc(t.page.sections)}">${sections.map(([id, title]) => `<a href="#${id}">${esc(title)}</a>`).join('')}</nav></div>
${hero(ctx)}
<main>
${sections.map(([, , render]) => render(ctx)).join('\n')}
</main>
<footer class="foot"><div class="wrap"><p>${esc(t.page.footer(book.host, ctx.date, t.mode[book.mode]))}</p><p>${esc(t.logo.owner)}</p></div></footer>
<p class="visually-hidden" aria-live="polite" data-live></p>
<script>${SCRIPT}</script>
</body>
</html>`;
}
