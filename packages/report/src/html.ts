import type { Metric, ReportCard, ReportModel, ReportSection } from './model';
import { defaultTheme, type ReportTheme } from './theme';

export interface ReportAssets {
  /** The brand logo as inline SVG markup */
  logoSvg: string;
  /** Font sources for @font-face, e.g. data: URIs in the CLI or URLs on the website */
  fontSans: string;
  fontMono: string;
}

const esc = (value: string | number) =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function ring(score: number | null, size: 'xl' | 'md' | 'sm') {
  const value = score ?? 0;
  return `<div class="ring ring-${size}" role="img" aria-label="${score ?? '–'}/100">
    <svg viewBox="0 0 44 44" aria-hidden="true"><circle class="track" cx="22" cy="22" r="18" pathLength="100"/><circle class="arc" cx="22" cy="22" r="18" pathLength="100" stroke-dasharray="${value} 100" transform="rotate(-90 22 22)"/></svg>
    <span>${score ?? '–'}</span></div>`;
}

const pill = (severity: string, label: string) =>
  `<span class="pill"><i class="dot ${severity}"></i>${esc(label)}</span>`;

function fullCard(card: ReportCard, m: ReportModel) {
  const { t } = m;
  return `<article class="card full">
    <div class="card-head"><h3>${esc(card.title)}</h3>${pill(card.severity, card.severityLabel)}</div>
    <div class="cols">
      <div><p class="label">${esc(t.whatIsWrong)}</p><p>${esc(card.whatIsWrong)}</p></div>
      <div><p class="label">${esc(t.whyItMatters)}</p><p>${esc(card.whyItMatters)}</p></div>
    </div>
    <div class="fix"><p class="label">${esc(t.howToFix)}</p><ul>${card.howToFix.map((step) => `<li>${esc(step)}</li>`).join('')}</ul></div>
    <div class="card-foot">
      <div><p class="k">${esc(t.whoFixes)}</p><p class="v">${esc(card.whoFixes)}</p></div>
      <div><p class="k">${esc(t.effort)}</p><p class="v">${esc(card.effort)}</p></div>
      <div><p class="k">${esc(t.where)}</p><p class="v">${esc(card.where)}</p></div>
    </div>
  </article>`;
}

function shortCard(card: ReportCard, m: ReportModel) {
  return `<article class="card short">
    <div class="card-head"><h3>${esc(card.title)}</h3>${pill(card.severity, card.severityLabel)}</div>
    <p class="text">${esc(card.short)}</p>
    <p class="muted">${esc(m.t.shortMeta(card.whoFixes, card.effort))}</p>
  </article>`;
}

const cardHtml = (card: ReportCard, m: ReportModel) => (card.full ? fullCard(card, m) : shortCard(card, m));

function metricHtml(metric: Metric) {
  const dot = { good: 'good', needs: 'important', poor: 'critical' }[metric.rating];
  return `<div class="metric"><p class="k"><i class="dot ${dot}"></i>${esc(metric.label)}</p><p class="v">${esc(metric.value)}</p><p class="muted">${esc(metric.good)}</p></div>`;
}

function sectionBlocks(section: ReportSection, m: ReportModel, newPage: boolean): string[] {
  const note = section.score === null && section.scored ? m.t.notMeasured : section.partial ? m.t.partial : '';
  const head = `<div class="cat-head ${section.scored ? '' : 'no-ring'}">
    ${section.scored ? ring(section.score, 'md') : ''}
    <div><h2>${esc(section.heading)}${note ? ` <small>${esc(note)}</small>` : ''}</h2><p>${esc(section.description)}</p></div>
  </div>
  ${section.metrics.length ? `<div class="metrics">${section.metrics.map(metricHtml).join('')}</div>` : ''}`;
  const [first, ...rest] = section.cards;
  // The heading always travels with the first card, so it never ends up alone at the bottom of a page
  return [
    `<div class="block section"${newPage ? ' data-break="soft"' : ''}>${head}${first ? `<div class="gap"></div>${cardHtml(first, m)}` : `<p class="muted none">${esc(m.t.noProblemsInCategory)}</p>`}</div>`,
    ...rest.map((card) => `<div class="block">${cardHtml(card, m)}</div>`),
  ];
}

