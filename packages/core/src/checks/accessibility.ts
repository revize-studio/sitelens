import type { AxeViolation, Finding, Severity, SiteSnapshot } from '../model';
import { pathOf } from '../url';
import { type Check, examples, finding, htmlPages, pass, siteWide, withFacts } from './helpers';

// axe-core rules grouped into problems a site owner recognises. Language and zoom are read from
// the HTML instead, so they also work online, where axe does not run.
const GROUPS: Record<string, string[]> = {
  'a11y/contrast': ['color-contrast'],
  'a11y/forms': ['label', 'select-name', 'form-field-multiple-labels', 'autocomplete-valid'],
  'a11y/images': ['image-alt', 'input-image-alt', 'role-img-alt', 'svg-img-alt', 'area-alt', 'object-alt'],
  'a11y/names': [
    'link-name',
    'button-name',
    'input-button-name',
    'aria-command-name',
    'aria-input-field-name',
    'aria-toggle-field-name',
    'aria-meter-name',
    'aria-progressbar-name',
    'aria-tooltip-name',
    'frame-title',
    'summary-name',
  ],
  // Only WCAG-tagged rules run (collect-node AXE_OPTIONS); headings are an SEO check
  'a11y/structure': [
    'bypass',
    'list',
    'listitem',
    'definition-list',
    'dlitem',
    'td-headers-attr',
    'th-has-data-cells',
    'duplicate-id-aria',
    'nested-interactive',
    'scrollable-region-focusable',
  ],
};
// seo/title already reports a page without a title
const SEO_RULES = ['document-title'];
const HTML_RULES = [
  'html-has-lang',
  'html-lang-valid',
  'valid-lang',
  'html-xml-lang-mismatch',
  'meta-viewport',
  'meta-viewport-large',
];

const impactSeverity: Record<AxeViolation['impact'], Severity> = {
  critical: 'critical',
  serious: 'important',
  moderate: 'minor',
  minor: 'minor',
};
const order: Severity[] = ['critical', 'important', 'minor'];

function violations(site: SiteSnapshot) {
  return site.pages.flatMap((page) => (page.rendered?.axe?.violations ?? []).map((violation) => ({ page, violation })));
}

function axeGroup(id: string, rules: string[] | null): Check {
  return {
    id,
    category: 'accessibility',
    stage: 'mvp',
    requires: ['axe'],
    run(site) {
      const grouped = new Set(Object.values(GROUPS).flat().concat(HTML_RULES, SEO_RULES));
      const hits = violations(site).filter(({ violation }) =>
        rules ? rules.includes(violation.id) : !grouped.has(violation.id),
      );
      if (!hits.length) {
        // A page with no form (or image, or button) has nothing to praise in the "works well" list
        const checked =
          !rules || site.pages.some((page) => page.rendered?.axe?.passes.some((id) => rules.includes(id)));
        return checked ? [pass(site, this)] : [];
      }
      const severity =
        order.find((s) => hits.some(({ violation }) => impactSeverity[violation.impact] === s)) ?? 'minor';
      const elements = hits.reduce((sum, { violation }) => sum + (violation.count ?? violation.nodes.length), 0);
      const nodes = hits.flatMap(({ page, violation }) => violation.nodes.map((node) => ({ page, node })));
      const lowest = nodes
        .filter(({ node }) => node.contrast)
        .sort((a, b) => a.node.contrast!.ratio - b.node.contrast!.ratio)[0];
      const contrast = lowest?.node.contrast
        ? `${lowest.node.contrast.ratio.toFixed(2)}:1 (${lowest.node.contrast.fg} / ${lowest.node.contrast.bg}) < ${lowest.node.contrast.expected}:1, ${pathOf(lowest.page.url)} ${lowest.node.target}; `
        : '';
      return [
        finding(site, this, {
          severity,
          pages: [...new Set(hits.map(({ page }) => page.url))],
          evidence: { count: elements, rules: [...new Set(hits.map(({ violation }) => violation.id))].join(', ') },
          details:
            contrast +
            examples(
              nodes.map(({ page, node }) => `${pathOf(page.url)} ${node.target}`),
              3,
            ),
        }),
      ];
    },
  };
}

const language: Check = {
  id: 'a11y/language',
  category: 'accessibility',
  stage: 'mvp',
  requires: ['rawHtml'],
  run(site) {
    const pages = withFacts(site);
    const missing = pages.filter(({ facts }) => !facts.lang).map(({ page }) => page.url);
    const invalid = pages.filter(({ facts }) => facts.lang && !/^[a-z]{2,3}(-[a-z0-9]{2,8})*$/i.test(facts.lang));
    const out: Finding[] = [];
    if (missing.length)
      out.push(finding(site, this, { variant: 'missing', severity: 'important', pages: siteWide(site, missing) }));
    if (invalid.length)
      out.push(
        finding(site, this, {
          variant: 'invalid',
          severity: 'important',
          pages: invalid.map(({ page }) => page.url),
          details: examples(invalid.map(({ facts }) => `lang="${facts.lang}"`)),
        }),
      );
    return out.length ? out : [pass(site, this)];
  },
};

const zoom: Check = {
  id: 'a11y/zoom',
  category: 'accessibility',
  stage: 'mvp',
  requires: ['rawHtml'],
  run(site) {
    const locked = withFacts(site).filter(({ facts }) => {
      const viewport = (facts.viewport ?? '').toLowerCase();
      const scale = /maximum-scale\s*=\s*([\d.]+)/.exec(viewport);
      return /user-scalable\s*=\s*(no|0)/.test(viewport) || (scale !== null && Number(scale[1]) < 2);
    });
    if (!locked.length) return [pass(site, this)];
    return [
      finding(site, this, {
        severity: 'important',
        pages: siteWide(
          site,
          locked.map(({ page }) => page.url),
        ),
        details: locked[0]!.facts.viewport ?? '',
      }),
    ];
  },
};

const viewport: Check = {
  id: 'mobile/viewport',
  category: 'accessibility',
  stage: 'mvp',
  requires: ['rawHtml'],
  run(site) {
    // Like Lighthouse: the tag has to set width or initial-scale, or the phone shows the desktop layout
    const missing = withFacts(site)
      .filter(({ facts }) => !/(width|initial-scale)\s*=/i.test(facts.viewport ?? ''))
      .map(({ page }) => page.url);
    if (!missing.length) return [pass(site, this)];
    return [
      finding(site, this, {
        severity: 'critical',
        pages: siteWide(site, missing),
        evidence: { count: missing.length, total: htmlPages(site).length },
      }),
    ];
  },
};

export const accessibilityChecks: Check[] = [
  axeGroup('a11y/contrast', GROUPS['a11y/contrast']!),
  axeGroup('a11y/forms', GROUPS['a11y/forms']!),
  axeGroup('a11y/images', GROUPS['a11y/images']!),
  axeGroup('a11y/names', GROUPS['a11y/names']!),
  axeGroup('a11y/structure', GROUPS['a11y/structure']!),
  axeGroup('a11y/other', null),
  language,
  zoom,
  viewport,
];
