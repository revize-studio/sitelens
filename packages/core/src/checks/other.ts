import { isSameSite, pathOf } from '../url';
import { type Check, examples, finding, homepage, pass, short, withFacts } from './helpers';

const PRIVACY_LINK = /polityk\w*\s+prywatno|prywatno[sś]|privacy|rodo|gdpr|ochrona danych|datenschutz/i;
const CONTACT_LINK = /kontakt|contact/i;

const policyLink: Check = {
  id: 'privacy/policy-link',
  category: 'privacy',
  stage: 'mvp',
  requires: ['rawHtml'],
  run(site) {
    const pages = withFacts(site, 'visible');
    const without = pages
      .filter(
        ({ facts }) =>
          !facts.links.some((link) => PRIVACY_LINK.test(`${link.text} ${link.href}`)) &&
          !facts.buttons.some((text) => PRIVACY_LINK.test(text)),
      )
      .map(({ page }) => page.url);
    if (!without.length) return [pass(site, this)];
    const none = without.length === pages.length;
    return [
      finding(site, this, {
        variant: none ? 'missing' : 'some-pages',
        severity: none ? 'important' : 'minor',
        pages: none ? [] : without,
        evidence: { count: without.length, total: pages.length },
        details: none ? undefined : examples(without.map(pathOf)),
      }),
    ];
  },
};

const contact: Check = {
  id: 'content/contact',
  category: 'content',
  stage: 'mvp',
  requires: ['rawHtml'],
  run(site) {
    const pages = withFacts(site, 'visible');
    const home = homepage(site);
    const homeFacts = pages.find(({ page }) => page === home)?.facts;
    const clickable = pages.some(({ facts }) => facts.telLinks + facts.mailtoLinks > 0);
    const linked = homeFacts?.links.some(
      (l) => CONTACT_LINK.test(`${l.text} ${l.href}`) && isSameSite(l.href, site.site.origin),
    );
    const plain = pages.reduce((sum, { facts }) => sum + facts.plainPhones + facts.plainEmails, 0);
    if (!clickable && !linked && !plain) return [finding(site, this, { variant: 'missing', severity: 'important' })];
    if (!clickable && plain)
      return [
        finding(site, this, {
          variant: 'not-clickable',
          severity: 'minor',
          pages: pages.filter(({ facts }) => facts.plainPhones + facts.plainEmails > 0).map(({ page }) => page.url),
          evidence: { count: plain },
        }),
      ];
    return [pass(site, this)];
  },
};

const brokenMedia: Check = {
  id: 'content/broken-media',
  category: 'content',
  stage: 'mvp',
  requires: ['network'],
  run(site) {
    const broken = site.pages.flatMap((page) =>
      (page.rendered?.network ?? [])
        // Chromium aborts requests it no longer needs (parts of a video, replaced images); those files work
        .filter(
          (r) =>
            (r.type === 'image' || r.type === 'media') &&
            (r.status >= 400 || (r.failed && r.failed !== 'net::ERR_ABORTED')),
        )
        .map((r) => ({ page, url: r.url, status: r.failed ?? String(r.status) })),
    );
    if (!broken.length) return [pass(site, this)];
    const urls = [...new Set(broken.map((b) => b.url))];
    return [
      finding(site, this, {
        severity: 'important',
        pages: [...new Set(broken.map((b) => b.page.url))],
        evidence: { count: urls.length },
        details: examples(broken.map((b) => `${short(b.url, site.site.origin)} → ${b.status}`)),
      }),
    ];
  },
};

export const otherChecks: Check[] = [policyLink, contact, brokenMedia];