function cover(m: ReportModel, assets: ReportAssets) {
  const { t } = m;
  return `<section class="page cover">
    <div class="logo">${assets.logoSvg}</div>
    <div class="cover-title">
      <p class="eyebrow">${esc(t.auditOf)}</p>
      <h1>${esc(m.domain)}</h1>
      <p class="meta"><span>${esc(m.date)}</span><span>${esc(t.pagesChecked(m.pages))}</span><span>${esc(t.devices)}</span></p>
    </div>
    <div class="overall">${ring(m.overall, 'xl')}<div><p class="muted">${esc(t.overallLabel)}</p><p class="sentence">${esc(m.summary)}</p></div></div>
    <div class="rings">${m.rings.map((r) => `<div class="ring-card">${ring(r.score, 'sm')}<p>${esc(r.label)}</p></div>`).join('')}</div>
    <p class="how"><b>${esc(t.howToReadTitle)}</b> ${esc(t.howToRead)}</p>
    <footer class="page-foot"><span>${esc(t.preparedWith)}</span><span class="num"></span></footer>
  </section>`;
}

function flow(m: ReportModel, theme: ReportTheme): string {
  const { t } = m;
  const problems = m.counts.critical + m.counts.important + m.counts.minor;
  const blocks: string[] = [];
  blocks.push(`<div class="block" data-break="before">
    <h2>${esc(t.summaryTitle)}</h2>
    <p class="lead">${esc(m.counts.critical + m.counts.important ? t.summaryLead(problems) : t.summaryLeadClean)}</p>
    <div class="counts">${(['critical', 'important', 'minor', 'pass'] as const)
      .map(
        (key) =>
          `<div class="count"><b>${m.counts[key]}</b>${pill(key === 'pass' ? 'good' : key, t.severityCount[key])}</div>`,
      )
      .join('')}</div>
  </div>`);
  if (m.top.length) {
    blocks.push(`<div class="block"><h3 class="sub">${esc(t.topTitle)}</h3></div>`);
    m.top.forEach((card, i) =>
      blocks.push(`<div class="block tight"><div class="top-item">
        <span class="n">${i + 1}</span>
        <div><h4>${esc(card.title)}</h4><p>${esc(card.summary)}</p><p class="muted">${esc(t.shortMeta(card.whoFixes, card.effort))}</p></div>
        ${pill(card.severity, card.severityLabel)}
      </div></div>`),
    );
  }
  if (m.passed.length)
    blocks.push(
      `<div class="block" data-split><div class="works"><h3>${esc(t.worksWell)}</h3><ul>${m.passed
        .map((text) => `<li>${esc(text)}</li>`)
        .join('')}</ul></div></div>`,
    );

  blocks.push(...m.sections.flatMap((section, i) => sectionBlocks(section, m, i === 0)));
  if (m.offerHelp && theme.studioNote)
    blocks.push(
      `<div class="block" data-optional><p class="help"><b>${esc(t.helpTitle)}</b> ${esc(t.help)} <a href="https://revize.pl">revize.pl</a></p></div>`,
    );

  blocks.push(
    `<div class="block" data-break="before"><h2>${esc(t.appendixTitle)}</h2><p class="lead muted">${esc(t.appendixLead)}</p></div>`,
  );
  if (m.appendix.length) {
    blocks.push(
      `<div class="block tight" data-head><div class="row head">${t.appendixColumns.map((c) => `<span>${esc(c)}</span>`).join('')}</div></div>`,
    );
    for (const row of m.appendix)
      blocks.push(
        `<div class="block tight" data-row><div class="row"><span class="id">${esc(row.id)}</span><span>${esc(row.priority)}</span><span class="details">${esc(row.details)}</span><span>${esc(row.where)}</span></div></div>`,
      );
  }
  blocks.push(
    `<div class="block"><div class="box"><h3>${esc(t.scoringTitle)}</h3><p>${esc(t.scoring)}</p></div></div>`,
  );
  blocks.push(
    `<div class="block"><p class="muted small-gap"><b>${esc(t.methodTitle)}.</b> ${esc(m.method)}${m.skipped ? ` ${esc(m.skipped)}` : ''}</p></div>`,
  );
  return blocks.join('\n');
}

function styles(theme: ReportTheme, assets: ReportAssets) {
  const c = theme.colors;
  return `
@font-face { font-family: "${theme.fonts.sans}"; src: url("${assets.fontSans}") format("woff2"); font-weight: 400 700; }
@font-face { font-family: "${theme.fonts.mono}"; src: url("${assets.fontMono}") format("woff2"); font-weight: 400 700; }
@page { size: A4; margin: 0; }
:root {
  --page: ${c.page}; --surface: ${c.surface}; --line: ${c.line}; --text: ${c.text}; --text-2: ${c.text2};
  --accent: ${c.accent}; --accent-soft: ${c.accentSoft}; --critical: ${c.critical}; --important: ${c.important};
  --minor: ${c.minor}; --good: ${c.good}; --canvas: ${c.canvas};
  --sans: "${theme.fonts.sans}", system-ui, sans-serif; --mono: "${theme.fonts.mono}", ui-monospace, monospace;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
body { background: var(--canvas); color: var(--text); font: 400 13.6px/1.5 var(--sans); -webkit-font-smoothing: antialiased; }
#flow { display: none; }
.page { position: relative; display: flex; flex-direction: column; width: 210mm; height: 297mm; padding: 15mm 15.5mm 12mm; overflow: hidden; background: var(--page); break-after: page; }
@media screen { .page { margin: 10mm auto; box-shadow: 0 2mm 8mm color-mix(in srgb, var(--text) 12%, transparent); } }
.muted { color: var(--text-2); }
.logo svg { display: block; width: auto; height: 9mm; }
.page-head { display: flex; align-items: center; justify-content: space-between; padding-bottom: 4.5mm; border-bottom: 1px solid var(--line); }
.page-head .logo svg { height: 6.2mm; }
.page-head span { color: var(--text-2); }
.content { flex: 1; min-height: 0; overflow: hidden; padding-top: 8mm; }
.page-foot { display: flex; justify-content: space-between; margin-top: 4mm; padding-top: 4mm; border-top: 1px solid var(--line); color: var(--text-2); }
.block + .block { margin-top: 5mm; }
.block.tight + .block.tight { margin-top: 0; }
h2 { font-size: 25px; font-weight: 600; letter-spacing: -0.025em; line-height: 1.2; }
h2 small { color: var(--text-2); font-size: 14px; font-weight: 500; letter-spacing: 0; }
h3 { font-size: 16.5px; font-weight: 600; letter-spacing: -0.01em; line-height: 1.3; }
.sub { font-size: 19px; letter-spacing: -0.02em; }
.lead { max-width: 165mm; margin-top: 3mm; font-size: 16px; line-height: 1.5; }
.pill { display: inline-flex; flex-shrink: 0; align-items: center; gap: 2mm; padding: 1.1mm 3.4mm 1.1mm 2.8mm; border: 1px solid var(--line); border-radius: 99px; background: var(--page); font-weight: 600; white-space: nowrap; }
.dot { display: inline-block; flex-shrink: 0; width: 2.6mm; height: 2.6mm; border-radius: 50%; }
.dot.critical { background: var(--critical); } .dot.important { background: var(--important); }
.dot.minor { background: var(--minor); } .dot.good { background: var(--good); }
.ring { position: relative; display: grid; place-items: center; }
.ring svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.ring circle { fill: none; stroke-width: 4; }
.ring .track { stroke: var(--line); }
.ring .arc { stroke: var(--accent); stroke-linecap: round; }
.ring span { position: relative; font-weight: 600; letter-spacing: -0.03em; }
.ring-xl { width: 46mm; height: 46mm; } .ring-xl span { font-size: 50px; }
.ring-md { width: 18mm; height: 18mm; } .ring-md span { font-size: 21px; }
.ring-sm { width: 21mm; height: 21mm; } .ring-sm span { font-size: 22px; }
.cover .logo { margin-top: 1mm; }
.cover-title { margin-top: 30mm; }
.eyebrow { color: var(--text-2); font-size: 17px; }
.cover h1 { margin-top: 2.5mm; font-size: 46px; font-weight: 600; letter-spacing: -0.035em; line-height: 1.05; overflow-wrap: anywhere; }
.meta { display: flex; flex-wrap: wrap; margin-top: 5mm; color: var(--text-2); font-size: 14.5px; }
.meta span + span { margin-left: 5mm; padding-left: 5mm; border-left: 1px solid var(--line); }
.overall { display: grid; grid-template-columns: 50mm 1fr; align-items: center; gap: 8mm; margin-top: 17mm; padding: 8mm; border-radius: 9mm; background: var(--surface); }
.overall .ring { justify-self: center; }
.sentence { margin-top: 1.5mm; font-size: 20px; font-weight: 500; letter-spacing: -0.01em; line-height: 1.4; }
.rings { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4mm; margin-top: 4mm; }
.ring-card { display: grid; justify-items: center; gap: 3.5mm; padding: 6mm 2mm 5mm; border: 1px solid var(--line); border-radius: 7mm; }
.ring-card p { font-weight: 600; font-size: 14.5px; }
.how { max-width: 165mm; margin-top: auto; font-size: 14.5px; }
.cover .page-foot { margin-top: 9mm; }
.counts { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4mm; margin-top: 7mm; }
.count { display: grid; justify-items: start; gap: 3mm; padding: 4.5mm; border: 1px solid var(--line); border-radius: 7mm; }
.count b { font-size: 28px; font-weight: 600; line-height: 1; }
.top-item { display: grid; grid-template-columns: 9mm minmax(0, 1fr) auto; align-items: start; gap: 4mm; padding: 3.4mm 0; border-bottom: 1px solid var(--line); }
.top-item .n { display: grid; place-items: center; width: 8.5mm; height: 8.5mm; border-radius: 50%; background: var(--accent-soft); color: var(--accent); font-weight: 600; }
.top-item h4 { font-size: 16px; font-weight: 600; letter-spacing: -0.01em; }
.top-item p { margin-top: 0.8mm; }
.works { padding: 6.5mm 7mm; border-radius: 7mm; background: var(--surface); }
.works ul { columns: 2; column-gap: 9mm; margin-top: 3mm; list-style: none; }
.works li { display: flex; gap: 2.6mm; padding: 1mm 0; break-inside: avoid; }
.works li::before { content: ""; flex-shrink: 0; width: 2.6mm; height: 2.6mm; margin-top: 0.5em; border-radius: 50%; background: var(--good); }
.cat-head { display: grid; grid-template-columns: 18mm minmax(0, 1fr); align-items: center; gap: 6mm; }
.cat-head.no-ring { grid-template-columns: minmax(0, 1fr); }
.cat-head p { margin-top: 1mm; color: var(--text-2); font-size: 14px; }
.metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; margin-top: 6mm; }
.metric { padding: 4mm 4.5mm; border: 1px solid var(--line); border-radius: 6mm; }
.metric .k { display: flex; align-items: center; gap: 2mm; font-weight: 600; white-space: nowrap; }
.metric .v { margin: 2mm 0 1mm; font-size: 26px; font-weight: 600; letter-spacing: -0.02em; }
.gap { height: 6mm; }
.none { margin-top: 5mm; }
.card { padding: 6mm 7mm; border-radius: 7mm; }
.card.full { background: var(--surface); }
.card.short { border: 1px solid var(--line); background: var(--page); }
.card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 5mm; }
.card .label { margin-bottom: 1.2mm; color: var(--text-2); font-weight: 600; }
.cols { display: grid; grid-template-columns: 1fr 1fr; gap: 7mm; margin-top: 4.5mm; }
.fix { margin-top: 4.5mm; }
.fix ul { list-style: none; }
.fix li { position: relative; margin-top: 1.4mm; padding-left: 5mm; }
.fix li::before { content: ""; position: absolute; top: 0.6em; left: 0.6mm; width: 1.6mm; height: 1.6mm; border-radius: 50%; background: var(--accent); }
.card-foot { display: grid; grid-template-columns: auto auto minmax(0, 1fr); gap: 9mm; margin-top: 5mm; padding-top: 4mm; border-top: 1px solid var(--line); }
.card-foot .k { color: var(--text-2); }
.card-foot .v { font-weight: 600; overflow-wrap: anywhere; }
.short .text { margin-top: 3mm; font-size: 14.5px; }
.short .muted { margin-top: 2mm; }
.row { display: grid; grid-template-columns: 50mm 22mm minmax(0, 1fr) 36mm; gap: 4mm; padding: 3.2mm 0; border-bottom: 1px solid var(--line); }
.row.head { padding-top: 5mm; color: var(--text-2); font-weight: 600; }
.row .id { font-family: var(--mono); font-size: 13.4px; overflow-wrap: anywhere; }
.row .details, .row span:last-child { overflow-wrap: anywhere; }
.box { padding: 6mm 7mm; border-radius: 7mm; background: var(--surface); }
.box p { margin-top: 2mm; font-size: 14.5px; }
.help { margin-top: 10mm; padding-top: 4mm; border-top: 1px solid var(--line); color: var(--text-2); font-size: 13.4px; }
.help b { color: var(--text); font-weight: 600; }
.help a { color: var(--accent); font-weight: 600; text-decoration: none; }
`;
}

// Lays the blocks out on A4 pages in the browser, so the PDF, a browser print and the online
// preview all paginate the same way. A block that does not fit moves to the next page whole,
// except a long list (data-split), which continues there. It measures the layout, so the
// document must be rendered, not inside an element with display: none.
const PAGINATE = `
(async () => {
  await document.fonts.ready;
  const flow = document.getElementById('flow');
  const pages = document.getElementById('pages');
  const template = document.getElementById('page-template');
  let content = null;
  let head = null;
  let carried = 0;
  const newPage = (block) => {
    const page = template.content.firstElementChild.cloneNode(true);
    pages.appendChild(page);
    content = page.querySelector('.content');
    carried = 0;
    // Table rows that continue on a new page get the column names again
    if (block.hasAttribute('data-row') && head) {
      content.appendChild(head.cloneNode(true));
      carried = 1;
    }
  };
  const fits = () => content.scrollHeight <= content.clientHeight + 1;
  const used = () => {
    const last = content.lastElementChild;
    return last ? last.getBoundingClientRect().bottom - content.getBoundingClientRect().top : 0;
  };
  // Keeps on this page as many list items as fit and returns the rest in a copy of the block without
  // its heading; null when too few items fit, and the block then moves whole
  const splitOff = (block) => {
    const list = block.querySelector('ul');
    const items = [...list.children];
    const tail = block.cloneNode(true);
    tail.querySelectorAll('h2, h3').forEach((heading) => heading.remove());
    const rest = tail.querySelector('ul');
    rest.replaceChildren();
    while (!fits() && items.length > 3) rest.prepend(items.pop());
    if (fits()) return tail;
    list.append(...rest.children);
    return null;
  };
  const queue = [...flow.children];
  const later = [];
  while (queue.length) {
    const block = queue.shift();
    if (block.hasAttribute('data-head')) head = block.cloneNode(true);
    if (!content || (block.dataset.break === 'before' && content.childElementCount > carried)) newPage(block);
    // A soft break starts a new page only when the current one is already more than half full
    else if (block.dataset.break === 'soft' && used() > content.clientHeight * 0.55) newPage(block);
    content.appendChild(block);
    if (fits()) continue;
    if (block.hasAttribute('data-split')) {
      const tail = splitOff(block);
      if (tail) {
        newPage(tail);
        queue.unshift(tail);
        continue;
      }
    }
    // Alone on its page a block stays even when it is too tall; there is nowhere better for it
    if (content.childElementCount <= carried + 1) continue;
    block.remove();
    // An optional block never opens a page of its own: it tries the end of the report instead
    if (block.hasAttribute('data-optional')) {
      later.push(block);
      continue;
    }
    newPage(block);
    queue.unshift(block);
  }
  for (const block of later) {
    content.appendChild(block);
    if (!fits()) block.remove();
  }
  const all = pages.querySelectorAll('.page');
  all.forEach((page, i) => {
    const num = page.querySelector('.num');
    if (num) num.textContent = num.dataset.label.replace('{page}', i + 1).replace('{total}', all.length);
  });
  window.sitelensReady = true;
})();
`;

/**
 * The report's inline style and script, exactly as renderReport writes them, so a page with a strict
 * Content Security Policy can allow them by hash and show the report in a frame.
 */
export function reportInlineCode(
  assets: ReportAssets,
  theme: ReportTheme = defaultTheme,
): { style: string; script: string } {
  return { style: styles(theme, assets), script: PAGINATE };
}

/** The whole report as one self-contained HTML document (fonts and logo inline), ready to print to A4. */
export function renderReport(m: ReportModel, assets: ReportAssets, theme: ReportTheme = defaultTheme): string {
  const pageLabel = m.t.pageOf('{page}', '{total}');
  return `<!doctype html>
<html lang="${m.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(m.t.headerTitle(m.domain))} – ${esc(theme.brandName)}</title>
<style>${styles(theme, assets)}</style>
</head>
<body>
<main id="pages">${cover(m, assets).replace('<span class="num"></span>', `<span class="num" data-label="${esc(pageLabel)}"></span>`)}</main>
<div id="flow">${flow(m, theme)}</div>
<template id="page-template"><section class="page">
  <header class="page-head"><div class="logo">${assets.logoSvg}</div><span>${esc(m.t.headerTitle(m.domain))}</span></header>
  <div class="content"></div>
  <footer class="page-foot"><span>${esc(m.date)}</span><span class="num" data-label="${esc(pageLabel)}"></span></footer>
</section></template>
<script>${PAGINATE}</script>
</body>
</html>`;
}
